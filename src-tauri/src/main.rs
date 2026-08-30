mod agent_settings;
mod runtime_channel;

use agent_settings::{list_pi_models, load_agent_settings, save_agent_settings};
use runtime_channel::{RuntimeChannelDiagnostic, RuntimeChannelProfile};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::{SecondsFormat, Utc};
use image::{ImageFormat, ImageReader};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs,
    io::{BufRead, BufReader, Cursor, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};

const PI_PROCESS_EVENT: &str = "nautilus-pi-process";
const JOURNEY_PROVISIONING_EVENT: &str = "nautilus-journey-provisioning";
const JOURNEY_RESTART_EVENT: &str = "nautilus-journey-restart";
const JOURNEY_REGISTRY_FILE: &str = "journey-registry.json";
const MIRROR_APPEND_OUTBOX_FILE: &str = "mirror-append-outbox.json";
const MIRROR_APPEND_MAX_ITEMS: usize = 32;
const MIRROR_APPEND_MAX_FILE_BYTES: usize = 4 * 1024 * 1024;
const MIRROR_APPEND_MAX_ITEM_BYTES: usize = 131_072;
const JOURNEY_PREFERENCES_FILE: &str = "journey-preferences.json";
const COMPOSER_DRAFTS_FILE: &str = "composer-drafts.json";
const COMPOSER_DRAFTS_MAX_BYTES: usize = 1024 * 1024;
const COMPOSER_DRAFT_MAX_CHARS: usize = 51_200;
const COMPOSER_DRAFT_MAX_JOURNEYS: usize = 256;

#[derive(Default)]
struct PiProcessState {
    child: Arc<Mutex<Option<Child>>>,
    cancelling: Arc<Mutex<bool>>,
    authority: Arc<Mutex<Option<PiProcessEventAuthority>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JourneyProvisioningEvent {
    journey_id: String,
    phase: String,
}

fn emit_journey_lifecycle(app: &AppHandle, event: &str, journey_id: &str, phase: &str) {
    let _ = app.emit(event, JourneyProvisioningEvent {
        journey_id: journey_id.to_string(),
        phase: phase.to_string(),
    });
}

fn emit_journey_provisioning(app: &AppHandle, journey_id: &str, phase: &str) {
    emit_journey_lifecycle(app, JOURNEY_PROVISIONING_EVENT, journey_id, phase);
}

fn emit_journey_restart(app: &AppHandle, journey_id: &str, phase: &str) {
    emit_journey_lifecycle(app, JOURNEY_RESTART_EVENT, journey_id, phase);
}

#[derive(Default)]
struct JourneyProvisioningState {
    active: Arc<Mutex<HashSet<String>>>,
}

#[derive(Default)]
struct MirrorAppendOutboxState {
    lock: Mutex<()>,
}

struct JourneyProvisioningLease {
    active: Arc<Mutex<HashSet<String>>>,
    journey_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LegacyParityRetirementSummary {
    retired: u64,
    retained: u64,
    already_retired: u64,
}

impl Drop for JourneyProvisioningLease {
    fn drop(&mut self) {
        if let Ok(mut active) = self.active.lock() {
            active.remove(&self.journey_id);
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
struct PiProcessEvent {
    kind: PiProcessEventKind,
    content: String,
    authority: PiProcessEventAuthority,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct PiSessionContextSnapshot {
    tokens: u64,
    provider_model: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PiSessionContextInspection {
    status: String,
    snapshot: Option<PiSessionContextSnapshot>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
enum PiProcessEventKind {
    Started,
    Stdout,
    Stderr,
    Error,
    Cancelled,
    Done,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderConfig {
    command: String,
    args: Vec<String>,
    use_stdin: bool,
    safe_test_mode: bool,
    invocation_mode: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TurnCorrelation {
    schema_version: String,
    journey_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    thread_id: Option<String>,
    harness_conversation_id: String,
    pi_session_id: String,
    generation: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    activation_receipt_activated_at: Option<String>,
    turn_id: String,
    run_id: String,
    harness_user_message_id: String,
    harness_assistant_message_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    mirror_conversation_id: Option<String>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunAuthority {
    schema_version: String,
    correlation: TurnCorrelation,
    journey_id: String,
    run_id: String,
    turn_id: String,
    thread_id: String,
    harness_conversation_id: String,
    generation: u64,
    pi_session_id: String,
    pi_session_file: String,
    mirror_conversation_id: String,
    activation_receipt_activated_at: String,
    harness_user_message_id: String,
    harness_assistant_message_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PiProcessEventAuthority {
    schema_version: String,
    journey_id: String,
    run_id: String,
    turn_id: String,
    thread_id: String,
    generation: u64,
    pi_session_id: String,
    mirror_conversation_id: String,
    harness_user_message_id: String,
    harness_assistant_message_id: String,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct DedicatedPiTranscriptTurn {
    user_entry_id: String,
    assistant_entry_id: String,
    user_text: String,
    assistant_text: String,
    entry_count: usize,
    started_at: String,
    committed_at: String,
}

#[derive(Clone, Debug)]
struct PiBranchEntry {
    id: String,
    parent_id: Option<String>,
    role: Option<String>,
    text: String,
    stop_reason: Option<String>,
    timestamp: String,
}

#[tauri::command]
fn save_journey_thread(app: AppHandle, journey_id: String, payload: String) -> Result<(), String> {
    let path = journey_thread_path(&app, &journey_id)?;
    let value: Value = serde_json::from_str(&payload)
        .map_err(|error| format!("Could not parse Journey thread: {}", error))?;
    if value.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || value.get("thread").and_then(|thread| thread.get("journeyId")).and_then(Value::as_str) != Some(journey_id.as_str())
    {
        return Err("Journey thread authority does not match the requested Journey.".to_string());
    }
    validate_thread_runtime_channel(value.get("thread").unwrap_or(&Value::Null))?;
    let parent = path.parent().ok_or_else(|| "Journey thread path has no parent.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create Journey thread directory: {}", error))?;
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    let staged = path.with_extension(format!("json.{}.tmp", nonce));
    fs::write(&staged, payload).map_err(|error| format!("Could not stage Journey thread: {}", error))?;
    if let Err(error) = fs::rename(&staged, &path) {
        let _ = fs::remove_file(&staged);
        return Err(format!("Could not activate Journey thread: {}", error));
    }
    Ok(())
}

#[tauri::command]
fn load_journey_thread(app: AppHandle, journey_id: String) -> Result<Option<String>, String> {
    let path = journey_thread_path(&app, &journey_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let payload = fs::read_to_string(path)
        .map_err(|error| format!("Could not load Journey thread: {}", error))?;
    let value: Value = serde_json::from_str(&payload)
        .map_err(|error| format!("Could not parse Journey thread: {}", error))?;
    if value.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || value.get("thread").and_then(|thread| thread.get("journeyId")).and_then(Value::as_str) != Some(journey_id.as_str())
    {
        return Err("Stored Journey thread authority is invalid.".to_string());
    }
    validate_thread_runtime_channel(value.get("thread").unwrap_or(&Value::Null))?;
    Ok(Some(payload))
}

fn validate_thread_runtime_channel(thread: &Value) -> Result<(), String> {
    let active = active_runtime_channel()?.channel.as_str();
    match thread.get("runtimeChannel").and_then(Value::as_str) {
        Some(stored) if stored == active => Ok(()),
        None if active == "user" => Ok(()),
        _ => Err("Stored Journey thread belongs to another Nautilus runtime channel.".to_string()),
    }
}

fn dedicated_native_names(journey_name: &str, generation: u64) -> (String, String) {
    let readable = journey_name.split_whitespace().collect::<Vec<_>>().join(" ");
    let readable = if readable.is_empty() { "Journey" } else { readable.as_str() };
    let suffix = format!(" · Nautilus · Generation {}", generation);
    let bounded = |limit: usize| {
        let available = limit.saturating_sub(suffix.chars().count()).max(1);
        let prefix = readable.chars().take(available).collect::<String>();
        format!("{}{}", prefix.trim(), suffix)
    };
    (bounded(80), bounded(100))
}

fn parse_pi_session_state(stdout: &[u8]) -> Result<(String, String), String> {
    for line in String::from_utf8_lossy(stdout).lines().rev() {
        let Ok(value) = serde_json::from_str::<Value>(line) else { continue };
        if value.get("command").and_then(Value::as_str) != Some("get_state")
            || value.get("success").and_then(Value::as_bool) != Some(true) { continue; }
        let data = value.get("data").ok_or_else(|| "Pi state response has no data.".to_string())?;
        let id = data.get("sessionId").and_then(Value::as_str).filter(|value| !value.is_empty())
            .ok_or_else(|| "Pi state response has no session id.".to_string())?;
        let file = data.get("sessionFile").and_then(Value::as_str).filter(|value| !value.is_empty())
            .ok_or_else(|| "Pi state response has no session file.".to_string())?;
        return Ok((id.to_string(), file.to_string()));
    }
    Err("Pi did not return native session authority.".to_string())
}

fn provision_pi_session(requested_id: &str, session_name: &str, session_dir: &Path) -> Result<(String, String), String> {
    let mirror_root = mirror_runtime_root()?;
    fs::create_dir_all(session_dir).map_err(|error| format!("Could not create Pi session directory: {}", error))?;
    let mut command = mirror_runtime_command("pi")?;
    let mut child = command
        .args(["--mode", "rpc", "--offline", "--session-id", &requested_id, "--session-dir"])
        .arg(session_dir)
        .args([
            "--name", session_name, "--no-tools", "--no-extensions", "--no-skills",
            "--no-prompt-templates", "--no-context-files", "--approve",
        ])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
        .spawn().map_err(|error| format!("Could not start native Pi session provisioning: {}", error))?;
    child.stdin.as_mut().ok_or_else(|| "Pi provisioning stdin is unavailable.".to_string())?
        .write_all(b"{\"type\":\"get_state\"}\n")
        .map_err(|error| format!("Could not inspect native Pi session: {}", error))?;
    drop(child.stdin.take());
    let output = child.wait_with_output().map_err(|error| format!("Could not settle native Pi session provisioning: {}", error))?;
    if !output.status.success() {
        return Err(format!("Native Pi session provisioning failed: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }
    let (session_id, session_file) = parse_pi_session_state(&output.stdout)?;
    materialize_empty_pi_session(&session_id, &session_file, session_dir, &mirror_root)?;
    Ok((session_id, session_file))
}

fn materialize_empty_pi_session(
    session_id: &str,
    session_file: &str,
    session_dir: &Path,
    cwd: &Path,
) -> Result<(), String> {
    let path = PathBuf::from(session_file);
    let canonical_dir = session_dir.canonicalize().map_err(|error| error.to_string())?;
    let parent = path.parent().ok_or_else(|| "Pi session file has no parent directory.".to_string())?;
    if parent.canonicalize().map_err(|error| error.to_string())? != canonical_dir {
        return Err("Pi returned a session file outside its dedicated directory.".to_string());
    }
    if path.exists() { return validate_pi_session_header(&path, session_id); }
    let header = serde_json::json!({
        "cwd": cwd.to_string_lossy(),
        "id": session_id,
        "timestamp": Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        "type": "session",
        "version": 3,
    });
    fs::write(&path, format!("{}\n", header)).map_err(|error| format!("Could not preserve empty Pi session authority: {}", error))?;
    validate_pi_session_header(&path, session_id)
}

fn provision_mirror_conversation(session_file: &str, journey_id: &str, title: &str) -> Result<String, String> {
    let script = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent()
        .ok_or_else(|| "Could not resolve Harness project root.".to_string())?
        .join("scripts/provision_mirror_conversation.py");
    let profile = active_runtime_channel()?;
    let mut command = mirror_runtime_command("uv")?;
    let output = command
        .args(["run", "python"]).arg(script)
        .args(["--session-id", session_file, "--journey-id", journey_id, "--title", title, "--mirror-root"])
        .arg(&profile.mirror_root)
        .args(["--mirror-home"]).arg(&profile.mirror_home)
        .output().map_err(|error| format!("Could not provision Mirror conversation: {}", error))?;
    if !output.status.success() {
        return Err(format!("Mirror conversation provisioning failed: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let last_line = stdout.lines().rev().find(|line| !line.trim().is_empty())
        .ok_or_else(|| "Mirror returned no conversation authority.".to_string())?;
    let value: Value = serde_json::from_str(last_line)
        .map_err(|error| format!("Mirror conversation authority was invalid: {}", error))?;
    value.get("conversationId").and_then(Value::as_str).filter(|value| !value.is_empty())
        .map(str::to_string).ok_or_else(|| "Mirror did not return native conversation authority.".to_string())
}

#[tauri::command]
async fn provision_journey_thread(
    app: AppHandle,
    state: State<'_, JourneyProvisioningState>,
    journey_id: String,
    journey_name: String,
) -> Result<Value, String> {
    sanitize_journey_id(&journey_id)?;
    {
        let mut active = state.active.lock().map_err(|_| "Could not inspect active Journey provisioning.".to_string())?;
        if !active.insert(journey_id.clone()) {
            return Err("This Journey is already being started.".to_string());
        }
    }
    let _lease = JourneyProvisioningLease { active: state.active.clone(), journey_id: journey_id.clone() };
    emit_journey_provisioning(&app, &journey_id, "reserving_operation");
    let path = journey_thread_path(&app, &journey_id)?;
    if path.exists() {
        let envelope: Value = serde_json::from_str(&fs::read_to_string(&path)
            .map_err(|error| format!("Could not recover Journey thread: {}", error))?)
            .map_err(|error| format!("Could not parse recovered Journey thread: {}", error))?;
        let thread = envelope.get("thread").ok_or_else(|| "Recovered Journey thread is invalid.".to_string())?;
        validate_thread_runtime_channel(thread)?;
        return Ok(thread.clone());
    }
    let operation_path = journey_thread_operation_path(&app, &journey_id)?;
    let requested_pi_id = if operation_path.exists() {
        let operation: Value = serde_json::from_str(&fs::read_to_string(&operation_path)
            .map_err(|error| format!("Could not recover Journey start operation: {}", error))?)
            .map_err(|error| format!("Could not parse Journey start operation: {}", error))?;
        operation.get("piSessionId").and_then(Value::as_str).filter(|value| !value.is_empty())
            .map(str::to_string).ok_or_else(|| "Recovered Journey start operation is invalid.".to_string())?
    } else {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
        let operation_id = format!("start-{}-g1-{}", journey_id, nonce);
        let bounded_journey = journey_id.chars().take(72).collect::<String>();
        let requested = format!("nautilus-{}-g1-{:x}", bounded_journey, nonce);
        if let Some(parent) = operation_path.parent() {
            fs::create_dir_all(parent).map_err(|error| format!("Could not create Journey operation directory: {}", error))?;
        }
        fs::write(&operation_path, serde_json::to_vec_pretty(&json!({
            "schemaVersion": "1.0.0", "operationId": operation_id, "journeyId": journey_id,
            "threadId": format!("nautilus-thread-{}", journey_id), "generation": 1,
            "piSessionId": requested, "status": "provisioning"
        })).map_err(|error| format!("Could not serialize Journey start operation: {}", error))?)
            .map_err(|error| format!("Could not reserve Journey start operation: {}", error))?;
        requested
    };
    let pi_session_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?
        .join("pi-sessions");
    let journey_id_for_task = journey_id.clone();
    let progress_app = app.clone();
    let (pi_name, mirror_name) = dedicated_native_names(&journey_name, 1);
    emit_journey_provisioning(&app, &journey_id, "creating_pi_session");
    let (pi_session_id, pi_session_file, mirror_conversation_id) = tauri::async_runtime::spawn_blocking(move || {
        let (pi_id, pi_file) = provision_pi_session(&requested_pi_id, &pi_name, &pi_session_dir)?;
        emit_journey_provisioning(&progress_app, &journey_id_for_task, "creating_mirror_conversation");
        let mirror_id = provision_mirror_conversation(&pi_file, &journey_id_for_task, &mirror_name)?;
        emit_journey_provisioning(&progress_app, &journey_id_for_task, "activating_journey_context");
        Ok::<_, String>((pi_id, pi_file, mirror_id))
    }).await.map_err(|error| format!("Journey thread provisioning task failed: {}", error))??;
    emit_journey_provisioning(&app, &journey_id, "verifying_authority");
    let activated_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let runtime_channel = active_runtime_channel()?.channel.as_str();
    let thread_id = format!("nautilus-thread-{}", journey_id);
    let (pi_session_name, mirror_conversation_name) = dedicated_native_names(&journey_name, 1);
    let receipt = json!({
        "schemaVersion": "1.0.0", "journeyId": journey_id, "threadId": thread_id,
        "generation": 1, "piSessionId": pi_session_id, "mirrorConversationId": mirror_conversation_id,
        "mode": "mirror", "commandAuthority": "installed", "runtimeChannel": runtime_channel,
        "activatedAt": activated_at,
    });
    let thread = json!({
        "schemaVersion": "1.0.0", "threadId": thread_id, "journeyId": journey_id,
        "runtimeChannel": runtime_channel, "createdAt": activated_at, "activeGeneration": 1,
        "generations": [{
            "generation": 1, "status": "ready", "piSessionId": pi_session_id,
            "mirrorConversationId": mirror_conversation_id, "piSessionName": pi_session_name,
            "mirrorConversationName": mirror_conversation_name, "piSessionFile": pi_session_file,
            "createdAt": activated_at, "activatedAt": activated_at, "activationReceipt": receipt
        }]
    });
    let envelope = json!({ "schemaVersion": "1.0.0", "thread": thread, "savedAt": activated_at });
    let payload = serde_json::to_string_pretty(&envelope).map_err(|error| format!("Could not serialize Journey thread: {}", error))?;
    let parent = path.parent().ok_or_else(|| "Journey thread path has no parent.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create Journey thread directory: {}", error))?;
    emit_journey_provisioning(&app, &journey_id, "publishing_ready_thread");
    let staged = path.with_extension("json.provisioning.tmp");
    fs::write(&staged, payload).map_err(|error| format!("Could not stage ready Journey thread: {}", error))?;
    fs::rename(&staged, &path).map_err(|error| format!("Could not publish ready Journey thread: {}", error))?;
    let _ = fs::remove_file(operation_path);
    Ok(thread)
}

#[tauri::command]
async fn restart_journey_thread(
    app: AppHandle,
    state: State<'_, JourneyProvisioningState>,
    journey_id: String,
    journey_name: String,
) -> Result<Value, String> {
    sanitize_journey_id(&journey_id)?;
    {
        let mut active = state.active.lock().map_err(|_| "Could not inspect active Journey lifecycle operation.".to_string())?;
        if !active.insert(journey_id.clone()) { return Err("This Journey already has an active lifecycle operation.".to_string()); }
    }
    let _lease = JourneyProvisioningLease { active: state.active.clone(), journey_id: journey_id.clone() };
    emit_journey_restart(&app, &journey_id, "reserving_generation");
    let path = journey_thread_path(&app, &journey_id)?;
    let mut envelope: Value = serde_json::from_str(&fs::read_to_string(&path)
        .map_err(|error| format!("Could not read active Journey thread: {}", error))?)
        .map_err(|error| format!("Could not parse active Journey thread: {}", error))?;
    let thread = envelope.get_mut("thread").ok_or_else(|| "Stored Journey thread envelope is invalid.".to_string())?;
    if thread.get("journeyId").and_then(Value::as_str) != Some(journey_id.as_str()) {
        return Err("Stored Journey thread belongs to another Journey.".to_string());
    }
    validate_thread_runtime_channel(thread)?;
    let prior_generation = thread.get("activeGeneration").and_then(Value::as_u64)
        .ok_or_else(|| "Stored Journey thread has no active generation.".to_string())?;
    let prior = thread.get("generations").and_then(Value::as_array)
        .and_then(|items| items.iter().find(|item| item.get("generation").and_then(Value::as_u64) == Some(prior_generation)))
        .ok_or_else(|| "Stored active generation is missing.".to_string())?;
    if prior.get("status").and_then(Value::as_str) != Some("ready") {
        return Err("Only a ready active generation can be restarted.".to_string());
    }
    let next_generation = prior_generation + 1;
    let operation_path = journey_thread_operation_path(&app, &journey_id)?;
    let (operation_id, requested_pi_id) = if operation_path.exists() {
        let operation: Value = serde_json::from_str(&fs::read_to_string(&operation_path)
            .map_err(|error| format!("Could not recover Journey restart operation: {}", error))?)
            .map_err(|error| format!("Could not parse Journey restart operation: {}", error))?;
        let operation_prior = operation.get("priorGeneration").and_then(Value::as_u64);
        let operation_next = operation.get("nextGeneration").and_then(Value::as_u64);
        if operation.get("journeyId").and_then(Value::as_str) == Some(journey_id.as_str())
            && operation_next == Some(prior_generation)
            && operation_prior.and_then(|value| value.checked_add(1)) == operation_next {
            let recovered = thread.clone();
            let _ = fs::remove_file(&operation_path);
            return Ok(recovered);
        }
        if operation.get("journeyId").and_then(Value::as_str) != Some(journey_id.as_str())
            || operation_prior != Some(prior_generation)
            || operation_next != Some(next_generation) {
            return Err("Recovered Journey restart operation is stale.".to_string());
        }
        (
            operation.get("operationId").and_then(Value::as_str).ok_or_else(|| "Restart operation id is missing.".to_string())?.to_string(),
            operation.get("piSessionId").and_then(Value::as_str).ok_or_else(|| "Restart Pi authority is missing.".to_string())?.to_string(),
        )
    } else {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
        let operation_id = format!("restart-{}-g{}-{:x}", journey_id, next_generation, nonce);
        let bounded_journey = journey_id.chars().take(64).collect::<String>();
        let requested_pi_id = format!("nautilus-{}-g{}-{:x}", bounded_journey, next_generation, nonce);
        if let Some(parent) = operation_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        let operation = json!({
            "schemaVersion": "1.0.0", "operationId": operation_id, "status": "reserved",
            "journeyId": journey_id, "threadId": thread.get("threadId").and_then(Value::as_str),
            "priorGeneration": prior_generation, "nextGeneration": next_generation, "piSessionId": requested_pi_id
        });
        fs::write(&operation_path, serde_json::to_vec_pretty(&operation).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Could not reserve Journey restart: {}", error))?;
        (operation_id, requested_pi_id)
    };
    let pi_session_dir = app.path().app_data_dir().map_err(|error| error.to_string())?.join("pi-sessions");
    let (pi_name, mirror_name) = dedicated_native_names(&journey_name, next_generation);
    let task_journey = journey_id.clone();
    let progress_app = app.clone();
    emit_journey_restart(&app, &journey_id, "creating_pi_session");
    let reserved_pi_id = requested_pi_id.clone();
    let (pi_session_id, pi_session_file, mirror_conversation_id) = tauri::async_runtime::spawn_blocking(move || {
        let (pi_id, pi_file) = provision_pi_session(&reserved_pi_id, &pi_name, &pi_session_dir)?;
        emit_journey_restart(&progress_app, &task_journey, "creating_mirror_conversation");
        let mirror_id = provision_mirror_conversation(&pi_file, &task_journey, &mirror_name)?;
        emit_journey_restart(&progress_app, &task_journey, "activating_journey_context");
        Ok::<_, String>((pi_id, pi_file, mirror_id))
    }).await.map_err(|error| format!("Journey restart task failed: {}", error))??;
    emit_journey_restart(&app, &journey_id, "verifying_replacement");
    if pi_session_id != requested_pi_id { return Err("Pi restart authority diverged from its reservation.".to_string()); }
    let activated_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let runtime_channel = active_runtime_channel()?.channel.as_str();
    let thread_id = thread.get("threadId").and_then(Value::as_str).ok_or_else(|| "Thread id is missing.".to_string())?.to_string();
    let (pi_session_name, mirror_conversation_name) = dedicated_native_names(&journey_name, next_generation);
    let receipt = json!({
        "schemaVersion": "1.0.0", "journeyId": journey_id, "threadId": thread_id,
        "generation": next_generation, "piSessionId": pi_session_id, "mirrorConversationId": mirror_conversation_id,
        "mode": "mirror", "commandAuthority": "installed", "runtimeChannel": runtime_channel,
        "activatedAt": activated_at
    });
    let replacement = json!({
        "generation": next_generation, "status": "ready", "piSessionId": pi_session_id,
        "piSessionFile": pi_session_file, "mirrorConversationId": mirror_conversation_id,
        "piSessionName": pi_session_name, "mirrorConversationName": mirror_conversation_name,
        "createdAt": activated_at, "activatedAt": activated_at, "activationReceipt": receipt
    });
    let generations = thread.get_mut("generations").and_then(Value::as_array_mut)
        .ok_or_else(|| "Stored Journey generations are invalid.".to_string())?;
    let prior_mut = generations.iter_mut().find(|item| item.get("generation").and_then(Value::as_u64) == Some(prior_generation))
        .ok_or_else(|| "Stored active generation disappeared.".to_string())?;
    prior_mut["status"] = Value::String("inactive".to_string());
    prior_mut["closedAt"] = Value::String(activated_at.clone());
    generations.push(replacement);
    thread["activeGeneration"] = Value::Number(next_generation.into());
    thread["runtimeChannel"] = Value::String(runtime_channel.to_string());
    envelope["savedAt"] = Value::String(activated_at);
    emit_journey_restart(&app, &journey_id, "switching_generation");
    let staged = path.with_extension(format!("json.{}.tmp", operation_id));
    fs::write(&staged, serde_json::to_vec_pretty(&envelope).map_err(|error| error.to_string())?)
        .map_err(|error| format!("Could not stage restarted Journey thread: {}", error))?;
    if let Err(error) = fs::rename(&staged, &path) {
        let _ = fs::remove_file(&staged);
        return Err(format!("Could not publish restarted Journey thread: {}", error));
    }
    let _ = fs::remove_file(operation_path);
    Ok(envelope.get("thread").cloned().ok_or_else(|| "Restarted thread is missing.".to_string())?)
}

fn validate_journey_registry_payload(payload: &str) -> Result<Value, String> {
    if payload.len() > 2 * 1024 * 1024 {
        return Err("Refreshed Journey registry is oversized.".to_string());
    }
    let value: Value = serde_json::from_str(payload)
        .map_err(|_| "Refreshed Journey registry is invalid JSON.".to_string())?;
    let schema_version = value.get("schemaVersion").and_then(Value::as_str);
    if !matches!(schema_version, Some("0.1.0") | Some("0.2.0"))
        || (schema_version == Some("0.2.0") && value.get("sourceVersion").and_then(Value::as_str).map(str::len) != Some(64))
        || value.get("source").and_then(Value::as_str) != Some("mirror")
        || value.get("syncedAt").and_then(Value::as_str).map(str::is_empty) != Some(false)
    {
        return Err("Refreshed Journey registry authority is invalid.".to_string());
    }
    let roots = value.get("roots").and_then(Value::as_array)
        .ok_or_else(|| "Refreshed Journey registry roots are invalid.".to_string())?;
    let mut ids = HashSet::new();
    let mut count = 0usize;
    fn validate_nodes(nodes: &[Value], depth: usize, count: &mut usize, ids: &mut HashSet<String>) -> Result<(), String> {
        if depth > 16 { return Err("Refreshed Journey registry is too deep.".to_string()); }
        for node in nodes {
            *count += 1;
            if *count > 10_000 { return Err("Refreshed Journey registry has too many entries.".to_string()); }
            let id = node.get("id").and_then(Value::as_str).filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "Refreshed Journey registry contains an invalid id.".to_string())?;
            if !ids.insert(id.to_string()) { return Err("Refreshed Journey registry contains duplicate ids.".to_string()); }
            node.get("name").and_then(Value::as_str).filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "Refreshed Journey registry contains an invalid name.".to_string())?;
            if let Some(children) = node.get("children") {
                validate_nodes(children.as_array().ok_or_else(|| "Refreshed Journey children are invalid.".to_string())?, depth + 1, count, ids)?;
            }
        }
        Ok(())
    }
    validate_nodes(roots, 0, &mut count, &mut ids)?;
    Ok(value)
}

fn publish_refreshed_journey_registry(app_data_dir: &Path, payload: &str) -> Result<String, String> {
    validate_journey_registry_payload(payload)?;
    fs::create_dir_all(app_data_dir).map_err(|error| format!("Could not prepare Journey registry storage: {}", error))?;
    let target = app_data_dir.join(JOURNEY_REGISTRY_FILE);
    if target.exists() {
        let metadata = fs::symlink_metadata(&target).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Journey registry target is not a safe file.".to_string());
        }
    }
    let staged = app_data_dir.join("journey-registry.refresh.tmp");
    if staged.exists() {
        let metadata = fs::symlink_metadata(&staged).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Journey registry staging path is unsafe.".to_string());
        }
        fs::remove_file(&staged).map_err(|error| error.to_string())?;
    }
    fs::write(&staged, payload).map_err(|error| format!("Could not stage Journey registry: {}", error))?;
    fs::rename(&staged, &target).map_err(|error| format!("Could not publish Journey registry: {}", error))?;
    let published = fs::read_to_string(&target).map_err(|error| format!("Could not verify Journey registry: {}", error))?;
    validate_journey_registry_payload(&published)?;
    Ok(published)
}

fn journey_registry_contains_id(value: &Value, journey_id: &str) -> bool {
    fn nodes_contain(nodes: &[Value], journey_id: &str) -> bool {
        nodes.iter().any(|node| {
            node.get("id").and_then(Value::as_str) == Some(journey_id)
                || node.get("children").and_then(Value::as_array)
                    .map(|children| nodes_contain(children, journey_id)).unwrap_or(false)
        })
    }
    value.get("roots").and_then(Value::as_array)
        .map(|roots| nodes_contain(roots, journey_id)).unwrap_or(false)
}

#[tauri::command]
fn refresh_journey_registry(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let staged = app_data_dir.join("journey-registry.export.tmp");
    if staged.exists() {
        let metadata = fs::symlink_metadata(&staged).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Journey registry export path is unsafe.".to_string());
        }
        fs::remove_file(&staged).map_err(|error| error.to_string())?;
    }
    let mut command = mirror_administrative_command("uv")?;
    let output = command
        .args(["run", "python", "-m", "memory", "journey", "export-registry"])
        .output().map_err(|error| format!("Could not start the Journey registry exporter: {}", error))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().chars().take(800).collect::<String>();
        return Err(if detail.is_empty() {
            "Could not refresh Journeys from Mirror.".to_string()
        } else {
            format!("Could not refresh Journeys from Mirror: {detail}")
        });
    }
    let payload = String::from_utf8(output.stdout).map_err(|_| "Journey registry exporter returned invalid text.".to_string())?;
    validate_journey_registry_payload(&payload)?;
    publish_refreshed_journey_registry(&app_data_dir, &payload)
}

#[tauri::command]
fn choose_project_directory() -> Result<Option<String>, String> {
    let selected = rfd::FileDialog::new().set_title("Choose Journey project directory").pick_folder();
    match selected {
        Some(path) => {
            let metadata = fs::symlink_metadata(&path).map_err(|error| format!("Could not inspect selected directory: {}", error))?;
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return Err("Selected project path is not a safe directory.".to_string());
            }
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn mutate_journey_registry(app: AppHandle, active_journey_id: String, request_json: String, replacement_journey_id: Option<String>) -> Result<String, String> {
    let request: Value = serde_json::from_str(&request_json).map_err(|_| "Journey mutation request is malformed.".to_string())?;
    let delete_target = if request.get("operation").and_then(Value::as_str) == Some("delete_journey") {
        let journey_id = request.get("payload").and_then(|payload| payload.get("journeyId")).and_then(Value::as_str)
            .ok_or_else(|| "Journey deletion target is missing.".to_string())?;
        let thread_path = journey_thread_path(&app, journey_id)?;
        let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
        let generation_dir = app_data_dir.join("dedicated-journey-conversations").join(sanitize_journey_id(journey_id)?);
        if thread_path.exists() || generation_dir.exists() {
            return Err("Journey cannot be deleted because dedicated conversation history exists.".to_string());
        }
        Some(journey_id.to_string())
    } else {
        None
    };
    let publication_journey_id = if delete_target.as_deref() == Some(active_journey_id.as_str()) {
        let replacement = replacement_journey_id.as_deref().ok_or_else(|| "Deleting the active Journey requires an explicit replacement Journey.".to_string())?;
        if replacement == active_journey_id || replacement == delete_target.as_deref().unwrap_or_default() {
            return Err("Replacement Journey authority is invalid.".to_string());
        }
        sanitize_journey_id(replacement)?
    } else {
        active_journey_id.clone()
    };
    let mut command = mirror_administrative_command("uv")?;
    let mut child = command
        .args(["run", "python", "-m", "memory", "journey", "mutate"])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
        .spawn().map_err(|error| format!("Could not start canonical Journey mutation: {}", error))?;
    child.stdin.as_mut().ok_or_else(|| "Journey mutation input is unavailable.".to_string())?
        .write_all(request_json.as_bytes()).map_err(|error| format!("Could not submit Journey mutation: {}", error))?;
    let output = child.wait_with_output().map_err(|error| format!("Could not await Journey mutation: {}", error))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let code = stderr.lines().rev().find_map(|line| serde_json::from_str::<Value>(line).ok())
            .and_then(|value| value.get("error").and_then(Value::as_str).map(str::to_string));
        return Err(match code.as_deref() {
            Some("stale_source") => "Journeys changed in Mirror. Reload the tree and try again.".to_string(),
            Some("unknown_journey") => "Journey no longer exists in Mirror.".to_string(),
            Some(value) if value.starts_with("journey_not_empty:") => {
                let classes = value.trim_start_matches("journey_not_empty:").replace('_', " ");
                format!("Journey cannot be deleted because protected records remain: {}.", classes)
            }
            Some("idempotency_conflict") => "Journey mutation retry no longer matches the original request.".to_string(),
            Some("invalid_or_duplicate_slug") => "Journey slug is invalid or already exists.".to_string(),
            Some("invalid_name") => "Journey name is invalid.".to_string(),
            Some("invalid_description") => "Journey description is invalid.".to_string(),
            Some("unknown_parent") => "The selected parent Journey no longer exists.".to_string(),
            Some("invalid_position") => "Journey position is invalid for the selected parent.".to_string(),
            Some("malformed_order") => "Journey ordering metadata in Mirror is invalid.".to_string(),
            Some(value) => format!("Mirror rejected the Journey mutation: {value}."),
            None => {
                let detail = stderr.trim().chars().rev().take(800).collect::<String>().chars().rev().collect::<String>();
                if detail.is_empty() {
                    "Mirror rejected the Journey mutation without diagnostic detail.".to_string()
                } else {
                    format!("Mirror rejected the Journey mutation: {detail}")
                }
            }
        });
    }
    let payload = String::from_utf8(output.stdout).map_err(|_| "Journey mutation returned invalid text.".to_string())?;
    let result: Value = serde_json::from_str(&payload).map_err(|_| "Journey mutation returned malformed JSON.".to_string())?;
    let registry = result.get("registry").ok_or_else(|| "Journey mutation omitted the verified registry.".to_string())?;
    let registry_payload = serde_json::to_string_pretty(registry).map_err(|error| error.to_string())?;
    let validated = validate_journey_registry_payload(&registry_payload)?;
    if !journey_registry_contains_id(&validated, &publication_journey_id) {
        return Err("Mutated registry does not contain the selected Journey authority.".to_string());
    }
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    publish_refreshed_journey_registry(&app_data_dir, &registry_payload)?;
    Ok(payload)
}

#[tauri::command]
fn load_journey_registry(app: AppHandle) -> Result<Option<String>, String> {
    let path = journey_registry_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("Could not load Journey registry: {}", error))
}

#[tauri::command]
fn load_journey_preferences(app: AppHandle) -> Result<Option<String>, String> {
    let path = journey_preferences_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("Could not load Journey preferences: {}", error))
}

#[tauri::command]
fn save_journey_preferences(app: AppHandle, payload: String) -> Result<(), String> {
    let path = journey_preferences_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!("Could not create preferences storage directory: {}", error)
        })?;
    }
    fs::write(path, payload)
        .map_err(|error| format!("Could not save Journey preferences: {}", error))
}

fn validate_composer_drafts_payload(payload: &str) -> Result<Value, String> {
    if payload.len() > COMPOSER_DRAFTS_MAX_BYTES {
        return Err("Composer draft storage exceeds its size limit.".to_string());
    }
    let value: Value = serde_json::from_str(payload)
        .map_err(|_| "Composer draft storage is malformed.".to_string())?;
    let object = value.as_object()
        .filter(|object| object.len() == 3)
        .ok_or_else(|| "Composer draft storage has an invalid shape.".to_string())?;
    if object.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || object.get("savedAt").and_then(Value::as_str).is_none_or(|saved_at| {
            chrono::DateTime::parse_from_rfc3339(saved_at).is_err()
        })
    {
        return Err("Composer draft storage has invalid metadata.".to_string());
    }
    let drafts = object.get("drafts").and_then(Value::as_object)
        .filter(|drafts| drafts.len() <= COMPOSER_DRAFT_MAX_JOURNEYS)
        .ok_or_else(|| "Composer draft storage has invalid entries.".to_string())?;
    for (journey_id, text) in drafts {
        if journey_id.len() > 128
            || sanitize_journey_id(journey_id).is_err()
            || text.as_str().is_none_or(|text| {
                text.is_empty() || text.chars().count() > COMPOSER_DRAFT_MAX_CHARS
            })
        {
            return Err("Composer draft storage has an invalid draft.".to_string());
        }
    }
    Ok(value)
}

#[tauri::command]
fn load_composer_drafts(app: AppHandle) -> Result<Option<String>, String> {
    let path = composer_drafts_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let metadata = fs::symlink_metadata(&path)
        .map_err(|error| format!("Could not inspect Composer draft storage: {}", error))?;
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() as usize > COMPOSER_DRAFTS_MAX_BYTES
    {
        return Err("Composer draft storage is not a bounded regular file.".to_string());
    }
    let payload = fs::read_to_string(path)
        .map_err(|error| format!("Could not load Composer drafts: {}", error))?;
    validate_composer_drafts_payload(&payload)?;
    Ok(Some(payload))
}

#[tauri::command]
fn save_composer_drafts(app: AppHandle, payload: String) -> Result<(), String> {
    validate_composer_drafts_payload(&payload)?;
    let path = composer_drafts_path(&app)?;
    let parent = path.parent()
        .ok_or_else(|| "Composer draft path has no parent.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create Composer draft directory: {}", error))?;
    let staged = path.with_extension("json.tmp");
    fs::write(&staged, payload)
        .map_err(|error| format!("Could not stage Composer drafts: {}", error))?;
    fs::rename(&staged, &path)
        .map_err(|error| format!("Could not publish Composer drafts: {}", error))
}

fn harness_root() -> Result<PathBuf, String> {
    Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Could not resolve Harness root.".to_string())?
        .to_path_buf())
}

fn active_runtime_channel() -> Result<RuntimeChannelProfile, String> {
    RuntimeChannelProfile::active()
}

fn mirror_runtime_root() -> Result<PathBuf, String> {
    Ok(active_runtime_channel()?.mirror_root)
}

fn mirror_runtime_command(program: &str) -> Result<Command, String> {
    active_runtime_channel()?.runtime_command(program)
}

fn mirror_administrative_command(program: &str) -> Result<Command, String> {
    let profile = active_runtime_channel()?;
    let mut command = profile.runtime_command(program)?;
    profile.detach_journey_turn_authority(&mut command);
    Ok(command)
}

#[tauri::command]
fn inspect_runtime_channel(app: AppHandle) -> Result<RuntimeChannelDiagnostic, String> {
    let profile = active_runtime_channel()?;
    let app_data_root = app.path().app_data_dir().map_err(|error| error.to_string())?;
    profile.validate_app_identity(&app.config().identifier, &app_data_root)?;
    Ok(profile.diagnostic(&app_data_root))
}

const DOCUMENT_PREVIEW_MAX_BYTES: u64 = 1024 * 1024;
const FILE_ATTACHMENT_MAX_FILES: usize = 32;
const FILE_ATTACHMENT_THUMBNAIL_EDGE: u32 = 256;
const FILE_ATTACHMENT_THUMBNAIL_SOURCE_MAX_BYTES: u64 = 50 * 1024 * 1024;
const FILE_ATTACHMENT_THUMBNAIL_MAX_PIXELS: u64 = 20_000_000;
const WORKSPACE_TREE_MAX_DEPTH: usize = 16;
const WORKSPACE_TREE_MAX_ENTRIES: usize = 10_000;

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JourneyDocumentationNode {
    relative_path: String,
    name: String,
    kind: String,
    preview_kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    modified_at: Option<u64>,
    children: Vec<JourneyDocumentationNode>,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JourneyDocumentationTree {
    status: String,
    root_label: String,
    items: Vec<JourneyDocumentationNode>,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JourneyDocumentContent {
    status: String,
    relative_path: String,
    preview_kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    modified_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,
}

fn bounded_documentation_root(journey_root: &Path) -> Result<PathBuf, String> {
    let canonical_journey = journey_root
        .canonicalize()
        .map_err(|_| "Could not resolve the selected Journey workspace.".to_string())?;
    if !canonical_journey.is_dir() {
        return Err("The selected Journey workspace is not a directory.".to_string());
    }
    Ok(canonical_journey)
}

fn omitted_workspace_component(name: &str) -> bool {
    name.starts_with('.')
        || matches!(
            name,
            "node_modules"
                | "target"
                | "dist"
                | "build"
                | "venv"
                | "__pycache__"
                | "coverage"
        )
}

fn documentation_modified_at(metadata: &fs::Metadata) -> Option<u64> {
    metadata
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_millis() as u64)
}

fn documentation_preview_kind(path: &Path) -> &'static str {
    match path.extension().and_then(|value| value.to_str()).map(|value| value.to_ascii_lowercase()) {
        Some(extension) if extension == "md" || extension == "markdown" => "markdown",
        Some(extension) if extension == "txt" => "text",
        _ => "unavailable",
    }
}

fn documentation_relative_path(root: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(root)
        .map_err(|_| "Documentation item escaped the allowed root.".to_string())?;
    let value = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/");
    if value.is_empty() {
        return Err("Documentation item has no relative path.".to_string());
    }
    Ok(value)
}

fn collect_documentation_nodes(
    root: &Path,
    directory: &Path,
    depth: usize,
    entry_count: &mut usize,
) -> Result<Vec<JourneyDocumentationNode>, String> {
    if depth > WORKSPACE_TREE_MAX_DEPTH {
        return Err("Journey workspace hierarchy exceeds the bounded depth limit.".to_string());
    }
    let mut nodes = Vec::new();
    let entries = fs::read_dir(directory)
        .map_err(|_| "Could not read the Journey documentation hierarchy.".to_string())?;
    for entry_result in entries {
        let entry = entry_result
            .map_err(|_| "Could not read a Journey documentation entry.".to_string())?;
        *entry_count += 1;
        if *entry_count > WORKSPACE_TREE_MAX_ENTRIES {
            return Err("Journey workspace hierarchy exceeds the bounded entry limit.".to_string());
        }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if omitted_workspace_component(&name) {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|_| "Could not inspect a Journey documentation entry.".to_string())?;
        if file_type.is_symlink() {
            continue;
        }
        let canonical = path
            .canonicalize()
            .map_err(|_| "Could not resolve a Journey documentation entry.".to_string())?;
        if !canonical.starts_with(root) {
            return Err("Documentation item escaped the allowed root.".to_string());
        }
        let metadata = entry
            .metadata()
            .map_err(|_| "Could not inspect Journey documentation metadata.".to_string())?;
        let is_directory = metadata.is_dir();
        if !is_directory && !metadata.is_file() {
            continue;
        }
        nodes.push(JourneyDocumentationNode {
            relative_path: documentation_relative_path(root, &canonical)?,
            name,
            kind: if is_directory { "folder" } else { "file" }.to_string(),
            preview_kind: if is_directory { "unavailable" } else { documentation_preview_kind(&canonical) }.to_string(),
            size_bytes: if is_directory { None } else { Some(metadata.len()) },
            modified_at: documentation_modified_at(&metadata),
            children: if is_directory {
                collect_documentation_nodes(root, &canonical, depth + 1, entry_count)?
            } else {
                Vec::new()
            },
        });
    }
    nodes.sort_by(|left, right| {
        let left_rank = if left.kind == "folder" { 0 } else { 1 };
        let right_rank = if right.kind == "folder" { 0 } else { 1 };
        left_rank
            .cmp(&right_rank)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
            .then_with(|| left.name.cmp(&right.name))
    });
    Ok(nodes)
}

fn list_journey_documentation_at(journey_root: &Path) -> Result<JourneyDocumentationTree, String> {
    let canonical_root = bounded_documentation_root(journey_root)?;
    let mut entry_count = 0;
    let items = collect_documentation_nodes(&canonical_root, &canonical_root, 0, &mut entry_count)?;
    let root_label = canonical_root
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Journey".to_string());
    Ok(JourneyDocumentationTree {
        status: if items.is_empty() { "empty" } else { "ready" }.to_string(),
        root_label,
        items,
    })
}

fn validate_document_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.trim().is_empty() || relative_path.contains('\0') {
        return Err("Document relative path is required.".to_string());
    }
    let portable = relative_path.replace('\\', "/");
    let bytes = portable.as_bytes();
    let windows_prefixed = bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && bytes[2] == b'/';
    if portable.starts_with('/')
        || windows_prefixed
        || portable.split('/').any(|component| component.is_empty() || component == "." || component == "..")
    {
        return Err("Artifact path is outside the visible Journey workspace.".to_string());
    }
    let path = PathBuf::from(relative_path);
    if path.is_absolute()
        || path.components().any(|component| !matches!(component, std::path::Component::Normal(_)))
        || path.components().any(|component| omitted_workspace_component(&component.as_os_str().to_string_lossy()))
    {
        return Err("Artifact path is outside the visible Journey workspace.".to_string());
    }
    Ok(path)
}

fn unavailable_document_content(
    relative_path: &str,
    metadata: &fs::Metadata,
    reason: &str,
) -> JourneyDocumentContent {
    JourneyDocumentContent {
        status: "unavailable".to_string(),
        relative_path: relative_path.to_string(),
        preview_kind: "unavailable".to_string(),
        content: None,
        size_bytes: if metadata.is_file() { Some(metadata.len()) } else { None },
        modified_at: documentation_modified_at(metadata),
        reason: Some(reason.to_string()),
    }
}

fn read_journey_document_at(journey_root: &Path, relative_path: &str) -> Result<JourneyDocumentContent, String> {
    let workspace_root = bounded_documentation_root(journey_root)?;
    let safe_relative = validate_document_relative_path(relative_path)?;
    let candidate = workspace_root.join(&safe_relative);
    let symlink_metadata = fs::symlink_metadata(&candidate)
        .map_err(|_| "Could not resolve the selected Journey document.".to_string())?;
    if symlink_metadata.file_type().is_symlink() {
        return Err("Symbolic-link documents are not available for preview.".to_string());
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|_| "Could not resolve the selected Journey document.".to_string())?;
    if !canonical.starts_with(&workspace_root) {
        return Err("Artifact path is outside the allowed Journey root.".to_string());
    }
    let metadata = canonical
        .metadata()
        .map_err(|_| "Could not inspect the selected Journey document.".to_string())?;
    if metadata.is_dir() {
        return Ok(unavailable_document_content(relative_path, &metadata, "folder"));
    }
    let preview_kind = documentation_preview_kind(&canonical);
    if preview_kind == "unavailable" {
        return Ok(unavailable_document_content(relative_path, &metadata, "unsupported_type"));
    }
    if metadata.len() > DOCUMENT_PREVIEW_MAX_BYTES {
        return Ok(unavailable_document_content(relative_path, &metadata, "oversized"));
    }
    let bytes = fs::read(&canonical)
        .map_err(|_| "Could not read the selected Journey document.".to_string())?;
    let content = match String::from_utf8(bytes) {
        Ok(content) => content,
        Err(_) => return Ok(unavailable_document_content(relative_path, &metadata, "invalid_utf8")),
    };
    Ok(JourneyDocumentContent {
        status: "ready".to_string(),
        relative_path: relative_path.to_string(),
        preview_kind: preview_kind.to_string(),
        content: Some(content),
        size_bytes: Some(metadata.len()),
        modified_at: documentation_modified_at(&metadata),
        reason: None,
    })
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct FileAttachmentThumbnailTransport {
    schema_version: String,
    media_type: String,
    data_url: String,
    width: u32,
    height: u32,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct FileAttachmentTransport {
    schema_version: String,
    attachment_id: String,
    journey_id: String,
    absolute_path: String,
    display_name: String,
    size_bytes: u64,
    selected_at: String,
    kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    thumbnail: Option<FileAttachmentThumbnailTransport>,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct FileAttachmentResponse {
    schema_version: String,
    max_files: usize,
    attachments: Vec<FileAttachmentTransport>,
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn image_thumbnail(path: &Path, source_bytes: u64) -> Option<FileAttachmentThumbnailTransport> {
    if source_bytes > FILE_ATTACHMENT_THUMBNAIL_SOURCE_MAX_BYTES {
        return None;
    }
    let dimensions = ImageReader::open(path).ok()?.with_guessed_format().ok()?.into_dimensions().ok()?;
    if u64::from(dimensions.0).saturating_mul(u64::from(dimensions.1)) > FILE_ATTACHMENT_THUMBNAIL_MAX_PIXELS {
        return None;
    }
    let image = ImageReader::open(path).ok()?.with_guessed_format().ok()?.decode().ok()?;
    let thumbnail = image.thumbnail(FILE_ATTACHMENT_THUMBNAIL_EDGE, FILE_ATTACHMENT_THUMBNAIL_EDGE);
    let width = thumbnail.width();
    let height = thumbnail.height();
    let mut encoded = Cursor::new(Vec::new());
    thumbnail.write_to(&mut encoded, ImageFormat::Png).ok()?;
    let data_url = format!("data:image/png;base64,{}", BASE64_STANDARD.encode(encoded.into_inner()));
    Some(FileAttachmentThumbnailTransport {
        schema_version: "0.1.0".to_string(),
        media_type: "image/png".to_string(),
        data_url,
        width,
        height,
    })
}

fn inspect_file_attachments_at(journey_id: &str, paths: &[PathBuf]) -> Result<FileAttachmentResponse, String> {
    if journey_id.trim().is_empty() || journey_id.contains('\0') {
        return Err("Journey id is required for file attachment selection.".to_string());
    }
    if paths.len() > FILE_ATTACHMENT_MAX_FILES {
        return Err(format!("Attach no more than {} files to one message.", FILE_ATTACHMENT_MAX_FILES));
    }
    let selected_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let mut canonical_paths = paths.iter().map(|path| {
        if !path.is_absolute() {
            return Err("Dropped file paths must be absolute.".to_string());
        }
        path.canonicalize().map_err(|_| "Could not resolve a selected file.".to_string())
    }).collect::<Result<Vec<_>, _>>()?;
    canonical_paths.sort();
    canonical_paths.dedup();
    if canonical_paths.len() != paths.len() {
        return Err("Selected file paths must be unique.".to_string());
    }

    let mut attachments = Vec::with_capacity(canonical_paths.len());
    for canonical in canonical_paths {
        let metadata = canonical.metadata().map_err(|_| "Could not inspect a selected file.".to_string())?;
        if !metadata.is_file() {
            return Err("Only regular files can be attached.".to_string());
        }
        let absolute_path = canonical.to_string_lossy().into_owned();
        if absolute_path.contains('\0') {
            return Err("Selected file path is invalid.".to_string());
        }
        let display_name = canonical.file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Selected file has no display name.".to_string())?;
        let thumbnail = image_thumbnail(&canonical, metadata.len());
        let identifier = sha256_hex(format!("{}\0{}", journey_id, absolute_path).as_bytes());
        attachments.push(FileAttachmentTransport {
            schema_version: "0.2.0".to_string(),
            attachment_id: format!("file-{}", &identifier[..24]),
            journey_id: journey_id.to_string(),
            absolute_path,
            display_name,
            size_bytes: metadata.len(),
            selected_at: selected_at.clone(),
            kind: if thumbnail.is_some() { "image" } else { "file" }.to_string(),
            thumbnail,
        });
    }
    Ok(FileAttachmentResponse {
        schema_version: "0.2.0".to_string(),
        max_files: FILE_ATTACHMENT_MAX_FILES,
        attachments,
    })
}

fn find_registered_journey_path(nodes: &[Value], journey_id: &str) -> Option<String> {
    for node in nodes {
        if node.get("id").and_then(Value::as_str) == Some(journey_id) {
            return node.get("projectPath").and_then(Value::as_str).map(str::to_string);
        }
        if let Some(children) = node.get("children").and_then(Value::as_array) {
            if let Some(path) = find_registered_journey_path(children, journey_id) {
                return Some(path);
            }
        }
    }
    None
}

fn registered_journey_root(app: &AppHandle, journey_id: &str) -> Result<PathBuf, String> {
    if journey_id.trim().is_empty() || journey_id.contains('\0') {
        return Err("Journey id is required.".to_string());
    }
    let registry_path = journey_registry_path(app)?;
    let registry = fs::read_to_string(registry_path)
        .map_err(|_| "Could not read the local Journey registry.".to_string())?;
    let payload: Value = serde_json::from_str(&registry)
        .map_err(|_| "The local Journey registry is invalid.".to_string())?;
    let roots = payload.get("roots").and_then(Value::as_array)
        .ok_or_else(|| "The local Journey registry is invalid.".to_string())?;
    find_registered_journey_path(roots, journey_id)
        .filter(|path| !path.trim().is_empty())
        .map(PathBuf::from)
        .ok_or_else(|| "The selected Journey has no configured workspace path.".to_string())
}

const PROJECTION_MANIFEST_MAX_BYTES: u64 = 1024 * 1024;

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JourneyProjectionBundleTransport {
    journey_id: String,
    operational: Option<Value>,
    tactical: Option<Value>,
    strategic: Option<Value>,
    errors: Vec<String>,
}

fn projection_manifest_coordinates_at(journey_root: &Path, journey_id: &str) -> Result<HashSet<String>, String> {
    let canonical_root = bounded_documentation_root(journey_root)?;
    let manifest = canonical_root.join(".mirror").join("projections").join("current.json");
    if !manifest.exists() {
        return Ok(HashSet::new());
    }
    for component in [canonical_root.join(".mirror"), canonical_root.join(".mirror").join("projections"), manifest.clone()] {
        let metadata = fs::symlink_metadata(&component)
            .map_err(|_| "Could not inspect the Journey projection manifest.".to_string())?;
        if metadata.file_type().is_symlink() {
            return Err("Journey projection state cannot use symbolic links.".to_string());
        }
    }
    let canonical_manifest = manifest.canonicalize()
        .map_err(|_| "Could not resolve the Journey projection manifest.".to_string())?;
    if !canonical_manifest.starts_with(&canonical_root) {
        return Err("Journey projection manifest escaped the registered Journey.".to_string());
    }
    let metadata = canonical_manifest.metadata()
        .map_err(|_| "Could not inspect the Journey projection manifest.".to_string())?;
    if !metadata.is_file() || metadata.len() > PROJECTION_MANIFEST_MAX_BYTES {
        return Err("Journey projection manifest is unavailable or oversized.".to_string());
    }
    let payload: Value = serde_json::from_slice(&fs::read(canonical_manifest)
        .map_err(|_| "Could not read the Journey projection manifest.".to_string())?)
        .map_err(|_| "Journey projection manifest is invalid.".to_string())?;
    if payload.get("journeyId").and_then(Value::as_str) != Some(journey_id) {
        return Err("Journey projection manifest belongs to another Journey.".to_string());
    }
    let projections = payload.get("projections").and_then(Value::as_object)
        .ok_or_else(|| "Journey projection manifest is invalid.".to_string())?;
    Ok(projections.keys().cloned().collect())
}

fn inspect_published_projection(journey_id: &str, namespace: &str, projection: &str) -> Result<Value, String> {
    let profile = active_runtime_channel()?;
    let mut command = mirror_runtime_command("uv")?;
    let output = command
        .args([
            "run", "python", "-m", "memory", "journey-projection", "inspect",
            "--journey", journey_id, "--namespace", namespace, "--projection", projection,
            "--mirror-home",
        ])
        .arg(&profile.mirror_home)
        .args(["--format", "json"])
        .output()
        .map_err(|_| format!("Could not inspect the {} Journey projection.", projection))?;
    if !output.status.success() {
        return Err(format!("The {} Journey projection is unavailable or divergent.", projection));
    }
    let value: Value = serde_json::from_slice(&output.stdout)
        .map_err(|_| format!("The {} Journey projection returned invalid data.", projection))?;
    if value.get("status").and_then(Value::as_str) != Some("ok") {
        return Err(format!("The {} Journey projection is unavailable or divergent.", projection));
    }
    Ok(value)
}

fn load_journey_projections_at(journey_root: &Path, journey_id: &str) -> JourneyProjectionBundleTransport {
    let coordinates = match projection_manifest_coordinates_at(journey_root, journey_id) {
        Ok(value) => value,
        Err(error) => return JourneyProjectionBundleTransport { journey_id: journey_id.to_string(), operational: None, tactical: None, strategic: None, errors: vec![error] },
    };
    let mut errors = Vec::new();
    let mut load = |key: &str, namespace: &str, projection: &str| -> Option<Value> {
        if !coordinates.contains(key) {
            return None;
        }
        match inspect_published_projection(journey_id, namespace, projection) {
            Ok(value) => Some(value),
            Err(error) => { errors.push(error); None }
        }
    };
    let operational = load("ariad:operational", "ariad", "operational");
    let tactical = load("nautilus-synthesis:tactical", "nautilus-synthesis", "tactical");
    let strategic = load("nautilus-synthesis:strategic", "nautilus-synthesis", "strategic");
    drop(load);
    if operational.is_none() && !coordinates.contains("ariad:operational") {
        errors.push("The current Operational Journey projection is unavailable.".to_string());
    }
    JourneyProjectionBundleTransport { journey_id: journey_id.to_string(), operational, tactical, strategic, errors }
}

#[tauri::command]
async fn load_journey_projections(app: AppHandle, journey_id: String) -> Result<JourneyProjectionBundleTransport, String> {
    sanitize_journey_id(&journey_id)?;
    let journey_root = registered_journey_root(&app, &journey_id)?;
    tauri::async_runtime::spawn_blocking(move || load_journey_projections_at(&journey_root, &journey_id))
        .await
        .map_err(|error| format!("Could not inspect Journey projections: {}", error))
}

#[tauri::command]
fn list_journey_documentation(app: AppHandle, journey_id: String) -> Result<JourneyDocumentationTree, String> {
    let journey_root = registered_journey_root(&app, &journey_id)?;
    list_journey_documentation_at(&journey_root)
}

#[tauri::command]
fn read_journey_document(app: AppHandle, journey_id: String, relative_path: String) -> Result<JourneyDocumentContent, String> {
    let journey_root = registered_journey_root(&app, &journey_id)?;
    read_journey_document_at(&journey_root, &relative_path)
}

#[tauri::command]
fn choose_file_attachments(journey_id: String) -> Result<FileAttachmentResponse, String> {
    let paths = rfd::FileDialog::new()
        .set_title("Anexar arquivos")
        .pick_files()
        .unwrap_or_default();
    inspect_file_attachments_at(&journey_id, &paths)
}

#[tauri::command]
fn inspect_file_attachments(journey_id: String, paths: Vec<String>) -> Result<FileAttachmentResponse, String> {
    inspect_file_attachments_at(&journey_id, &paths.into_iter().map(PathBuf::from).collect::<Vec<_>>())
}

fn resolve_existing_local_file(path: &str, base_path: Option<&str>) -> Result<PathBuf, String> {
    if path.trim().is_empty()
        || path.contains('\0')
        || path.starts_with("http://")
        || path.starts_with("https://")
    {
        return Err("Unsupported local reference.".to_string());
    }

    let requested_path = PathBuf::from(path.trim());
    let resolved_path = if requested_path.is_absolute() {
        requested_path
    } else {
        let base_root = match base_path.filter(|value| !value.trim().is_empty()) {
            Some(value) => PathBuf::from(value)
                .canonicalize()
                .map_err(|error| format!("Could not resolve local reference base path: {}", error))?,
            None => harness_root()?.canonicalize()
                .map_err(|error| format!("Could not resolve Harness root: {}", error))?,
        };
        base_root.join(requested_path)
    };
    let canonical_path = resolved_path
        .canonicalize()
        .map_err(|error| format!("Could not open local reference: {}", error))?;
    let metadata = fs::metadata(&canonical_path)
        .map_err(|error| format!("Could not inspect local reference: {}", error))?;
    if !metadata.is_file() {
        return Err("Local reference is not a file.".to_string());
    }
    Ok(canonical_path)
}

#[tauri::command]
fn inspect_local_references(paths: Vec<String>, base_path: Option<String>) -> Result<Vec<String>, String> {
    if paths.len() > 64 || paths.iter().any(|path| path.len() > 4096) {
        return Err("Local reference inspection exceeds its bounded input.".to_string());
    }
    Ok(paths.into_iter()
        .filter(|path| resolve_existing_local_file(path, base_path.as_deref()).is_ok())
        .collect())
}

#[tauri::command]
fn open_local_reference(path: String, base_path: Option<String>) -> Result<(), String> {
    open_path(&resolve_existing_local_file(&path, base_path.as_deref())?)
}

fn validate_external_url(value: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(value.trim())
        .map_err(|_| "Unsupported external URL.".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("Unsupported external URL.".to_string());
    }
    Ok(parsed)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let validated = validate_external_url(&url)?;
    open_url(validated.as_str())
}

fn event_authority(value: &RunAuthority) -> PiProcessEventAuthority {
    PiProcessEventAuthority {
        schema_version: "0.1.0".to_string(),
        journey_id: value.journey_id.clone(),
        run_id: value.run_id.clone(),
        turn_id: value.turn_id.clone(),
        thread_id: value.thread_id.clone(),
        generation: value.generation,
        pi_session_id: value.pi_session_id.clone(),
        mirror_conversation_id: value.mirror_conversation_id.clone(),
        harness_user_message_id: value.harness_user_message_id.clone(),
        harness_assistant_message_id: value.harness_assistant_message_id.clone(),
    }
}

#[tauri::command]
fn start_pi_invocation(
    app: AppHandle,
    state: State<'_, PiProcessState>,
    prompt: String,
    config: ProviderConfig,
    run_authority: RunAuthority,
) -> Result<(), String> {
    if prompt.trim().is_empty() {
        return Err("Pi invocation requires a non-empty prompt packet.".to_string());
    }
    if config.command.trim().is_empty() {
        return Err("Provider command is required.".to_string());
    }
    if config.command.contains("..") {
        return Err("Provider command must not contain parent-directory traversal.".to_string());
    }
    validate_run_authority(&app, &run_authority)?;
    let authority = event_authority(&run_authority);
    if state
        .child
        .lock()
        .map_err(|_| "Could not inspect active Pi process.".to_string())?
        .is_some()
    {
        return Err("A local Pi invocation is already running.".to_string());
    }

    if let Ok(mut cancelling) = state.cancelling.lock() {
        *cancelling = false;
    }
    if let Ok(mut authority_slot) = state.authority.lock() {
        *authority_slot = Some(authority.clone());
    } else {
        return Err("Could not store active run authority.".to_string());
    }

    let child_state = state.child.clone();
    let cancelling_state = state.cancelling.clone();
    let authority_state = state.authority.clone();
    thread::spawn(move || run_pi_process(
        app,
        child_state,
        cancelling_state,
        prompt,
        config,
        run_authority,
        authority,
        authority_state,
    ));

    Ok(())
}

#[tauri::command]
async fn read_pi_session_context_stats(
    journey_id: String,
    session_id: String,
) -> Result<PiSessionContextInspection, String> {
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    let safe_session_id = sanitize_session_id(&session_id)?;
    if !safe_session_id.starts_with(&format!("nautilus-{}", safe_journey_id)) {
        return Err("Pi session id does not belong to the selected Journey conversation.".to_string());
    }

    tauri::async_runtime::spawn_blocking(move || {
        read_latest_pi_session_context_stats(&safe_session_id)
    })
    .await
    .map_err(|error| format!("Could not inspect the local Pi session: {}", error))?
}

#[tauri::command]
fn load_dedicated_pi_transcript(
    app: AppHandle,
    journey_id: String,
    session_id: String,
    session_file: String,
) -> Result<Vec<DedicatedPiTranscriptTurn>, String> {
    validate_pi_session_file(&app, &session_file, &session_id)?;
    let stored_thread: Value = serde_json::from_str(&fs::read_to_string(journey_thread_path(&app, &journey_id)?)
        .map_err(|error| format!("Could not read dedicated thread: {}", error))?)
        .map_err(|error| format!("Could not parse dedicated thread: {}", error))?;
    let thread = unwrap_persisted_thread(&stored_thread);
    let active = thread.get("activeGeneration").and_then(Value::as_u64);
    let generation = thread.get("generations").and_then(Value::as_array)
        .and_then(|items| items.iter().find(|item| item.get("generation").and_then(Value::as_u64) == active))
        .ok_or_else(|| "Dedicated active generation is missing.".to_string())?;
    if thread.get("journeyId").and_then(Value::as_str) != Some(journey_id.as_str())
        || generation.get("status").and_then(Value::as_str) != Some("ready")
        || generation.get("piSessionId").and_then(Value::as_str) != Some(session_id.as_str())
        || generation.get("piSessionFile").and_then(Value::as_str) != Some(session_file.as_str())
    {
        return Err("Dedicated transcript authority mismatch.".to_string());
    }
    project_complete_pi_transcript(&fs::read_to_string(session_file).map_err(|error| error.to_string())?)
}

fn project_complete_pi_transcript(content: &str) -> Result<Vec<DedicatedPiTranscriptTurn>, String> {
    let mut entries = Vec::new();
    for line in content.lines() {
        let value: Value = serde_json::from_str(line).map_err(|_| "Dedicated Pi session JSONL is invalid.".to_string())?;
        if value.get("type").and_then(Value::as_str) == Some("session") { continue; }
        let Some(id) = value.get("id").and_then(Value::as_str) else { continue };
        let message = value.get("message");
        entries.push(PiBranchEntry {
            id: id.to_string(),
            parent_id: value.get("parentId").and_then(Value::as_str).map(str::to_string),
            role: message.and_then(|item| item.get("role")).and_then(Value::as_str).map(str::to_string),
            text: message.map(extract_pi_visible_text).unwrap_or_default(),
            stop_reason: message.and_then(|item| item.get("stopReason")).and_then(Value::as_str).map(str::to_string),
            timestamp: value.get("timestamp").and_then(Value::as_str).unwrap_or("").to_string(),
        });
    }
    if entries.is_empty() { return Ok(Vec::new()); }
    let by_id = entries.iter().enumerate().map(|(index, entry)| (entry.id.as_str(), index))
        .collect::<std::collections::HashMap<_, _>>();
    let mut branch = Vec::new();
    let mut cursor = entries.last();
    let mut seen = std::collections::HashSet::new();
    while let Some(entry) = cursor {
        if !seen.insert(entry.id.as_str()) { return Err("Dedicated Pi ancestry contains a cycle.".to_string()); }
        branch.push(entry.clone());
        cursor = entry.parent_id.as_deref().and_then(|parent| by_id.get(parent)).map(|index| &entries[*index]);
    }
    branch.reverse();
    let mut turns = Vec::new();
    let mut pending_user: Option<&PiBranchEntry> = None;
    let mut assistant_texts = Vec::new();
    for (entry_index, entry) in branch.iter().enumerate() {
        match entry.role.as_deref() {
            Some("user") => {
                pending_user = Some(entry);
                assistant_texts.clear();
            }
            Some("assistant") if pending_user.is_some() => {
                if !entry.text.trim().is_empty() { assistant_texts.push(entry.text.trim().to_string()); }
                if matches!(entry.stop_reason.as_deref(), Some("stop" | "length")) {
                    let user = pending_user.take().unwrap();
                    let assistant_text = assistant_texts.join("\n\n");
                    if !user.text.trim().is_empty() && !assistant_text.trim().is_empty() {
                        turns.push(DedicatedPiTranscriptTurn {
                            user_entry_id: user.id.clone(),
                            assistant_entry_id: entry.id.clone(),
                            user_text: project_dedicated_user_text(&user.text),
                            assistant_text,
                            entry_count: entry_index + 1,
                            started_at: user.timestamp.clone(),
                            committed_at: entry.timestamp.clone(),
                        });
                    }
                    assistant_texts.clear();
                }
            }
            _ => {}
        }
    }
    Ok(turns)
}

fn project_dedicated_user_text(value: &str) -> String {
    for marker in ["\n\nExplicit Navigator intent:\n", "\n\nUser request:\n"] {
        if let Some((_, visible)) = value.rsplit_once(marker) {
            return visible
                .split("\n\nFiles explicitly selected by the user\n")
                .next()
                .unwrap_or(visible)
                .trim()
                .to_string();
        }
    }
    value.trim().to_string()
}

fn validate_pi_session_file(app: &AppHandle, session_file: &str, pi_session_id: &str) -> Result<(), String> {
    let home = PathBuf::from(std::env::var("HOME").map_err(|_| "HOME is unavailable.".to_string())?);
    let app_data_root = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    validate_pi_session_file_at(
        session_file,
        pi_session_id,
        &home.join(".pi").join("agent").join("sessions"),
        &app_data_root,
    )
}

fn validate_pi_session_file_at(
    session_file: &str,
    pi_session_id: &str,
    global_sessions_root: &Path,
    app_data_root: &Path,
) -> Result<(), String> {
    let path = PathBuf::from(session_file);
    if !path.is_absolute() || path.extension().and_then(|value| value.to_str()) != Some("jsonl") {
        return Err("Mirror reconciliation requires an exact Pi JSONL session file.".to_string());
    }
    let canonical = path.canonicalize()
        .map_err(|_| "Mirror reconciliation Pi session file is unavailable.".to_string())?;
    let global_root = global_sessions_root.canonicalize().ok();
    let dedicated_root = app_data_root.join("pi-sessions").canonicalize().ok();
    let allowed = global_root.as_ref().is_some_and(|root| canonical.starts_with(root))
        || dedicated_root.as_ref().is_some_and(|root| canonical.starts_with(root));
    if !allowed {
        return Err("Mirror reconciliation session is outside the allowed Pi sessions roots.".to_string());
    }
    validate_pi_session_header(&canonical, pi_session_id)
}

fn validate_pi_session_header(path: &Path, pi_session_id: &str) -> Result<(), String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let first_line = contents.lines().next().unwrap_or_default();
    let header: Value = serde_json::from_str(first_line)
        .map_err(|_| "Pi session header is invalid.".to_string())?;
    if header.get("type").and_then(Value::as_str) != Some("session")
        || header.get("id").and_then(Value::as_str) != Some(pi_session_id)
    {
        return Err("Pi session does not match native authority.".to_string());
    }
    Ok(())
}

fn extract_pi_visible_text(message: &Value) -> String {
    match message.get("content") {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Array(blocks)) => blocks.iter()
            .filter(|block| block.get("type").and_then(Value::as_str) == Some("text"))
            .filter_map(|block| block.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("\n"),
        _ => String::new(),
    }
}

#[tauri::command]
fn cancel_pi_invocation(app: AppHandle, state: State<'_, PiProcessState>) -> Result<(), String> {
    let mut child_slot = state
        .child
        .lock()
        .map_err(|_| "Could not access active Pi process.".to_string())?;
    let Some(child) = child_slot.as_mut() else {
        return Err("No local Pi invocation is running.".to_string());
    };

    if let Ok(mut cancelling) = state.cancelling.lock() {
        *cancelling = true;
    }
    let authority = state.authority.lock()
        .map_err(|_| "Could not inspect active run authority.".to_string())?
        .clone()
        .ok_or_else(|| "Active run authority is missing.".to_string())?;
    child
        .kill()
        .map_err(|error| format!("Could not cancel local Pi invocation: {}", error))?;
    emit(
        &app,
        &authority,
        PiProcessEventKind::Cancelled,
        "Pi invocation cancelled.".to_string(),
    );
    Ok(())
}

fn mirror_append_outbox_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(MIRROR_APPEND_OUTBOX_FILE))
}

fn valid_append_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_alphanumeric() || (index > 0 && matches!(byte, b'.' | b'_' | b':' | b'-'))
        })
}

fn validate_mirror_append_item(item: &Value) -> Result<(), String> {
    let encoded = serde_json::to_vec(item).map_err(|_| "mirror_append_item_invalid".to_string())?;
    if encoded.len() > MIRROR_APPEND_MAX_ITEM_BYTES {
        return Err("mirror_append_item_oversized".to_string());
    }
    let object = item
        .as_object()
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    let exact = [
        "schemaVersion",
        "itemId",
        "journeyId",
        "threadId",
        "generation",
        "conversationId",
        "sourceInterface",
        "createdAt",
        "messages",
    ];
    if object.len() != exact.len()
        || exact.iter().any(|key| !object.contains_key(*key))
        || item.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || item.get("sourceInterface").and_then(Value::as_str) != Some("nautilus-harness")
        || item
            .get("generation")
            .and_then(Value::as_u64)
            .is_none_or(|value| value == 0)
    {
        return Err("mirror_append_item_invalid".to_string());
    }
    for key in ["itemId", "journeyId", "threadId", "conversationId"] {
        if item
            .get(key)
            .and_then(Value::as_str)
            .is_none_or(|value| !valid_append_id(value))
        {
            return Err("mirror_append_item_invalid".to_string());
        }
    }
    if item
        .get("createdAt")
        .and_then(Value::as_str)
        .is_none_or(|value| {
            value.len() > 40 || chrono::DateTime::parse_from_rfc3339(value).is_err()
        })
    {
        return Err("mirror_append_item_invalid".to_string());
    }
    let messages = item
        .get("messages")
        .and_then(Value::as_array)
        .filter(|items| items.len() == 2)
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    for (index, message) in messages.iter().enumerate() {
        let object = message
            .as_object()
            .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
        if object.len() != 5
            || ["id", "role", "content", "createdAt", "metadata"]
                .iter()
                .any(|key| !object.contains_key(*key))
            || message
                .get("id")
                .and_then(Value::as_str)
                .is_none_or(|value| !valid_append_id(value))
            || message.get("role").and_then(Value::as_str)
                != Some(if index == 0 { "user" } else { "assistant" })
            || message
                .get("content")
                .and_then(Value::as_str)
                .is_none_or(|value| value.is_empty() || value.len() > 51_200)
            || message
                .get("createdAt")
                .and_then(Value::as_str)
                .is_none_or(|value| {
                    value.len() > 40 || chrono::DateTime::parse_from_rfc3339(value).is_err()
                })
        {
            return Err("mirror_append_item_invalid".to_string());
        }
        let metadata = message
            .get("metadata")
            .and_then(Value::as_object)
            .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
        if metadata.len() != 2
            || metadata.get("sourceTurnId").and_then(Value::as_str)
                != item.get("itemId").and_then(Value::as_str)
            || metadata.get("generation").and_then(Value::as_u64)
                != item.get("generation").and_then(Value::as_u64)
        {
            return Err("mirror_append_item_invalid".to_string());
        }
    }
    if messages[0].get("id") == messages[1].get("id") {
        return Err("mirror_append_item_invalid".to_string());
    }
    Ok(())
}

fn read_mirror_append_outbox(path: &Path) -> Result<Value, String> {
    if !path.exists() {
        return Ok(
            json!({"schemaVersion":"1.0.0","items":[],"savedAt":Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)}),
        );
    }
    let metadata =
        fs::symlink_metadata(path).map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() as usize > MIRROR_APPEND_MAX_FILE_BYTES
    {
        return Err("mirror_append_outbox_invalid".to_string());
    }
    let value: Value = serde_json::from_slice(
        &fs::read(path).map_err(|_| "mirror_append_outbox_unavailable".to_string())?,
    )
    .map_err(|_| "mirror_append_outbox_invalid".to_string())?;
    let items = value
        .get("items")
        .and_then(Value::as_array)
        .filter(|items| items.len() <= MIRROR_APPEND_MAX_ITEMS)
        .ok_or_else(|| "mirror_append_outbox_invalid".to_string())?;
    if value.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0") {
        return Err("mirror_append_outbox_invalid".to_string());
    }
    for item in items {
        validate_mirror_append_item(item)?;
    }
    Ok(value)
}

fn write_mirror_append_outbox(path: &Path, mut value: Value) -> Result<(), String> {
    value["savedAt"] = Value::String(Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true));
    let payload = serde_json::to_vec_pretty(&value)
        .map_err(|_| "mirror_append_outbox_invalid".to_string())?;
    if payload.len() > MIRROR_APPEND_MAX_FILE_BYTES {
        return Err("mirror_append_outbox_full".to_string());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    }
    let staged = path.with_extension("json.tmp");
    fs::write(&staged, payload).map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    fs::File::open(&staged)
        .and_then(|file| file.sync_all())
        .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    fs::rename(&staged, path).map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    if let Some(parent) = path.parent() {
        fs::File::open(parent)
            .and_then(|directory| directory.sync_all())
            .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    }
    Ok(())
}

fn enqueue_mirror_append_item_at(path: &Path, item: Value) -> Result<(), String> {
    let mut outbox = read_mirror_append_outbox(path)?;
    let items = outbox.get_mut("items").and_then(Value::as_array_mut)
        .ok_or_else(|| "mirror_append_outbox_invalid".to_string())?;
    if let Some(existing) = items.iter().find(|candidate| candidate.get("itemId") == item.get("itemId")) {
        return if existing == &item { Ok(()) } else { Err("mirror_append_item_conflict".to_string()) };
    }
    if items.len() >= MIRROR_APPEND_MAX_ITEMS { return Err("mirror_append_outbox_full".to_string()); }
    items.push(item);
    write_mirror_append_outbox(path, outbox)
}

#[tauri::command]
fn enqueue_mirror_append_item(
    app: AppHandle,
    state: State<'_, MirrorAppendOutboxState>,
    payload: String,
) -> Result<(), String> {
    if payload.len() > MIRROR_APPEND_MAX_ITEM_BYTES {
        return Err("mirror_append_item_oversized".to_string());
    }
    let item: Value =
        serde_json::from_str(&payload).map_err(|_| "mirror_append_item_invalid".to_string())?;
    validate_mirror_append_item(&item)?;
    validate_outbox_generation_authority(&app, &item)?;
    let _guard = state
        .lock
        .lock()
        .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    enqueue_mirror_append_item_at(&mirror_append_outbox_path(&app)?, item)
}

#[tauri::command]
fn list_mirror_append_outbox(
    app: AppHandle,
    state: State<'_, MirrorAppendOutboxState>,
    journey_id: String,
) -> Result<Vec<Value>, String> {
    sanitize_journey_id(&journey_id)?;
    let _guard = state
        .lock
        .lock()
        .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    let outbox = read_mirror_append_outbox(&mirror_append_outbox_path(&app)?)?;
    Ok(outbox.get("items").and_then(Value::as_array).into_iter().flatten()
        .filter(|item| item.get("journeyId").and_then(Value::as_str) == Some(journey_id.as_str()))
        .map(|item| json!({
            "schemaVersion":"1.0.0", "itemId":item["itemId"], "journeyId":item["journeyId"],
            "threadId":item["threadId"], "generation":item["generation"], "conversationId":item["conversationId"],
            "createdAt":item["createdAt"]
        })).collect())
}

fn validate_outbox_generation_authority(app: &AppHandle, item: &Value) -> Result<(), String> {
    let journey_id = item
        .get("journeyId")
        .and_then(Value::as_str)
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    let stored: Value = serde_json::from_str(
        &fs::read_to_string(journey_thread_path(app, journey_id)?)
            .map_err(|_| "mirror_append_authority_missing".to_string())?,
    )
    .map_err(|_| "mirror_append_authority_invalid".to_string())?;
    let thread = unwrap_persisted_thread(&stored);
    validate_thread_runtime_channel(thread)?;
    let generation = item.get("generation").and_then(Value::as_u64);
    let authority = thread
        .get("generations")
        .and_then(Value::as_array)
        .and_then(|items| {
            items
                .iter()
                .find(|candidate| candidate.get("generation").and_then(Value::as_u64) == generation)
        })
        .ok_or_else(|| "mirror_append_authority_missing".to_string())?;
    if thread.get("journeyId") != item.get("journeyId")
        || thread.get("threadId") != item.get("threadId")
        || authority.get("mirrorConversationId") != item.get("conversationId")
        || !matches!(
            authority.get("status").and_then(Value::as_str),
            Some("ready" | "inactive")
        )
    {
        return Err("mirror_append_thread_authority_mismatch".to_string());
    }
    let projection_path = dedicated_journey_conversation_path(
        app,
        journey_id,
        generation.ok_or_else(|| "mirror_append_authority_invalid".to_string())?,
    )?;
    let projection: Value = serde_json::from_str(
        &fs::read_to_string(projection_path)
            .map_err(|_| "mirror_append_authority_missing".to_string())?,
    )
    .map_err(|_| "mirror_append_authority_invalid".to_string())?;
    let conversation = projection
        .get("conversation")
        .ok_or_else(|| "mirror_append_authority_invalid".to_string())?;
    let live = conversation
        .get("liveIdentity")
        .ok_or_else(|| "mirror_append_authority_invalid".to_string())?;
    let turn_id = item.get("itemId");
    let turn = conversation
        .pointer("/reconciliation/turns")
        .and_then(Value::as_array)
        .and_then(|turns| turns.iter().find(|turn| turn.get("turnId") == turn_id))
        .ok_or_else(|| "mirror_append_authority_missing".to_string())?;
    if conversation.get("id") != item.get("threadId")
        || conversation.get("journeyId") != item.get("journeyId")
        || live.get("generation") != item.get("generation")
        || live.get("mirrorConversationId") != item.get("conversationId")
        || turn.pointer("/harness/state").and_then(Value::as_str) != Some("committed")
        || turn.pointer("/pi/state").and_then(Value::as_str) != Some("committed")
    {
        return Err("mirror_append_projection_authority_mismatch".to_string());
    }
    let durable_messages = conversation
        .get("messages")
        .and_then(Value::as_array)
        .ok_or_else(|| "mirror_append_authority_invalid".to_string())?;
    for expected in item["messages"].as_array().into_iter().flatten() {
        let durable = durable_messages
            .iter()
            .find(|message| message.get("id") == expected.get("id"))
            .ok_or_else(|| "mirror_append_authority_missing".to_string())?;
        for key in ["id", "role", "content", "createdAt"] {
            if durable.get(key) != expected.get(key) {
                return Err("mirror_append_message_authority_mismatch".to_string());
            }
        }
    }
    Ok(())
}

fn validate_outbox_acknowledgement(app: &AppHandle, item: &Value) -> Result<(), String> {
    validate_outbox_generation_authority(app, item)?;
    let journey_id = item.get("journeyId").and_then(Value::as_str)
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    let generation = item.get("generation").and_then(Value::as_u64)
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    let projection: Value = serde_json::from_str(
        &fs::read_to_string(dedicated_journey_conversation_path(app, journey_id, generation)?)
            .map_err(|_| "mirror_append_authority_missing".to_string())?,
    ).map_err(|_| "mirror_append_authority_invalid".to_string())?;
    let turn = projection.pointer("/conversation/reconciliation/turns").and_then(Value::as_array)
        .and_then(|turns| turns.iter().find(|turn| turn.get("turnId") == item.get("itemId")))
        .ok_or_else(|| "mirror_append_authority_missing".to_string())?;
    let expected = item.get("messages").and_then(Value::as_array)
        .ok_or_else(|| "mirror_append_item_invalid".to_string())?;
    if turn.pointer("/mirror/state").and_then(Value::as_str) != Some("committed")
        || turn.pointer("/mirror/userMessageId") != expected[0].get("id")
        || turn.pointer("/mirror/assistantMessageId") != expected[1].get("id")
    {
        return Err("mirror_append_acknowledgement_missing".to_string());
    }
    Ok(())
}

fn run_explicit_mirror_append(item: &Value) -> Result<Value, String> {
    let profile = active_runtime_channel()?;
    let request = json!({
        "schemaVersion":"1.0.0", "conversationId":item["conversationId"], "journeyId":item["journeyId"],
        "sourceInterface":item["sourceInterface"], "messages":item["messages"]
    });
    let payload =
        serde_json::to_vec(&request).map_err(|_| "mirror_append_item_invalid".to_string())?;
    if payload.len() > 262_144 {
        return Err("mirror_append_item_oversized".to_string());
    }
    let mut command = mirror_runtime_command("uv")?;
    let mut child = command
        .args([
            "run",
            "python",
            "-m",
            "memory",
            "conversations",
            "append",
            "--mirror-home",
        ])
        .arg(&profile.mirror_home)
        .args(["--format", "json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "mirror_append_process_failed".to_string())?;
    child
        .stdin
        .take()
        .ok_or_else(|| "mirror_append_process_failed".to_string())?
        .write_all(&payload)
        .map_err(|_| "mirror_append_process_failed".to_string())?;
    let output = child
        .wait_with_output()
        .map_err(|_| "mirror_append_process_failed".to_string())?;
    if output.stdout.len() > 65_536 {
        return Err("mirror_append_invalid_receipt".to_string());
    }
    let receipt: Value = serde_json::from_slice(&output.stdout)
        .map_err(|_| "mirror_append_invalid_receipt".to_string())?;
    if !output.status.success() {
        let reason = receipt
            .get("reason")
            .and_then(Value::as_str)
            .filter(|value| {
                value.len() <= 80
                    && value
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte == b'_')
            })
            .unwrap_or("rejected");
        return Err(format!("mirror_append_{}", reason));
    }
    let messages = receipt
        .get("messages")
        .and_then(Value::as_array)
        .filter(|values| values.len() == 2)
        .ok_or_else(|| "mirror_append_invalid_receipt".to_string())?;
    let inserted_count = messages.iter().filter(|message| message.get("state").and_then(Value::as_str) == Some("inserted")).count() as u64;
    let existing_count = messages.iter().filter(|message| message.get("state").and_then(Value::as_str) == Some("existing")).count() as u64;
    if receipt.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || receipt.get("status").and_then(Value::as_str) != Some("accepted")
        || receipt.get("insertedCount").and_then(Value::as_u64) != Some(inserted_count)
        || receipt.get("existingCount").and_then(Value::as_u64) != Some(existing_count)
        || receipt.get("conversationId") != item.get("conversationId")
        || receipt.get("journeyId") != item.get("journeyId")
        || messages
            .iter()
            .zip(item["messages"].as_array().unwrap())
            .any(|(actual, expected)| {
                actual.get("id") != expected.get("id")
                    || !matches!(
                        actual.get("state").and_then(Value::as_str),
                        Some("inserted" | "existing")
                    )
            })
    {
        return Err("mirror_append_invalid_receipt".to_string());
    }
    Ok(receipt)
}

#[tauri::command]
fn append_mirror_outbox_item(
    app: AppHandle,
    state: State<'_, MirrorAppendOutboxState>,
    item_id: String,
) -> Result<Value, String> {
    if !valid_append_id(&item_id) {
        return Err("mirror_append_item_invalid".to_string());
    }
    let _guard = state
        .lock
        .lock()
        .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    let outbox = read_mirror_append_outbox(&mirror_append_outbox_path(&app)?)?;
    let item = outbox
        .get("items")
        .and_then(Value::as_array)
        .and_then(|items| {
            items
                .iter()
                .find(|item| item.get("itemId").and_then(Value::as_str) == Some(item_id.as_str()))
        })
        .ok_or_else(|| "mirror_append_item_missing".to_string())?;
    validate_outbox_generation_authority(&app, item)?;
    run_explicit_mirror_append(item)
}

#[tauri::command]
fn acknowledge_mirror_append_item(
    app: AppHandle,
    state: State<'_, MirrorAppendOutboxState>,
    item_id: String,
    conversation_id: String,
) -> Result<(), String> {
    if !valid_append_id(&item_id) || !valid_append_id(&conversation_id) {
        return Err("mirror_append_item_invalid".to_string());
    }
    let _guard = state
        .lock
        .lock()
        .map_err(|_| "mirror_append_outbox_unavailable".to_string())?;
    let path = mirror_append_outbox_path(&app)?;
    let mut outbox = read_mirror_append_outbox(&path)?;
    let items = outbox
        .get_mut("items")
        .and_then(Value::as_array_mut)
        .ok_or_else(|| "mirror_append_outbox_invalid".to_string())?;
    let item = items.iter().find(|item| {
        item.get("itemId").and_then(Value::as_str) == Some(item_id.as_str())
            && item.get("conversationId").and_then(Value::as_str) == Some(conversation_id.as_str())
    }).ok_or_else(|| "mirror_append_item_missing".to_string())?;
    validate_outbox_acknowledgement(&app, item)?;
    items.retain(|item| {
        !(item.get("itemId").and_then(Value::as_str) == Some(item_id.as_str())
            && item.get("conversationId").and_then(Value::as_str) == Some(conversation_id.as_str()))
    });
    write_mirror_append_outbox(&path, outbox)
}

fn mirror_runtime_skill_paths() -> Result<Vec<PathBuf>, String> {
    let profile = active_runtime_channel()?;
    let core = profile
        .mirror_root
        .join(".pi")
        .join("skills")
        .canonicalize()
        .map_err(|_| "Mirror core skills are unavailable.".to_string())?;
    let runtime_root = profile.mirror_home.join("runtime").join("skills").join("pi");
    let catalog_path = runtime_root.join("extensions.json");
    let mut paths = vec![core];
    if !catalog_path.exists() {
        return Ok(paths);
    }
    let metadata = fs::symlink_metadata(&catalog_path)
        .map_err(|_| "Mirror external skill catalog is unavailable.".to_string())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > 1024 * 1024 {
        return Err("Mirror external skill catalog is invalid.".to_string());
    }
    let catalog: Value = serde_json::from_slice(
        &fs::read(catalog_path)
            .map_err(|_| "Mirror external skill catalog is unavailable.".to_string())?,
    )
    .map_err(|_| "Mirror external skill catalog is invalid.".to_string())?;
    let extensions = catalog
        .get("extensions")
        .and_then(Value::as_array)
        .filter(|items| items.len() <= 64)
        .ok_or_else(|| "Mirror external skill catalog is invalid.".to_string())?;
    if catalog.get("schema_version").and_then(Value::as_str) != Some("1")
        || catalog.get("runtime").and_then(Value::as_str) != Some("pi")
    {
        return Err("Mirror external skill catalog is invalid.".to_string());
    }
    let canonical_runtime = runtime_root
        .canonicalize()
        .map_err(|_| "Mirror external skill runtime is unavailable.".to_string())?;
    for extension in extensions {
        let candidate = extension
            .get("installed_skill_path")
            .and_then(Value::as_str)
            .map(PathBuf::from)
            .ok_or_else(|| "Mirror external skill catalog is invalid.".to_string())?;
        let canonical = candidate
            .canonicalize()
            .map_err(|_| "Mirror external skill is unavailable.".to_string())?;
        if !canonical.starts_with(&canonical_runtime) {
            return Err("Mirror external skill escaped its runtime root.".to_string());
        }
        paths.push(canonical);
    }
    paths.sort();
    paths.dedup();
    Ok(paths)
}

fn run_pi_process(
    app: AppHandle,
    child_state: Arc<Mutex<Option<Child>>>,
    cancelling_state: Arc<Mutex<bool>>,
    prompt: String,
    config: ProviderConfig,
    run_authority: RunAuthority,
    authority: PiProcessEventAuthority,
    authority_state: Arc<Mutex<Option<PiProcessEventAuthority>>>,
) {
    let mirror_mediated = config.invocation_mode == "mirror" && !config.safe_test_mode;
    let command = if config.safe_test_mode {
        "cat".to_string()
    } else {
        config.command
    };
    let mut args = if config.safe_test_mode {
        Vec::new()
    } else {
        config.args
    };
    args = remove_provider_session_args(args);
    if mirror_mediated {
        args = mirror_json_event_args(args);
    }
    if !config.safe_test_mode {
        args.push("--session".to_string());
        args.push(run_authority.pi_session_file.clone());
    }
    if mirror_mediated {
        args.retain(|arg| arg != "--approve" && arg != "--no-approve");
        args.push("--approve".to_string());
        args.push("--no-extensions".to_string());
        match mirror_runtime_skill_paths() {
            Ok(paths) => for path in paths {
                args.push("--skill".to_string());
                args.push(path.to_string_lossy().into_owned());
            },
            Err(error) => {
                emit(&app, &authority, PiProcessEventKind::Error, error);
                emit(&app, &authority, PiProcessEventKind::Done, "Pi invocation finished.".to_string());
                return;
            }
        }
    }
    let use_stdin = config.safe_test_mode || config.use_stdin;

    if !use_stdin {
        args.push(prompt.clone());
    }

    if mirror_mediated {
        emit(
            &app,
            &authority,
            PiProcessEventKind::Started,
            format!(
                "Starting Mirror runtime Pi command for Journey {}: {} {}",
                run_authority.journey_id,
                command,
                args_for_display(&args)
            ),
        );
    } else {
        emit(
            &app,
            &authority,
            PiProcessEventKind::Started,
            format!(
                "Starting raw local Pi command: {} {}",
                command,
                args_for_display(&args)
            ),
        );
    }

    let mut process_command = Command::new(&command);
    process_command.args(args);
    if mirror_mediated {
        let profile = match active_runtime_channel() {
            Ok(profile) => profile,
            Err(error) => {
                emit(&app, &authority, PiProcessEventKind::Error, error);
                emit(&app, &authority, PiProcessEventKind::Done, "Pi invocation finished.".to_string());
                return;
            }
        };
        profile.apply_to_command(&mut process_command);
        match serde_json::to_string(&run_authority.correlation) {
            Ok(payload) => {
                process_command.env("NAUTILUS_TURN_CORRELATION_V1", payload);
            }
            Err(error) => {
                emit(&app, &authority, PiProcessEventKind::Error, format!("Could not serialize turn correlation: {}", error));
                emit(&app, &authority, PiProcessEventKind::Done, "Pi invocation finished.".to_string());
                return;
            }
        }
    }

    let mut child = match process_command
        .stdin(if use_stdin {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            emit(
                &app,
                &authority,
                PiProcessEventKind::Error,
                format!("Could not start local Pi command '{}': {}", command, error),
            );
            emit(
                &app,
                &authority,
                PiProcessEventKind::Done,
                "Pi invocation finished.".to_string(),
            );
            return;
        }
    };

    if use_stdin {
        if let Some(mut stdin) = child.stdin.take() {
            if let Err(error) = stdin.write_all(prompt.as_bytes()) {
                emit(
                    &app,
                    &authority,
                    PiProcessEventKind::Error,
                    format!("Could not write prompt packet to Pi stdin: {}", error),
                );
            }
        }
    }

    let stdout_handle = child.stdout.take().map(|stdout| {
        let app = app.clone();
        let authority = authority.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                match line {
                    Ok(line) => {
                        emit(&app, &authority, PiProcessEventKind::Stdout, format!("{}\n", line));
                    }
                    Err(error) => emit(
                        &app,
                        &authority,
                        PiProcessEventKind::Error,
                        format!("Could not read Pi stdout: {}", error),
                    ),
                }
            }
        })
    });

    let stderr_handle = child.stderr.take().map(|stderr| {
        let app = app.clone();
        let authority = authority.clone();
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines() {
                match line {
                    Ok(line) => emit(&app, &authority, PiProcessEventKind::Stderr, line),
                    Err(error) => emit(
                        &app,
                        &authority,
                        PiProcessEventKind::Error,
                        format!("Could not read Pi stderr: {}", error),
                    ),
                }
            }
        })
    });

    if let Ok(mut child_slot) = child_state.lock() {
        *child_slot = Some(child);
    } else {
        emit(
            &app,
            &authority,
            PiProcessEventKind::Error,
            "Could not track local Pi process.".to_string(),
        );
        emit(
            &app,
            &authority,
            PiProcessEventKind::Done,
            "Pi invocation finished.".to_string(),
        );
        return;
    }

    loop {
        let wait_result = {
            let mut child_slot = match child_state.lock() {
                Ok(child_slot) => child_slot,
                Err(_) => {
                    emit(
                        &app,
                        &authority,
                        PiProcessEventKind::Error,
                        "Could not inspect local Pi process.".to_string(),
                    );
                    break;
                }
            };
            match child_slot.as_mut() {
                Some(child) => child.try_wait(),
                None => break,
            }
        };

        match wait_result {
            Ok(Some(status)) => {
                let was_cancelled = cancelling_state
                    .lock()
                    .map(|cancelling| *cancelling)
                    .unwrap_or(false);
                if !status.success() && !was_cancelled {
                    emit(
                        &app,
                        &authority,
                        PiProcessEventKind::Error,
                        format!("Pi command exited with status {}", status),
                    );
                }
                break;
            }
            Ok(None) => thread::sleep(Duration::from_millis(50)),
            Err(error) => {
                emit(
                    &app,
                    &authority,
                    PiProcessEventKind::Error,
                    format!("Could not wait for Pi command: {}", error),
                );
                break;
            }
        }
    }

    if let Ok(mut child_slot) = child_state.lock() {
        *child_slot = None;
    }
    if let Ok(mut cancelling) = cancelling_state.lock() {
        *cancelling = false;
    }
    if let Ok(mut authority_slot) = authority_state.lock() {
        *authority_slot = None;
    }

    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    if mirror_mediated {
        match read_latest_pi_mirror_commit_events(&run_authority.pi_session_id, &run_authority.correlation) {
            Ok(events) => {
                for event in events {
                    emit(&app, &authority, PiProcessEventKind::Stdout, event);
                }
            }
            Err(error) => emit(
                &app,
                &authority,
                PiProcessEventKind::Stderr,
                format!("Could not read durable Mirror commit evidence: {}", error),
            ),
        }
    }

    emit(
        &app,
        &authority,
        PiProcessEventKind::Done,
        "Pi invocation finished.".to_string(),
    );
}

fn remove_provider_session_args(args: Vec<String>) -> Vec<String> {
    let mut sanitized = Vec::new();
    let mut index = 0;
    while index < args.len() {
        let arg = &args[index];
        if arg == "--session" || arg == "--session-id" {
            index += 2;
            continue;
        }
        if let Some(name) = arg.split('=').next() {
            if name == "--session" || name == "--session-id" {
                index += 1;
                continue;
            }
        }
        sanitized.push(arg.clone());
        index += 1;
    }
    sanitized
}

fn mirror_json_event_args(args: Vec<String>) -> Vec<String> {
    let mut next_args = Vec::new();
    let mut index = 0;
    let mut has_mode = false;

    while index < args.len() {
        let arg = &args[index];
        if arg == "--print" || arg == "-p" {
            index += 1;
            continue;
        }
        if arg == "--mode" {
            has_mode = true;
            next_args.push(arg.clone());
            if index + 1 < args.len() {
                next_args.push("json".to_string());
                index += 2;
                continue;
            }
        }
        next_args.push(arg.clone());
        index += 1;
    }

    if !has_mode {
        next_args.push("--mode".to_string());
        next_args.push("json".to_string());
    }

    next_args
}

fn emit(app: &AppHandle, authority: &PiProcessEventAuthority, kind: PiProcessEventKind, content: String) {
    let _ = app.emit(PI_PROCESS_EVENT, PiProcessEvent { kind, content, authority: authority.clone() });
}

fn journey_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join(JOURNEY_REGISTRY_FILE))
}

fn read_latest_pi_mirror_commit_events(
    session_id: &str,
    correlation: &TurnCorrelation,
) -> Result<Vec<String>, String> {
    let session_dir = default_pi_session_dir(&mirror_runtime_root()?)?;
    let suffix = format!("_{}.jsonl", session_id);
    let latest = fs::read_dir(&session_dir)
        .map_err(|error| format!("Could not read Pi session directory: {}", error))?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().ends_with(&suffix))
        .max_by_key(|entry| {
            entry.metadata().and_then(|metadata| metadata.modified()).unwrap_or(UNIX_EPOCH)
        });
    let Some(entry) = latest else { return Ok(Vec::new()) };
    let content = fs::read_to_string(entry.path())
        .map_err(|error| format!("Could not read the mapped Pi session: {}", error))?;
    Ok(extract_pi_mirror_commit_events(&content, correlation))
}

fn extract_pi_mirror_commit_events(content: &str, correlation: &TurnCorrelation) -> Vec<String> {
    content.lines().filter_map(|line| {
        let entry: Value = serde_json::from_str(line).ok()?;
        if entry.get("type").and_then(Value::as_str) != Some("custom") {
            return None;
        }
        let custom_type = entry.get("customType").and_then(Value::as_str)?;
        let data = entry.get("data")?;
        if data.get("schemaVersion").and_then(Value::as_str) != Some("0.1.0")
            || data.get("turnId").and_then(Value::as_str) != Some(correlation.turn_id.as_str())
            || data.get("runId").and_then(Value::as_str) != Some(correlation.run_id.as_str())
        {
            return None;
        }
        if custom_type == "nautilus_mirror_context" {
            let persona = data.get("persona").and_then(Value::as_str)?;
            if data.get("type").and_then(Value::as_str) != Some("mirror_context")
                || data.get("journeyId").and_then(Value::as_str) != Some(correlation.journey_id.as_str())
                || data.get("mode").and_then(Value::as_str) != Some("mirror")
                || persona.is_empty()
                || persona.len() > 128
                || !persona.chars().all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-')
            {
                return None;
            }
            let safe = json!({
                "type": "mirror_context",
                "schemaVersion": "0.1.0",
                "turnId": correlation.turn_id,
                "runId": correlation.run_id,
                "journeyId": correlation.journey_id,
                "mode": "mirror",
                "persona": persona,
            });
            return serde_json::to_string(&safe).ok();
        }
        if custom_type != "nautilus_mirror_commit"
            || data.get("type").and_then(Value::as_str) != Some("mirror_commit")
            || !matches!(data.get("phase").and_then(Value::as_str), Some("user" | "assistant"))
            || !matches!(data.get("status").and_then(Value::as_str), Some("committed" | "failed"))
        {
            return None;
        }
        let mut safe = serde_json::Map::new();
        for key in ["type", "schemaVersion", "turnId", "runId", "phase", "status"] {
            safe.insert(key.to_string(), data.get(key)?.clone());
        }
        for key in ["mirrorConversationId", "mirrorMessageId", "reasonCode", "piUserEntryId"] {
            if let Some(value) = data.get(key).and_then(Value::as_str).filter(|value| !value.is_empty() && value.len() <= 4096) {
                safe.insert(key.to_string(), Value::String(value.to_string()));
            }
        }
        if let Some(value) = data.get("mirrorMessageCount").and_then(Value::as_u64) {
            safe.insert("mirrorMessageCount".to_string(), Value::Number(value.into()));
        }
        if let Some(evidence) = data.get("piEvidence").and_then(Value::as_object) {
            let mut safe_evidence = serde_json::Map::new();
            for key in ["userEntryId", "assistantEntryId", "leafEntryId", "sessionFile"] {
                if let Some(value) = evidence.get(key).and_then(Value::as_str).filter(|value| !value.is_empty() && value.len() <= 4096) {
                    safe_evidence.insert(key.to_string(), Value::String(value.to_string()));
                }
            }
            if let Some(value) = evidence.get("entryCount").and_then(Value::as_u64) {
                safe_evidence.insert("entryCount".to_string(), Value::Number(value.into()));
            }
            safe.insert("piEvidence".to_string(), Value::Object(safe_evidence));
        }
        serde_json::to_string(&Value::Object(safe)).ok()
    }).collect()
}

fn read_latest_pi_session_context_stats(
    session_id: &str,
) -> Result<PiSessionContextInspection, String> {
    let session_dir = default_pi_session_dir(&mirror_runtime_root()?)?;
    if !session_dir.exists() {
        return Ok(PiSessionContextInspection { status: "missing".to_string(), snapshot: None });
    }
    let suffix = format!("_{}.jsonl", session_id);
    let latest = fs::read_dir(&session_dir)
        .map_err(|error| format!("Could not read Pi session directory: {}", error))?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().ends_with(&suffix))
        .max_by_key(|entry| {
            entry.metadata().and_then(|metadata| metadata.modified()).unwrap_or(UNIX_EPOCH)
        });
    let Some(entry) = latest else {
        return Ok(PiSessionContextInspection { status: "missing".to_string(), snapshot: None });
    };
    let content = fs::read_to_string(entry.path())
        .map_err(|error| format!("Could not read the mapped Pi session: {}", error))?;
    let snapshot = extract_context_stats_from_pi_session(&content);
    Ok(PiSessionContextInspection {
        status: if snapshot.is_some() { "available" } else { "waiting" }.to_string(),
        snapshot,
    })
}

fn extract_context_stats_from_pi_session(content: &str) -> Option<PiSessionContextSnapshot> {
    let mut latest_usage: Option<PiSessionContextSnapshot> = None;
    let mut provider_model = None;
    let mut estimated_without_usage = 0;
    let mut trailing_tokens = 0;
    let mut has_compaction = false;

    for line in content.lines() {
        let Ok(entry) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        if entry.get("type").and_then(Value::as_str) == Some("compaction") {
            has_compaction = true;
            latest_usage = None;
            trailing_tokens = 0;
            continue;
        }
        if entry.get("type").and_then(Value::as_str) != Some("message") {
            continue;
        }
        let Some(message) = entry.get("message") else {
            continue;
        };
        let estimated_tokens = estimate_pi_message_tokens(message);
        let is_assistant = message.get("role").and_then(Value::as_str) == Some("assistant");
        if is_assistant {
            if let (Some(provider), Some(model)) = (
                message.get("provider").and_then(Value::as_str),
                message.get("model").and_then(Value::as_str),
            ) {
                provider_model = Some(format!("{}/{}", provider, model));
            }
        }
        let valid_usage = is_assistant
            && !matches!(message.get("stopReason").and_then(Value::as_str), Some("aborted" | "error"))
            && message.get("usage").and_then(calculate_pi_context_tokens).is_some();
        if valid_usage {
            latest_usage = Some(PiSessionContextSnapshot {
                tokens: calculate_pi_context_tokens(message.get("usage").unwrap()).unwrap(),
                provider_model: provider_model.clone()?,
            });
            trailing_tokens = 0;
        } else if latest_usage.is_some() {
            trailing_tokens += estimated_tokens;
        } else {
            estimated_without_usage += estimated_tokens;
        }
    }

    if let Some(mut snapshot) = latest_usage {
        snapshot.tokens += trailing_tokens;
        return Some(snapshot);
    }
    if has_compaction || estimated_without_usage == 0 {
        return None;
    }
    Some(PiSessionContextSnapshot {
        tokens: estimated_without_usage,
        provider_model: provider_model?,
    })
}

fn calculate_pi_context_tokens(usage: &Value) -> Option<u64> {
    usage
        .get("totalTokens")
        .and_then(Value::as_u64)
        .filter(|tokens| *tokens > 0)
        .or_else(|| {
            let total = ["input", "output", "cacheRead", "cacheWrite"]
                .iter()
                .filter_map(|key| usage.get(*key).and_then(Value::as_u64))
                .sum::<u64>();
            (total > 0).then_some(total)
        })
}

fn estimate_pi_message_tokens(message: &Value) -> u64 {
    let role = message.get("role").and_then(Value::as_str).unwrap_or("");
    let chars = match role {
        "user" | "custom" | "toolResult" => estimate_text_image_content_chars(message.get("content")),
        "assistant" => message
            .get("content")
            .and_then(Value::as_array)
            .map(|blocks| {
                blocks.iter().map(|block| match block.get("type").and_then(Value::as_str) {
                    Some("text") => block.get("text").and_then(Value::as_str).map(str::len).unwrap_or(0),
                    Some("thinking") => block.get("thinking").and_then(Value::as_str).map(str::len).unwrap_or(0),
                    Some("toolCall") => {
                        block.get("name").and_then(Value::as_str).map(str::len).unwrap_or(0)
                            + block.get("arguments").map(|arguments| arguments.to_string().len()).unwrap_or(0)
                    }
                    _ => 0,
                }).sum::<usize>()
            })
            .unwrap_or(0),
        "bashExecution" => {
            message.get("command").and_then(Value::as_str).map(str::len).unwrap_or(0)
                + message.get("output").and_then(Value::as_str).map(str::len).unwrap_or(0)
        }
        "branchSummary" | "compactionSummary" => {
            message.get("summary").and_then(Value::as_str).map(str::len).unwrap_or(0)
        }
        _ => 0,
    };
    (chars as u64).div_ceil(4)
}

fn estimate_text_image_content_chars(content: Option<&Value>) -> usize {
    match content {
        Some(Value::String(text)) => text.len(),
        Some(Value::Array(blocks)) => blocks.iter().map(|block| match block.get("type").and_then(Value::as_str) {
            Some("text") => block.get("text").and_then(Value::as_str).map(str::len).unwrap_or(0),
            Some("image") => 4800,
            _ => 0,
        }).sum(),
        _ => 0,
    }
}

fn default_pi_session_dir(cwd: &Path) -> Result<PathBuf, String> {
    if let Some(session_dir) = std::env::var_os("PI_CODING_AGENT_SESSION_DIR") {
        return Ok(expand_home_path(PathBuf::from(session_dir))?);
    }

    let agent_dir = if let Some(agent_dir) = std::env::var_os("PI_CODING_AGENT_DIR") {
        expand_home_path(PathBuf::from(agent_dir))?
    } else {
        let home = std::env::var_os("HOME")
            .ok_or_else(|| "Could not resolve home directory for Pi sessions.".to_string())?;
        PathBuf::from(home).join(".pi").join("agent")
    };
    let encoded_cwd = cwd
        .to_string_lossy()
        .trim_start_matches(['/', '\\'])
        .replace(['/', '\\', ':'], "-");
    Ok(agent_dir
        .join("sessions")
        .join(format!("--{}--", encoded_cwd)))
}

fn expand_home_path(path: PathBuf) -> Result<PathBuf, String> {
    let value = path.to_string_lossy();
    if value == "~" || value.starts_with("~/") {
        let home = std::env::var_os("HOME")
            .ok_or_else(|| "Could not expand home directory for Pi sessions.".to_string())?;
        return Ok(if value == "~" {
            PathBuf::from(home)
        } else {
            PathBuf::from(home).join(value.trim_start_matches("~/"))
        });
    }
    Ok(path)
}

fn journey_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join(JOURNEY_PREFERENCES_FILE))
}

fn composer_drafts_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join(COMPOSER_DRAFTS_FILE))
}

fn unwrap_persisted_thread(value: &Value) -> &Value {
    value.get("thread").unwrap_or(value)
}

fn legacy_dedicated_journey_conversation_path(app: &AppHandle, journey_id: &str) -> Result<PathBuf, String> {
    let safe_journey_id = sanitize_journey_id(journey_id)?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join("dedicated-journey-conversations").join(format!("{}.json", safe_journey_id)))
}

fn dedicated_journey_conversation_path(app: &AppHandle, journey_id: &str, generation: u64) -> Result<PathBuf, String> {
    if generation == 0 { return Err("Dedicated conversation generation must be positive.".to_string()); }
    let safe_journey_id = sanitize_journey_id(journey_id)?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join("dedicated-journey-conversations").join(safe_journey_id)
        .join(format!("generation-{}.json", generation)))
}

#[tauri::command]
fn save_dedicated_journey_conversation(app: AppHandle, journey_id: String, generation: u64, payload: String) -> Result<(), String> {
    let path = dedicated_journey_conversation_path(&app, &journey_id, generation)?;
    let parsed: Value = serde_json::from_str(&payload).map_err(|error| format!("Invalid dedicated conversation payload: {}", error))?;
    let live = parsed.get("conversation").and_then(|value| value.get("liveIdentity"))
        .ok_or_else(|| "Dedicated conversation identity is missing.".to_string())?;
    if live.get("journeyId").and_then(Value::as_str) != Some(journey_id.as_str())
        || live.get("generation").and_then(Value::as_u64) != Some(generation)
        || live.get("activationReceiptActivatedAt").and_then(Value::as_str).is_none()
    {
        return Err("Dedicated conversation payload lacks dedicated authority.".to_string());
    }
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    let staged = path.with_extension("json.tmp");
    fs::write(&staged, payload).map_err(|error| error.to_string())?;
    fs::rename(staged, path).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_dedicated_journey_conversation(app: AppHandle, journey_id: String, generation: u64) -> Result<Option<String>, String> {
    let path = dedicated_journey_conversation_path(&app, &journey_id, generation)?;
    if path.exists() { return fs::read_to_string(path).map(Some).map_err(|error| error.to_string()); }
    let legacy = legacy_dedicated_journey_conversation_path(&app, &journey_id)?;
    if !legacy.exists() { return Ok(None); }
    let payload = fs::read_to_string(&legacy).map_err(|error| error.to_string())?;
    let value: Value = serde_json::from_str(&payload).map_err(|error| error.to_string())?;
    let matches = value.get("conversation").and_then(|item| item.get("liveIdentity"))
        .and_then(|live| live.get("generation")).and_then(Value::as_u64) == Some(generation);
    if !matches { return Ok(None); }
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::rename(&legacy, &path).map_err(|error| format!("Could not migrate dedicated generation projection: {}", error))?;
    Ok(Some(payload))
}

fn journey_thread_path(app: &AppHandle, journey_id: &str) -> Result<PathBuf, String> {
    let safe_journey_id = sanitize_journey_id(journey_id)?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join("journey-threads").join(format!("{}.json", safe_journey_id)))
}

fn journey_thread_operation_path(app: &AppHandle, journey_id: &str) -> Result<PathBuf, String> {
    let safe_journey_id = sanitize_journey_id(journey_id)?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join("journey-thread-operations").join(format!("{}.json", safe_journey_id)))
}

fn validate_run_authority(app: &AppHandle, authority: &RunAuthority) -> Result<(), String> {
    let home = PathBuf::from(std::env::var("HOME").map_err(|_| "HOME is unavailable.".to_string())?);
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    validate_run_authority_at(
        &app_data_dir,
        &home.join(".pi").join("agent").join("sessions"),
        authority,
    )
}

fn validate_run_authority_at(app_data_dir: &Path, global_pi_sessions_dir: &Path, authority: &RunAuthority) -> Result<(), String> {
    if authority.schema_version != "0.1.0"
        || authority.journey_id != authority.correlation.journey_id
        || authority.run_id != authority.correlation.run_id
        || authority.turn_id != authority.correlation.turn_id
        || Some(authority.thread_id.as_str()) != authority.correlation.thread_id.as_deref()
        || authority.harness_conversation_id != authority.correlation.harness_conversation_id
        || authority.generation != authority.correlation.generation
        || authority.pi_session_id != authority.correlation.pi_session_id
        || Some(authority.mirror_conversation_id.as_str()) != authority.correlation.mirror_conversation_id.as_deref()
        || Some(authority.activation_receipt_activated_at.as_str()) != authority.correlation.activation_receipt_activated_at.as_deref()
        || authority.harness_user_message_id != authority.correlation.harness_user_message_id
        || authority.harness_assistant_message_id != authority.correlation.harness_assistant_message_id
        || authority.pi_session_file.trim().is_empty()
    {
        return Err("Run authority does not match its turn correlation.".to_string());
    }
    validate_turn_correlation(&authority.correlation)?;
    validate_persisted_turn_authority_at(app_data_dir, global_pi_sessions_dir, authority)
}

fn dedicated_journey_conversation_path_at(app_data_dir: &Path, journey_id: &str, generation: u64) -> Result<PathBuf, String> {
    if generation == 0 { return Err("Dedicated conversation generation must be positive.".to_string()); }
    Ok(app_data_dir.join("dedicated-journey-conversations").join(sanitize_journey_id(journey_id)?)
        .join(format!("generation-{}.json", generation)))
}

fn journey_thread_path_at(app_data_dir: &Path, journey_id: &str) -> Result<PathBuf, String> {
    Ok(app_data_dir.join("journey-threads").join(format!("{}.json", sanitize_journey_id(journey_id)?)))
}

fn validate_persisted_turn_authority_at(app_data_dir: &Path, global_pi_sessions_dir: &Path, authority: &RunAuthority) -> Result<(), String> {
    let value = &authority.correlation;
    {
        let stored_thread: Value = serde_json::from_str(
            &fs::read_to_string(journey_thread_path_at(app_data_dir, &value.journey_id)?)
                .map_err(|error| format!("Could not read dedicated thread authority: {}", error))?,
        ).map_err(|error| format!("Could not parse dedicated thread authority: {}", error))?;
        let thread = unwrap_persisted_thread(&stored_thread);
        validate_thread_runtime_channel(thread)?;
        let active_generation = thread.get("activeGeneration").and_then(Value::as_u64);
        let generation = thread.get("generations").and_then(Value::as_array)
            .and_then(|items| items.iter().find(|item| item.get("generation").and_then(Value::as_u64) == active_generation))
            .ok_or_else(|| "Dedicated active generation is missing.".to_string())?;
        let receipt = generation.get("activationReceipt").and_then(Value::as_object)
            .ok_or_else(|| "Dedicated activation receipt is missing.".to_string())?;
        let dedicated_matches = thread.get("journeyId").and_then(Value::as_str) == Some(value.journey_id.as_str())
            && thread.get("threadId").and_then(Value::as_str) == value.thread_id.as_deref()
            && value.thread_id.as_deref() == Some(value.harness_conversation_id.as_str())
            && active_generation == Some(value.generation)
            && generation.get("status").and_then(Value::as_str) == Some("ready")
            && generation.get("piSessionId").and_then(Value::as_str) == Some(value.pi_session_id.as_str())
            && generation.get("piSessionFile").and_then(Value::as_str) == Some(authority.pi_session_file.as_str())
            && generation.get("mirrorConversationId").and_then(Value::as_str) == value.mirror_conversation_id.as_deref()
            && receipt.get("activatedAt").and_then(Value::as_str) == value.activation_receipt_activated_at.as_deref();
        if !dedicated_matches {
            return Err("Turn no longer matches the active dedicated generation.".to_string());
        }
        validate_pi_session_file_at(&authority.pi_session_file, &value.pi_session_id, global_pi_sessions_dir, app_data_dir)?;
    }
    let payload: Value = serde_json::from_str(
        &fs::read_to_string(dedicated_journey_conversation_path_at(app_data_dir, &value.journey_id, value.generation)?)
            .map_err(|error| format!("Could not read staged turn authority: {}", error))?,
    ).map_err(|error| format!("Could not parse staged turn authority: {}", error))?;
    let conversation = payload.get("conversation").and_then(Value::as_object)
        .ok_or_else(|| "Staged turn authority is missing its conversation.".to_string())?;
    let live = conversation.get("liveIdentity").and_then(Value::as_object)
        .ok_or_else(|| "Staged turn authority is missing its live identity.".to_string())?;
    let live_matches = live.get("journeyId").and_then(Value::as_str) == Some(value.journey_id.as_str())
        && live.get("harnessConversationId").and_then(Value::as_str) == Some(value.harness_conversation_id.as_str())
        && live.get("piSessionId").and_then(Value::as_str) == Some(value.pi_session_id.as_str())
        && live.get("piSessionFile").and_then(Value::as_str) == Some(authority.pi_session_file.as_str())
        && live.get("generation").and_then(Value::as_u64) == Some(value.generation)
        && live.get("activationReceiptActivatedAt").and_then(Value::as_str) == value.activation_receipt_activated_at.as_deref()
        && live.get("mirrorConversationId").and_then(Value::as_str) == value.mirror_conversation_id.as_deref();
    if !live_matches {
        return Err("Staged turn no longer matches the live conversation identity.".to_string());
    }
    let turns = conversation.get("reconciliation").and_then(|state| state.get("turns"))
        .and_then(Value::as_array).ok_or_else(|| "Staged reconciliation turns are missing.".to_string())?;
    let turn_matches = turns.iter().any(|turn| {
        turn.get("turnId").and_then(Value::as_str) == Some(value.turn_id.as_str())
            && turn.get("runId").and_then(Value::as_str) == Some(value.run_id.as_str())
    });
    if !turn_matches {
        return Err("Staged reconciliation does not contain the correlated turn.".to_string());
    }
    Ok(())
}

fn validate_turn_correlation(value: &TurnCorrelation) -> Result<(), String> {
    if value.schema_version != "0.2.0"
        || value.harness_conversation_id.trim().is_empty()
        || value.turn_id.trim().is_empty()
        || value.run_id.trim().is_empty()
        || value.harness_user_message_id.trim().is_empty()
        || value.harness_assistant_message_id.trim().is_empty()
        || value.mirror_conversation_id.as_ref().is_some_and(|id| id.trim().is_empty())
        || value.thread_id.as_ref().is_none_or(|id| id.trim().is_empty())
        || value.activation_receipt_activated_at.as_ref().is_none_or(|value| value.trim().is_empty())
        || value.mirror_conversation_id.is_none()
    {
        return Err("Turn correlation does not match the active Journey/Pi authority.".to_string());
    }
    sanitize_journey_id(&value.journey_id)?;
    sanitize_session_id(&value.pi_session_id)?;
    Ok(())
}

fn sanitize_journey_id(journey_id: &str) -> Result<String, String> {
    if !journey_id.is_empty()
        && journey_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        Ok(journey_id.to_string())
    } else {
        Err("Journey id contains unsupported characters.".to_string())
    }
}

fn sanitize_session_id(session_id: &str) -> Result<String, String> {
    if !session_id.is_empty()
        && session_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
    {
        Ok(session_id.to_string())
    } else {
        Err("Pi session id contains unsupported characters.".to_string())
    }
}

fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(url);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("rundll32");
        command.args(["url.dll,FileProtocolHandler", url]);
        command
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open external URL: {}", error))
}

fn open_path(path: &PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(path);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(path);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", &path.to_string_lossy()]);
        command
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open local reference: {}", error))
}

fn args_for_display(args: &[String]) -> String {
    args.iter()
        .map(|arg| {
            if arg.len() > 80 {
                format!("{}…", &arg[..80])
            } else {
                arg.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn write_legacy_retirement_receipt(path: &Path, receipt: &Value) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "Legacy retirement receipt path has no parent.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create retirement receipt directory: {}", error))?;
    let staged = path.with_extension("json.tmp");
    fs::write(&staged, serde_json::to_vec_pretty(receipt).map_err(|error| error.to_string())?)
        .map_err(|error| format!("Could not stage retirement receipt: {}", error))?;
    fs::rename(&staged, path).map_err(|error| format!("Could not publish retirement receipt: {}", error))
}

fn retire_legacy_parity_state_at(app_data_dir: &Path) -> Result<LegacyParityRetirementSummary, String> {
    let source_dir = app_data_dir.join("journey-conversations");
    let receipt_dir = app_data_dir.join("retired-parity-state").join("receipts");
    let mut summary = LegacyParityRetirementSummary { retired: 0, retained: 0, already_retired: 0 };
    if !source_dir.exists() { return Ok(summary); }
    let metadata = fs::symlink_metadata(&source_dir).map_err(|error| error.to_string())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("Legacy parity namespace is not a safe directory.".to_string());
    }
    let mut files = Vec::new();
    let mut directories = Vec::new();
    let mut pending_directories = vec![source_dir.clone()];
    while let Some(directory) = pending_directories.pop() {
        for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
            if metadata.file_type().is_symlink() {
                files.push(path);
            } else if metadata.is_dir() {
                directories.push(path.clone());
                pending_directories.push(path);
            } else {
                files.push(path);
            }
        }
    }
    for path in files {
        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else { summary.retained += 1; continue };
        let journey_id = if let Some(value) = file_name.strip_suffix(".json") {
            value
        } else if let Some((value, _)) = file_name.split_once(".json.") {
            value
        } else {
            continue;
        };
        if sanitize_journey_id(journey_id).is_err() { summary.retained += 1; continue; }
        let relative = path.strip_prefix(&source_dir).map_err(|_| "Legacy parity path escaped its namespace.".to_string())?;
        let receipt_name = relative.to_string_lossy().chars()
            .map(|value| if value.is_ascii_alphanumeric() || value == '-' || value == '_' { value } else { '_' })
            .collect::<String>();
        let receipt_path = receipt_dir.join(format!("{}.receipt.json", receipt_name));
        let file_metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
        let reason = if file_metadata.file_type().is_symlink() || !file_metadata.is_file() {
            Some("unsafe_file_type")
        } else {
            match fs::read_to_string(&path).ok().and_then(|payload| serde_json::from_str::<Value>(&payload).ok()) {
                Some(value) if value.get("conversation").and_then(|item| item.get("journeyId")).and_then(Value::as_str) == Some(journey_id) => None,
                Some(_) => Some("journey_authority_mismatch"),
                None => Some("invalid_record"),
            }
        };
        let retired_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
        let path_class = if relative.components().count() == 1 && file_name.ends_with(".json") {
            "journey_conversation_projection"
        } else {
            "journey_conversation_backup"
        };
        if let Some(reason) = reason {
            write_legacy_retirement_receipt(&receipt_path, &json!({
                "schemaVersion": "1.0.0", "journeyId": journey_id, "pathClass": path_class,
                "status": "retained", "reasonCode": reason, "retiredAt": retired_at
            }))?;
            summary.retained += 1;
            continue;
        }
        write_legacy_retirement_receipt(&receipt_path, &json!({
            "schemaVersion": "1.0.0", "journeyId": journey_id, "pathClass": path_class,
            "status": "approved_for_retirement", "reasonCode": "superseded_by_dedicated_thread", "retiredAt": retired_at
        }))?;
        fs::remove_file(&path).map_err(|error| format!("Could not retire legacy parity projection: {}", error))?;
        write_legacy_retirement_receipt(&receipt_path, &json!({
            "schemaVersion": "1.0.0", "journeyId": journey_id, "pathClass": path_class,
            "status": "retired", "reasonCode": "superseded_by_dedicated_thread", "retiredAt": retired_at
        }))?;
        summary.retired += 1;
    }
    directories.sort_by_key(|path| std::cmp::Reverse(path.components().count()));
    for directory in directories { let _ = fs::remove_dir(&directory); }
    Ok(summary)
}

#[tauri::command]
fn retire_legacy_parity_state(app: AppHandle) -> Result<LegacyParityRetirementSummary, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    retire_legacy_parity_state_at(&app_data_dir)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let profile = active_runtime_channel().map_err(std::io::Error::other)?;
            let app_data_root = app.path().app_data_dir().map_err(std::io::Error::other)?;
            profile
                .validate_app_identity(&app.config().identifier, &app_data_root)
                .map_err(std::io::Error::other)?;
            app.manage(profile);
            Ok(())
        })
        .manage(PiProcessState::default())
        .manage(JourneyProvisioningState::default())
        .manage(MirrorAppendOutboxState::default())
        .invoke_handler(tauri::generate_handler![
            save_dedicated_journey_conversation,
            load_dedicated_journey_conversation,
            save_journey_thread,
            load_journey_thread,
            provision_journey_thread,
            restart_journey_thread,
            load_journey_registry,
            refresh_journey_registry,
            mutate_journey_registry,
            choose_project_directory,
            load_journey_preferences,
            save_journey_preferences,
            load_composer_drafts,
            save_composer_drafts,
            load_agent_settings,
            save_agent_settings,
            list_pi_models,
            inspect_runtime_channel,
            load_journey_projections,
            list_journey_documentation,
            read_journey_document,
            choose_file_attachments,
            inspect_file_attachments,
            inspect_local_references,
            open_local_reference,
            open_external_url,
            start_pi_invocation,
            read_pi_session_context_stats,
            load_dedicated_pi_transcript,
            enqueue_mirror_append_item,
            list_mirror_append_outbox,
            append_mirror_outbox_item,
            acknowledge_mirror_append_item,
            cancel_pi_invocation,
            retire_legacy_parity_state
        ])
        .build(tauri::generate_context!())
        .expect("error while building Nautilus Harness")
        .run(|app_handle, event| {
            if matches!(event, tauri::RunEvent::Ready) {
                let profile = app_handle.state::<RuntimeChannelProfile>();
                if let Err(error) = profile.apply_macos_dock_icon() {
                    eprintln!("Nautilus runtime channel icon validation failed: {error}");
                    app_handle.exit(1);
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::{
        dedicated_native_names, enqueue_mirror_append_item_at, extract_context_stats_from_pi_session,
        extract_pi_mirror_commit_events, find_registered_journey_path,
        list_journey_documentation_at, materialize_empty_pi_session, parse_pi_session_state,
        project_complete_pi_transcript, projection_manifest_coordinates_at,
        inspect_file_attachments_at, publish_refreshed_journey_registry, read_journey_document_at,
        remove_provider_session_args, resolve_existing_local_file, retire_legacy_parity_state_at,
        unwrap_persisted_thread, validate_composer_drafts_payload, validate_external_url,
        validate_journey_registry_payload, validate_mirror_append_item, validate_pi_session_file_at,
        validate_run_authority_at, validate_turn_correlation, PiSessionContextSnapshot, RunAuthority,
        TurnCorrelation, JOURNEY_REGISTRY_FILE, FILE_ATTACHMENT_MAX_FILES, DOCUMENT_PREVIEW_MAX_BYTES,
    };
    use serde_json::{json, Value};
    use std::{
        fs,
        path::Path,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn test_root(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "nautilus-{}-{}",
            label,
            SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos(),
        ))
    }

    fn test_correlation() -> TurnCorrelation {
        TurnCorrelation {
            schema_version: "0.2.0".to_string(),
            journey_id: "journey-one".to_string(),
            thread_id: Some("thread-one".to_string()),
            harness_conversation_id: "thread-one".to_string(),
            pi_session_id: "session-one".to_string(),
            generation: 1,
            activation_receipt_activated_at: Some("2026-08-26T10:00:00Z".to_string()),
            turn_id: "turn-one".to_string(),
            run_id: "run-one".to_string(),
            harness_user_message_id: "user-one".to_string(),
            harness_assistant_message_id: "assistant-one".to_string(),
            mirror_conversation_id: Some("mirror-one".to_string()),
        }
    }

    fn test_run_authority(root: &Path) -> RunAuthority {
        let correlation = test_correlation();
        RunAuthority {
            schema_version: "0.1.0".to_string(),
            correlation,
            journey_id: "journey-one".to_string(),
            run_id: "run-one".to_string(),
            turn_id: "turn-one".to_string(),
            thread_id: "thread-one".to_string(),
            harness_conversation_id: "thread-one".to_string(),
            generation: 1,
            pi_session_id: "session-one".to_string(),
            pi_session_file: root.join("pi-sessions/session-one.jsonl").to_string_lossy().to_string(),
            mirror_conversation_id: "mirror-one".to_string(),
            activation_receipt_activated_at: "2026-08-26T10:00:00Z".to_string(),
            harness_user_message_id: "user-one".to_string(),
            harness_assistant_message_id: "assistant-one".to_string(),
        }
    }

    fn persist_run_authority_fixture(root: &Path, authority: &RunAuthority, live_receipt: &str) {
        fs::create_dir_all(root.join("journey-threads")).unwrap();
        fs::create_dir_all(root.join("dedicated-journey-conversations/journey-one")).unwrap();
        fs::create_dir_all(root.join("pi-sessions")).unwrap();
        fs::write(&authority.pi_session_file, r#"{"type":"session","id":"session-one"}"#).unwrap();
        fs::write(root.join("journey-threads/journey-one.json"), serde_json::to_vec(&json!({
            "schemaVersion":"1.0.0",
            "thread":{
                "schemaVersion":"1.0.0",
                "threadId":"thread-one",
                "journeyId":"journey-one",
                "createdAt":"2026-08-26T09:00:00Z",
                "activeGeneration":1,
                "generations":[{
                    "generation":1,
                    "status":"ready",
                    "piSessionId":"session-one",
                    "piSessionFile":authority.pi_session_file,
                    "mirrorConversationId":"mirror-one",
                    "activationReceipt":{"schemaVersion":"1.0.0","journeyId":"journey-one","threadId":"thread-one","generation":1,"piSessionId":"session-one","mirrorConversationId":"mirror-one","activatedAt":"2026-08-26T10:00:00Z"},
                    "createdAt":"2026-08-26T09:00:00Z",
                    "activatedAt":"2026-08-26T10:00:00Z"
                }]
            }
        })).unwrap()).unwrap();
        fs::write(root.join("dedicated-journey-conversations/journey-one/generation-1.json"), serde_json::to_vec(&json!({
            "schemaVersion":"1.0.0",
            "conversation":{
                "journeyId":"journey-one",
                "liveIdentity":{
                    "journeyId":"journey-one",
                    "harnessConversationId":"thread-one",
                    "piSessionId":"session-one",
                    "piSessionFile":authority.pi_session_file,
                    "generation":1,
                    "activationReceiptActivatedAt":live_receipt,
                    "mirrorConversationId":"mirror-one"
                },
                "reconciliation":{"turns":[{"turnId":"turn-one","runId":"run-one"}]}
            }
        })).unwrap()).unwrap();
    }

    #[test]
    fn publishes_only_valid_mirror_journey_registries_without_replacing_on_failure() {
        let root = test_root("registry-refresh");
        fs::create_dir_all(&root).unwrap();
        let valid = json!({
            "schemaVersion": "0.1.0", "source": "mirror", "syncedAt": "2026-08-27T00:00:00Z",
            "roots": [{"id": "root", "name": "Root", "children": [{"id": "child", "name": "Child"}]}]
        }).to_string();
        assert!(validate_journey_registry_payload(&valid).is_ok());
        let versioned = json!({
            "schemaVersion": "0.2.0", "source": "mirror", "sourceVersion": "a".repeat(64), "syncedAt": "2026-08-27T00:00:00Z",
            "roots": [{"id": "root", "nativeId": "native-root", "name": "Root", "siblingPosition": 0}]
        }).to_string();
        assert!(validate_journey_registry_payload(&versioned).is_ok());
        assert!(validate_journey_registry_payload(&json!({"schemaVersion": "0.2.0", "source": "mirror", "syncedAt": "now", "roots": []}).to_string()).is_err());
        assert_eq!(publish_refreshed_journey_registry(&root, &valid).unwrap(), valid);
        let target = root.join(JOURNEY_REGISTRY_FILE);
        let before = fs::read_to_string(&target).unwrap();
        let invalid = json!({"schemaVersion": "0.1.0", "source": "mirror", "syncedAt": "now", "roots": [
            {"id": "same", "name": "One"}, {"id": "same", "name": "Two"}
        ]}).to_string();
        assert!(publish_refreshed_journey_registry(&root, &invalid).is_err());
        assert_eq!(fs::read_to_string(target).unwrap(), before);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn accepts_only_bounded_two_message_mirror_append_items() {
        let item = json!({
            "schemaVersion":"1.0.0", "itemId":"turn-one", "journeyId":"journey-one",
            "threadId":"thread-one", "generation":1, "conversationId":"mirror-one",
            "sourceInterface":"nautilus-harness", "createdAt":"2026-08-30T10:00:00Z",
            "messages":[
                {"id":"user-one","role":"user","content":"hello","createdAt":"2026-08-30T10:00:00Z","metadata":{"sourceTurnId":"turn-one","generation":1}},
                {"id":"assistant-one","role":"assistant","content":"hi","createdAt":"2026-08-30T10:00:01Z","metadata":{"sourceTurnId":"turn-one","generation":1}}
            ]
        });
        assert!(validate_mirror_append_item(&item).is_ok());
        let mut wrong = item.clone();
        wrong["conversationId"] = Value::String("contains space".to_string());
        assert!(validate_mirror_append_item(&wrong).is_err());
        let mut duplicate = item;
        duplicate["messages"][1]["id"] = Value::String("user-one".to_string());
        assert!(validate_mirror_append_item(&duplicate).is_err());
    }

    #[test]
    fn enqueues_idempotently_and_rejects_conflicts_or_overflow_without_eviction() {
        let root = test_root("mirror-outbox");
        fs::create_dir_all(&root).unwrap();
        let path = root.join("outbox.json");
        let item = |index: usize| json!({
            "schemaVersion":"1.0.0", "itemId":format!("turn-{}", index), "journeyId":"journey-one",
            "threadId":"thread-one", "generation":1, "conversationId":"mirror-one",
            "sourceInterface":"nautilus-harness", "createdAt":"2026-08-30T10:00:00Z",
            "messages":[
                {"id":format!("user-{}", index),"role":"user","content":"hello","createdAt":"2026-08-30T10:00:00Z","metadata":{"sourceTurnId":format!("turn-{}", index),"generation":1}},
                {"id":format!("assistant-{}", index),"role":"assistant","content":"hi","createdAt":"2026-08-30T10:00:01Z","metadata":{"sourceTurnId":format!("turn-{}", index),"generation":1}}
            ]
        });
        enqueue_mirror_append_item_at(&path, item(0)).unwrap();
        enqueue_mirror_append_item_at(&path, item(0)).unwrap();
        let mut conflict = item(0);
        conflict["messages"][0]["content"] = Value::String("different".to_string());
        assert_eq!(enqueue_mirror_append_item_at(&path, conflict).unwrap_err(), "mirror_append_item_conflict");
        for index in 1..32 { enqueue_mirror_append_item_at(&path, item(index)).unwrap(); }
        assert_eq!(enqueue_mirror_append_item_at(&path, item(32)).unwrap_err(), "mirror_append_outbox_full");
        let persisted: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(persisted["items"].as_array().unwrap().len(), 32);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn derives_bounded_deterministic_native_names() {
        let first = dedicated_native_names("Livro   Liderança Soberana", 1);
        let second = dedicated_native_names("Livro   Liderança Soberana", 1);
        assert_eq!(first, second);
        assert!(first.0.contains("Nautilus"));
        assert!(first.0.chars().count() <= 80);
        assert!(first.1.chars().count() <= 100);
    }

    #[test]
    fn accepts_only_successful_native_pi_state_authority() {
        let output = br#"warning
{"type":"response","command":"get_state","success":true,"data":{"sessionId":"pi-one","sessionFile":"/sessions/pi-one.jsonl"}}
"#;
        assert_eq!(parse_pi_session_state(output).unwrap(), ("pi-one".to_string(), "/sessions/pi-one.jsonl".to_string()));
        assert!(parse_pi_session_state(br#"{"type":"response","command":"get_state","success":false}"#).is_err());
    }

    #[test]
    fn extracts_latest_valid_context_stats_after_compaction() {
        let session = [
            r#"{"type":"session","version":3,"id":"nautilus-lab"}"#,
            r#"{"type":"message","message":{"role":"assistant","provider":"openai-codex","model":"gpt-5.4-mini","stopReason":"stop","usage":{"totalTokens":9000}}}"#,
            r#"{"type":"compaction","summary":"compact"}"#,
            r#"{"type":"message","message":{"role":"assistant","provider":"openai-codex","model":"gpt-5.4-mini","stopReason":"error","usage":{"totalTokens":12000}}}"#,
            r#"{"type":"message","message":{"role":"assistant","provider":"openai-codex","model":"gpt-5.4-mini","stopReason":"stop","usage":{"input":7000,"output":500,"cacheRead":1000,"cacheWrite":0}}}"#,
        ].join("\n");

        assert_eq!(
            extract_context_stats_from_pi_session(&session),
            Some(PiSessionContextSnapshot {
                tokens: 8500,
                provider_model: "openai-codex/gpt-5.4-mini".to_string(),
            })
        );
    }

    #[test]
    fn preserves_an_empty_native_pi_session_after_rpc_settlement() {
        let root = std::env::temp_dir().join(format!("nautilus-empty-pi-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&root).unwrap();
        let file = root.join("native-session.jsonl");
        materialize_empty_pi_session("native-session", file.to_str().unwrap(), &root, Path::new("/tmp")).unwrap();
        let header: serde_json::Value = serde_json::from_str(fs::read_to_string(&file).unwrap().lines().next().unwrap()).unwrap();
        assert_eq!(header.get("type").and_then(|value| value.as_str()), Some("session"));
        assert_eq!(header.get("id").and_then(|value| value.as_str()), Some("native-session"));
        assert_eq!(fs::read_to_string(&file).unwrap().lines().count(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn validates_dedicated_pi_sessions_against_the_active_channel_app_data_root() {
        let root = test_root("development-session-root");
        let pi_sessions = root.join("com.nautilus.harness.dev/pi-sessions");
        fs::create_dir_all(&pi_sessions).unwrap();
        let session = pi_sessions.join("native-session.jsonl");
        fs::write(&session, r#"{"type":"session","id":"native-session"}"#).unwrap();

        assert!(validate_pi_session_file_at(
            session.to_str().unwrap(),
            "native-session",
            &root.join("global-pi-sessions"),
            &root.join("com.nautilus.harness.dev"),
        ).is_ok());
        assert!(validate_pi_session_file_at(
            session.to_str().unwrap(),
            "native-session",
            &root.join("global-pi-sessions"),
            &root.join("com.nautilus.harness"),
        ).is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn reads_dedicated_thread_authority_from_its_persisted_envelope() {
        let stored = json!({"schemaVersion":"1.0.0","savedAt":"2026-08-26T10:00:00Z","thread":{"activeGeneration":1}});
        assert_eq!(unwrap_persisted_thread(&stored).get("activeGeneration").and_then(|value| value.as_u64()), Some(1));
        let raw = json!({"activeGeneration":2});
        assert_eq!(unwrap_persisted_thread(&raw).get("activeGeneration").and_then(|value| value.as_u64()), Some(2));
    }

    #[test]
    fn projects_only_complete_dedicated_pi_turns_and_removes_the_runtime_wrapper() {
        let session = [
            r#"{"type":"session","id":"session-1"}"#,
            r#"{"type":"message","id":"user-1","parentId":null,"timestamp":"2026-08-26T10:00:00Z","message":{"role":"user","content":[{"type":"text","text":"[Nautilus Harness Journey authority]\nselected\n\nUser request:\nOlá\n\nFiles explicitly selected by the user\n```json\n[{\"absolutePath\":\"/tmp/file.pdf\"}]\n```"}]}}"#,
            r#"{"type":"message","id":"assistant-1","parentId":"user-1","timestamp":"2026-08-26T10:00:01Z","message":{"role":"assistant","content":[{"type":"text","text":"Resposta"}],"stopReason":"stop"}}"#,
            r#"{"type":"message","id":"user-2","parentId":"assistant-1","timestamp":"2026-08-26T10:00:02Z","message":{"role":"user","content":[{"type":"text","text":"incomplete"}]}}"#,
        ].join("\n");
        let turns = project_complete_pi_transcript(&session).unwrap();
        assert_eq!(turns.len(), 1);
        assert_eq!(turns[0].user_text, "Olá");
        assert_eq!(turns[0].assistant_text, "Resposta");
        assert_eq!(turns[0].entry_count, 2);
    }

    #[test]
    fn rejects_run_authority_that_diverges_from_stored_active_generation() {
        let root = test_root("run-authority-generation");
        let authority = test_run_authority(&root);
        persist_run_authority_fixture(&root, &authority, "2026-08-26T10:00:00Z");
        let mut divergent = authority;
        divergent.generation = 2;
        divergent.correlation.generation = 2;

        assert_eq!(
            validate_run_authority_at(&root, &root.join("global-pi-sessions"), &divergent).unwrap_err(),
            "Turn no longer matches the active dedicated generation."
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_run_authority_when_persisted_live_identity_diverges() {
        let root = test_root("run-authority-live-identity");
        let authority = test_run_authority(&root);
        persist_run_authority_fixture(&root, &authority, "2026-08-26T10:00:00Z");
        let mut divergent = authority;
        divergent.pi_session_id = "other-session".to_string();
        divergent.correlation.pi_session_id = "other-session".to_string();

        assert_eq!(
            validate_run_authority_at(&root, &root.join("global-pi-sessions"), &divergent).unwrap_err(),
            "Turn no longer matches the active dedicated generation."
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_run_authority_when_live_identity_activation_receipt_diverges() {
        let root = test_root("run-authority-live-receipt");
        let authority = test_run_authority(&root);
        persist_run_authority_fixture(&root, &authority, "2026-08-26T10:05:00Z");

        assert_eq!(
            validate_run_authority_at(&root, &root.join("global-pi-sessions"), &authority).unwrap_err(),
            "Staged turn no longer matches the live conversation identity."
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn provider_args_cannot_replace_authoritative_run_session() {
        let args = remove_provider_session_args(vec![
            "--provider".to_string(),
            "openai".to_string(),
            "--session".to_string(),
            "/tmp/wrong.jsonl".to_string(),
            "--session-id=wrong".to_string(),
            "--mode".to_string(),
            "json".to_string(),
        ]);

        assert_eq!(args, vec!["--provider", "openai", "--mode", "json"]);
    }

    #[test]
    fn validates_allowlisted_turn_correlation_against_invocation_authority() {
        let correlation = TurnCorrelation {
            schema_version: "0.2.0".to_string(),
            journey_id: "nautilus-harness".to_string(),
            thread_id: Some("harness-conversation".to_string()),
            harness_conversation_id: "harness-conversation".to_string(),
            pi_session_id: "nautilus-nautilus-harness".to_string(),
            generation: 2,
            activation_receipt_activated_at: Some("2026-08-26T10:00:00Z".to_string()),
            turn_id: "turn-1".to_string(),
            run_id: "run-1".to_string(),
            harness_user_message_id: "user-1".to_string(),
            harness_assistant_message_id: "assistant-1".to_string(),
            mirror_conversation_id: Some("mirror-1".to_string()),
        };

        assert!(validate_turn_correlation(&correlation).is_ok());
        assert!(validate_turn_correlation(&TurnCorrelation {
            journey_id: "another journey".to_string(),
            ..correlation.clone()
        }).is_err());
        let serialized = serde_json::to_value(&correlation).expect("correlation should serialize");
        assert_eq!(serialized["mirrorConversationId"], "mirror-1");

        let session = [
            r#"{"type":"session","id":"nautilus-nautilus-harness"}"#,
            r#"{"type":"custom","customType":"nautilus_mirror_commit","data":{"type":"mirror_commit","schemaVersion":"0.1.0","turnId":"other-turn","runId":"run-1","phase":"user","status":"committed"}}"#,
            r#"{"type":"custom","customType":"nautilus_mirror_context","data":{"type":"mirror_context","schemaVersion":"0.1.0","turnId":"turn-1","runId":"run-1","journeyId":"nautilus-harness","mode":"mirror","persona":"product-designer","privateContext":"must not escape"}}"#,
            r#"{"type":"custom","customType":"nautilus_mirror_commit","data":{"type":"mirror_commit","schemaVersion":"0.1.0","turnId":"turn-1","runId":"run-1","phase":"assistant","status":"committed","mirrorConversationId":"mirror-1","mirrorMessageId":"message-1","mirrorMessageCount":2,"injectedContent":"must not escape","piEvidence":{"userEntryId":"user-entry","assistantEntryId":"assistant-entry","leafEntryId":"assistant-entry","entryCount":4,"sessionFile":"/tmp/session.jsonl","secret":"must not escape"}}}"#,
        ].join("\n");
        let events = extract_pi_mirror_commit_events(&session, &correlation);
        assert_eq!(events.len(), 2);
        assert!(events[0].contains("\"persona\":\"product-designer\""));
        assert!(events[1].contains("\"mirrorMessageId\":\"message-1\""));
        assert!(!events.join("\n").contains("privateContext"));
        assert!(!events.join("\n").contains("injectedContent"));
        assert!(!events.join("\n").contains("secret"));
    }

    #[test]
    fn resolves_documentation_authority_from_the_registered_journey() {
        let roots = vec![json!({
            "id": "parent",
            "projectPath": "/journeys/parent",
            "children": [{
                "id": "selected",
                "projectPath": "/journeys/selected"
            }]
        })];
        assert_eq!(find_registered_journey_path(&roots, "selected").as_deref(), Some("/journeys/selected"));
        assert_eq!(find_registered_journey_path(&roots, "unknown"), None);
    }

    #[test]
    fn projects_a_deterministic_bounded_documentation_tree() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-doc-tree-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(&directory).unwrap();

        let empty = list_journey_documentation_at(&directory).unwrap();
        assert_eq!(empty.status, "empty");
        fs::create_dir_all(directory.join("guides")).unwrap();
        fs::create_dir_all(directory.join("node_modules/package")).unwrap();
        fs::write(directory.join(".env"), "SECRET=not-visible").unwrap();
        fs::write(directory.join("node_modules/package/index.js"), "generated").unwrap();
        fs::write(directory.join("z.md"), "# Z").unwrap();
        fs::write(directory.join("Alpha.txt"), "alpha").unwrap();
        fs::write(directory.join("guides/start.md"), "# Start").unwrap();

        let tree = list_journey_documentation_at(&directory).unwrap();
        assert_eq!(tree.status, "ready");
        assert_eq!(tree.root_label, directory.file_name().unwrap().to_string_lossy());
        assert_eq!(tree.items.iter().map(|node| node.name.as_str()).collect::<Vec<_>>(), vec!["guides", "Alpha.txt", "z.md"]);
        assert_eq!(tree.items[0].children[0].relative_path, "guides/start.md");
        assert!(!tree.items.iter().any(|node| node.name == ".env" || node.name == "node_modules"));
        let json = serde_json::to_string(&tree).unwrap();
        assert!(!json.contains(&directory.to_string_lossy().to_string()));
        assert!(!json.contains("SECRET"));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_workspace_hierarchies_beyond_the_depth_limit() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-doc-depth-{}-{}", std::process::id(), nonce));
        let mut nested = directory.clone();
        for index in 0..18 {
            nested = nested.join(format!("level-{}", index));
        }
        fs::create_dir_all(&nested).unwrap();
        assert!(list_journey_documentation_at(&directory).is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn reads_only_bounded_supported_document_content() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-doc-content-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("readme.md"), "# Safe").unwrap();
        fs::write(directory.join("image.png"), [0_u8, 1, 2]).unwrap();
        fs::write(directory.join("invalid.txt"), [0xff_u8, 0xfe]).unwrap();
        fs::write(directory.join("large.txt"), vec![b'x'; DOCUMENT_PREVIEW_MAX_BYTES as usize + 1]).unwrap();

        let ready = read_journey_document_at(&directory, "readme.md").unwrap();
        assert_eq!(ready.status, "ready");
        assert_eq!(ready.preview_kind, "markdown");
        assert_eq!(ready.content.as_deref(), Some("# Safe"));
        assert_eq!(read_journey_document_at(&directory, "image.png").unwrap().reason.as_deref(), Some("unsupported_type"));
        assert_eq!(read_journey_document_at(&directory, "invalid.txt").unwrap().reason.as_deref(), Some("invalid_utf8"));
        assert_eq!(read_journey_document_at(&directory, "large.txt").unwrap().reason.as_deref(), Some("oversized"));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_document_traversal_and_absolute_paths() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-doc-traversal-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(&directory).unwrap();
        let outside = directory.parent().unwrap().join(format!("outside-{}.md", nonce));
        fs::write(&outside, "outside").unwrap();
        assert!(read_journey_document_at(&directory, &format!("../outside-{}.md", nonce)).is_err());
        assert!(read_journey_document_at(&directory, "/tmp/outside.md").is_err());
        assert!(read_journey_document_at(&directory, ".env").is_err());
        assert!(read_journey_document_at(&directory, "node_modules/package/index.js").is_err());
        assert!(read_journey_document_at(&directory, "").is_err());
        fs::remove_file(outside).unwrap();
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn omits_symbolic_links_from_documentation_projection() {
        use std::os::unix::fs::symlink;
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-doc-symlink-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(&directory).unwrap();
        let outside = directory.parent().unwrap().join(format!("outside-symlink-{}.md", nonce));
        fs::write(&outside, "outside").unwrap();
        symlink(&outside, directory.join("escape.md")).unwrap();
        symlink(&directory, directory.join("loop")).unwrap();

        let tree = list_journey_documentation_at(&directory).unwrap();
        assert_eq!(tree.status, "empty");
        assert!(read_journey_document_at(&directory, "escape.md").is_err());
        fs::remove_file(outside).unwrap();
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn inspects_arbitrary_file_formats_as_path_references() {
        let directory = test_root("file-attachments");
        fs::create_dir_all(&directory).unwrap();
        let pdf = directory.join("reference.pdf");
        let archive = directory.join("archive.zip");
        fs::write(&pdf, b"%PDF-not-parsed").unwrap();
        fs::write(&archive, [0_u8, 1, 2, 3]).unwrap();

        let response = inspect_file_attachments_at("journey-a", &[archive.clone(), pdf.clone()]).unwrap();
        assert_eq!(response.schema_version, "0.2.0");
        assert_eq!(response.max_files, FILE_ATTACHMENT_MAX_FILES);
        assert_eq!(response.attachments.len(), 2);
        assert!(response.attachments.iter().all(|item| item.kind == "file" && item.thumbnail.is_none()));
        assert!(response.attachments.iter().all(|item| Path::new(&item.absolute_path).is_absolute()));
        assert!(response.attachments.iter().all(|item| item.attachment_id.starts_with("file-")));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn creates_a_bounded_png_thumbnail_for_selected_images() {
        let directory = test_root("image-attachment");
        fs::create_dir_all(&directory).unwrap();
        let image_path = directory.join("photo.png");
        image::RgbaImage::from_pixel(640, 320, image::Rgba([12, 34, 56, 255])).save(&image_path).unwrap();

        let response = inspect_file_attachments_at("journey-a", &[image_path]).unwrap();
        let image = &response.attachments[0];
        let thumbnail = image.thumbnail.as_ref().unwrap();
        assert_eq!(image.kind, "image");
        assert!(thumbnail.data_url.starts_with("data:image/png;base64,"));
        assert!(thumbnail.width <= 256 && thumbnail.height <= 256);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_directories_duplicates_and_excessive_file_counts_atomically() {
        let directory = test_root("invalid-file-attachments");
        fs::create_dir_all(&directory).unwrap();
        let file = directory.join("file.bin");
        fs::write(&file, [1_u8]).unwrap();
        assert!(inspect_file_attachments_at("journey-a", &[directory.clone()]).is_err());
        assert!(inspect_file_attachments_at("journey-a", &[file.clone(), file]).is_err());
        assert!(inspect_file_attachments_at("", &[]).is_err());
        let too_many = (0..=FILE_ATTACHMENT_MAX_FILES).map(|index| {
            let path = directory.join(format!("{}.bin", index));
            fs::write(&path, [1_u8]).unwrap();
            path
        }).collect::<Vec<_>>();
        assert!(inspect_file_attachments_at("journey-a", &too_many).is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn reads_only_fixed_projection_coordinates_from_the_journey_manifest() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-projections-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(directory.join(".mirror/projections")).unwrap();
        fs::write(directory.join(".mirror/projections/current.json"), serde_json::to_vec(&json!({
            "contractVersion": "1.0",
            "schemaVersion": "1",
            "journeyId": "selected",
            "projections": {
                "ariad:operational": {},
                "nautilus-synthesis:tactical": {}
            }
        })).unwrap()).unwrap();
        let coordinates = projection_manifest_coordinates_at(&directory, "selected").unwrap();
        assert!(coordinates.contains("ariad:operational"));
        assert!(coordinates.contains("nautilus-synthesis:tactical"));
        assert!(!coordinates.contains("nautilus-synthesis:strategic"));
        assert!(projection_manifest_coordinates_at(&directory, "other").is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symbolic_link_projection_manifests() {
        use std::os::unix::fs::symlink;
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-projection-link-{}-{}", std::process::id(), nonce));
        let outside = directory.parent().unwrap().join(format!("projection-outside-{}.json", nonce));
        fs::create_dir_all(directory.join(".mirror/projections")).unwrap();
        fs::write(&outside, "{}").unwrap();
        symlink(&outside, directory.join(".mirror/projections/current.json")).unwrap();
        assert!(projection_manifest_coordinates_at(&directory, "selected").is_err());
        fs::remove_file(outside).unwrap();
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn retires_only_valid_legacy_harness_projections_after_a_bounded_receipt() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("nautilus-parity-retirement-{}", nonce));
        let legacy = root.join("journey-conversations");
        let pi = root.join("pi-sessions/native.jsonl");
        let mirror = root.join("mirror-native-evidence.txt");
        fs::create_dir_all(&legacy).unwrap();
        fs::create_dir_all(pi.parent().unwrap()).unwrap();
        fs::write(&pi, "native-pi-history").unwrap();
        fs::write(&mirror, "native-mirror-history").unwrap();
        fs::write(legacy.join("valid.json"), serde_json::to_vec(&json!({
            "schemaVersion": "0.5.0", "conversation": {"journeyId": "valid", "messages": [{"content": "private"}]}
        })).unwrap()).unwrap();
        fs::write(legacy.join("invalid.json"), "not-json").unwrap();
        fs::create_dir_all(legacy.join("backups/old")).unwrap();
        fs::write(legacy.join("backups/old/valid.json"), serde_json::to_vec(&json!({
            "schemaVersion": "0.4.0", "conversation": {"journeyId": "valid"}
        })).unwrap()).unwrap();

        let first = retire_legacy_parity_state_at(&root).unwrap();
        assert_eq!(first.retired, 2);
        assert_eq!(first.retained, 1);
        assert!(!legacy.join("valid.json").exists());
        assert!(legacy.join("invalid.json").exists());
        let receipt = fs::read_to_string(root.join("retired-parity-state/receipts/valid_json.receipt.json")).unwrap();
        assert!(receipt.contains("superseded_by_dedicated_thread"));
        assert!(!receipt.contains("private"));
        assert_eq!(fs::read_to_string(&pi).unwrap(), "native-pi-history");
        assert_eq!(fs::read_to_string(&mirror).unwrap(), "native-mirror-history");

        let second = retire_legacy_parity_state_at(&root).unwrap();
        assert_eq!(second.retired, 0);
        assert_eq!(second.retained, 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn retains_symbolic_link_legacy_state_without_following_it() {
        use std::os::unix::fs::symlink;
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("nautilus-parity-link-{}", nonce));
        let legacy = root.join("journey-conversations");
        let outside = root.join("outside.json");
        fs::create_dir_all(&legacy).unwrap();
        fs::write(&outside, "protected").unwrap();
        symlink(&outside, legacy.join("linked.json")).unwrap();
        let summary = retire_legacy_parity_state_at(&root).unwrap();
        assert_eq!(summary.retained, 1);
        assert_eq!(fs::read_to_string(&outside).unwrap(), "protected");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn accepts_bounded_http_urls_including_loopback() {
        assert!(validate_external_url("https://example.com/docs").is_ok());
        assert!(validate_external_url("http://127.0.0.1:8012/").is_ok());
        assert!(validate_external_url("http://localhost:8012/").is_ok());
        assert!(validate_external_url("file:///tmp/private").is_err());
        assert!(validate_external_url("javascript:alert(1)").is_err());
        assert!(validate_external_url("errado/incompleto").is_err());
    }

    #[test]
    fn verifies_only_existing_local_files() {
        let root = test_root("local-reference-inspection");
        fs::create_dir_all(root.join("docs")).unwrap();
        fs::write(root.join("docs/real.md"), "real").unwrap();

        assert!(resolve_existing_local_file("docs/real.md", Some(root.to_string_lossy().as_ref())).is_ok());
        assert!(resolve_existing_local_file("docs/missing.md", Some(root.to_string_lossy().as_ref())).is_err());
        assert!(resolve_existing_local_file("docs", Some(root.to_string_lossy().as_ref())).is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn validates_bounded_versioned_composer_drafts() {
        let valid = json!({
            "schemaVersion": "1.0.0",
            "drafts": {"journey-a": "draft text"},
            "savedAt": "2026-08-30T15:00:00Z"
        }).to_string();
        assert!(validate_composer_drafts_payload(&valid).is_ok());

        let oversized = json!({
            "schemaVersion": "1.0.0",
            "drafts": {"journey-a": "x".repeat(51_201)},
            "savedAt": "2026-08-30T15:00:00Z"
        }).to_string();
        assert!(validate_composer_drafts_payload(&oversized).is_err());
        assert!(validate_composer_drafts_payload("{bad-json").is_err());
    }
}
