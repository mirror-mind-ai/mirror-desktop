use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};

const PI_PROCESS_EVENT: &str = "nautilus-pi-process";
const JOURNEY_REGISTRY_FILE: &str = "journey-registry.json";
const JOURNEY_PREFERENCES_FILE: &str = "journey-preferences.json";

#[derive(Default)]
struct PiProcessState {
    child: Arc<Mutex<Option<Child>>>,
    cancelling: Arc<Mutex<bool>>,
}

#[derive(Default)]
struct ExternalPiObservationState {
    files: Arc<Mutex<HashMap<String, CachedExternalPiFile>>>,
}

#[derive(Clone)]
struct CachedExternalPiFile {
    fingerprint: ExternalPiFileFingerprint,
    content: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
struct PiProcessEvent {
    kind: PiProcessEventKind,
    content: String,
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
    harness_conversation_id: String,
    pi_session_id: String,
    generation: u64,
    turn_id: String,
    run_id: String,
    harness_user_message_id: String,
    harness_assistant_message_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    mirror_conversation_id: Option<String>,
}

#[derive(Clone, Deserialize, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ExternalPiFileFingerprint {
    session_file: String,
    size: u64,
    modified_ms: u64,
    file_id: u64,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ExternalPiProjectedTurn {
    user_entry_id: String,
    assistant_entry_id: String,
    user_text: String,
    assistant_text: String,
    started_at: String,
    committed_at: String,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ExternalPiInspection {
    status: String,
    journey_id: String,
    pi_session_id: String,
    generation: u64,
    session_file: String,
    fingerprint: ExternalPiFileFingerprint,
    base_leaf_entry_id: String,
    leaf_entry_id: Option<String>,
    entry_count: Option<u64>,
    observed_entry_ids: Option<Vec<String>>,
    ancestor_entry_ids: Option<Vec<String>>,
    turns: Option<Vec<ExternalPiProjectedTurn>>,
    reason_code: Option<String>,
}

#[derive(Clone, Deserialize, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct MirrorSnapshotFingerprint {
    conversation_id: String,
    message_count: u64,
    last_message_id: String,
    updated_at: Option<String>,
}

#[derive(Clone, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MirrorObservedMessage {
    id: String,
    role: String,
    content: String,
    created_at: String,
    boundary_truncated: Option<bool>,
}

#[derive(Clone, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MirrorInspectionPayload {
    status: String,
    journey_id: String,
    conversation_id: String,
    base_message_id: String,
    base_message_count: u64,
    fingerprint: MirrorSnapshotFingerprint,
    messages: Option<Vec<MirrorObservedMessage>>,
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
fn save_journey_conversation(
    app: AppHandle,
    journey_id: String,
    payload: String,
) -> Result<(), String> {
    if journey_id.trim().is_empty() {
        return Err("Journey id is required.".to_string());
    }
    let path = journey_conversation_path(&app, &journey_id)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!("Could not create conversation storage directory: {}", error)
        })?;
    }
    fs::write(path, payload)
        .map_err(|error| format!("Could not save Journey conversation: {}", error))
}

#[tauri::command]
fn load_journey_conversation(app: AppHandle, journey_id: String) -> Result<Option<String>, String> {
    if journey_id.trim().is_empty() {
        return Err("Journey id is required.".to_string());
    }
    let path = journey_conversation_path(&app, &journey_id)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("Could not load Journey conversation: {}", error))
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

fn harness_root() -> Result<PathBuf, String> {
    Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Could not resolve Harness root.".to_string())?
        .to_path_buf())
}

fn mirror_runtime_root() -> Result<PathBuf, String> {
    let mirror_root = PathBuf::from("/Users/alissonvale/mirror");
    if mirror_root.exists() {
        Ok(mirror_root)
    } else {
        harness_root()
    }
}

fn mirror_import_script_path() -> Result<PathBuf, String> {
    Ok(harness_root()?
        .join("scripts")
        .join("export_mirror_bootstrap.py"))
}

fn mirror_inspection_script_path() -> Result<PathBuf, String> {
    Ok(harness_root()?
        .join("scripts")
        .join("inspect_mirror_conversation.py"))
}

#[tauri::command]
fn list_mirror_conversations(journey_id: String) -> Result<String, String> {
    sanitize_journey_id(&journey_id)?;
    let output = Command::new("python3")
        .arg(mirror_import_script_path()?)
        .arg("--journey-id")
        .arg(&journey_id)
        .arg("--list-conversations")
        .output()
        .map_err(|error| format!("Could not list Mirror conversations: {}", error))?;

    if !output.status.success() {
        return Err(format!(
            "Could not list Mirror conversations: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
fn generate_mirror_conversation_title(
    journey_id: String,
    conversation_id: String,
) -> Result<String, String> {
    sanitize_journey_id(&journey_id)?;
    let output = Command::new("python3")
        .arg(mirror_import_script_path()?)
        .arg("--journey-id")
        .arg(&journey_id)
        .arg("--conversation-id")
        .arg(&conversation_id)
        .arg("--generate-conversation-title")
        .output()
        .map_err(|error| format!("Could not generate Mirror conversation title: {}", error))?;

    if !output.status.success() {
        return Err(format!(
            "Could not generate Mirror conversation title: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
fn reload_journey_from_mirror(
    journey_id: String,
    conversation_id: Option<String>,
) -> Result<String, String> {
    sanitize_journey_id(&journey_id)?;
    let mut command = Command::new("python3");
    command
        .arg(mirror_import_script_path()?)
        .arg("--journey-id")
        .arg(&journey_id)
        .arg("--message-limit")
        .arg("80");
    if let Some(conversation_id) = conversation_id {
        command.arg("--conversation-id").arg(conversation_id);
    }
    let output = command
        .output()
        .map_err(|error| format!("Could not reload Journey from Mirror: {}", error))?;

    if !output.status.success() {
        return Err(format!(
            "Could not reload Journey from Mirror: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
async fn inspect_mirror_conversation_activity(
    journey_id: String,
    conversation_id: String,
    base_message_id: String,
    base_message_count: u64,
) -> Result<String, String> {
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    if conversation_id.trim().is_empty() || base_message_id.trim().is_empty() {
        return Err("Mirror observation requires exact conversation and cursor ids.".to_string());
    }
    tauri::async_runtime::spawn_blocking(move || {
        run_mirror_inspection(
            &safe_journey_id,
            &conversation_id,
            &base_message_id,
            base_message_count,
        )
    })
    .await
    .map_err(|error| format!("Could not inspect Mirror activity: {}", error))?
}

#[tauri::command]
fn reconcile_mirror_conversation(
    app: AppHandle,
    state: State<'_, PiProcessState>,
    journey_id: String,
    expected_generation: u64,
    expected_fingerprint: MirrorSnapshotFingerprint,
    resolution_mode: String,
    provider: String,
    model: String,
) -> Result<String, String> {
    ensure_pi_idle(&state)?;
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    if provider.trim().is_empty() || model.trim().is_empty() {
        return Err("Provider and model are required for Mirror reconciliation hydration.".to_string());
    }
    let conversation_path = journey_conversation_path(&app, &safe_journey_id)?;
    let original_payload = fs::read_to_string(&conversation_path)
        .map_err(|error| format!("Could not read Mirror reconciliation authority: {}", error))?;
    let mut payload: Value = serde_json::from_str(&original_payload)
        .map_err(|_| "Persisted Mirror reconciliation authority is invalid.".to_string())?;
    let previous_saved_at = payload.get("savedAt").and_then(Value::as_str)
        .unwrap_or("1970-01-01T00:00:00.000Z").to_string();
    let conversation = payload.get_mut("conversation").and_then(Value::as_object_mut)
        .ok_or_else(|| "Persisted Mirror reconciliation conversation is missing.".to_string())?;
    let live = conversation.get("liveIdentity").and_then(Value::as_object)
        .ok_or_else(|| "Mirror reconciliation live identity is missing.".to_string())?;
    let session_id = live.get("piSessionId").and_then(Value::as_str)
        .ok_or_else(|| "Mirror reconciliation Pi session id is missing.".to_string())?.to_string();
    let mirror_conversation_id = live.get("mirrorConversationId").and_then(Value::as_str)
        .ok_or_else(|| "Mirror reconciliation requires a mapped Mirror conversation.".to_string())?.to_string();
    let harness_conversation_id = live.get("harnessConversationId").and_then(Value::as_str)
        .ok_or_else(|| "Harness conversation id is missing.".to_string())?.to_string();
    if live.get("journeyId").and_then(Value::as_str) != Some(safe_journey_id.as_str())
        || live.get("generation").and_then(Value::as_u64) != Some(expected_generation)
        || expected_fingerprint.conversation_id != mirror_conversation_id
    {
        return Err("Mirror reconciliation authority changed before approval.".to_string());
    }
    let reconciliation = conversation.get("reconciliation").and_then(Value::as_object)
        .ok_or_else(|| "Mirror reconciliation ledger is missing.".to_string())?;
    let classification = reconciliation.get("classification").and_then(Value::as_str);
    let independent_review = resolution_mode == "independent_review";
    if !independent_review && resolution_mode != "mirror_only" {
        return Err("Unsupported Mirror reconciliation resolution mode.".to_string());
    }
    if (!independent_review && classification != Some("mirror_advanced"))
        || (independent_review && classification != Some("both_advanced"))
    {
        return Err("Mirror reconciliation state no longer matches the reviewed action.".to_string());
    }
    if independent_review {
        let advancement = reconciliation.get("advancement").and_then(Value::as_object)
            .ok_or_else(|| "Independent advancement evidence is missing.".to_string())?;
        let mirror_advance = advancement.get("mirror").and_then(Value::as_object)
            .ok_or_else(|| "Reviewed Mirror advancement evidence is missing.".to_string())?;
        if advancement.get("pi").and_then(Value::as_object).is_none()
            || mirror_advance.get("lastMessageId").and_then(Value::as_str) != Some(expected_fingerprint.last_message_id.as_str())
            || mirror_advance.get("messageCount").and_then(Value::as_u64) != Some(expected_fingerprint.message_count)
        {
            return Err("Independent advancement evidence changed before approval.".to_string());
        }
    }
    let checkpoints = reconciliation.get("checkpoints").and_then(Value::as_object)
        .ok_or_else(|| "Mirror reconciliation checkpoints are missing.".to_string())?;
    let mirror_checkpoint = checkpoints.get("mirror").and_then(Value::as_object)
        .ok_or_else(|| "Mirror checkpoint is missing.".to_string())?;
    let base_message_id = mirror_checkpoint.get("lastMessageId").and_then(Value::as_str)
        .ok_or_else(|| "Mirror checkpoint cursor is missing.".to_string())?.to_string();
    let base_message_count = mirror_checkpoint.get("messageCount").and_then(Value::as_u64)
        .ok_or_else(|| "Mirror checkpoint count is missing.".to_string())?;
    let pi_checkpoint = checkpoints.get("pi").and_then(Value::as_object)
        .ok_or_else(|| "Pi checkpoint is missing.".to_string())?;
    let old_session_file = pi_checkpoint.get("sessionFile").and_then(Value::as_str)
        .ok_or_else(|| "Exact Pi session file is missing.".to_string())?.to_string();
    validate_pi_session_file(&old_session_file, &session_id)?;

    let fresh: MirrorInspectionPayload = serde_json::from_str(&run_mirror_inspection(
        &safe_journey_id, &mirror_conversation_id, &base_message_id, base_message_count,
    )?).map_err(|_| "Mirror reconciliation observation is invalid.".to_string())?;
    if fresh.status != "advanced"
        || fresh.journey_id != safe_journey_id
        || fresh.conversation_id != mirror_conversation_id
        || fresh.base_message_id != base_message_id
        || fresh.base_message_count != base_message_count
        || fresh.fingerprint != expected_fingerprint
    {
        return Err("Mirror conversation changed after preview; review it again.".to_string());
    }
    let mirror_messages = fresh.messages
        .ok_or_else(|| "Mirror reconciliation has no eligible messages.".to_string())?;
    validate_mirror_reconciliation_messages(&mirror_messages)?;

    let messages = conversation.get_mut("messages").and_then(Value::as_array_mut)
        .ok_or_else(|| "Persisted Harness messages are missing.".to_string())?;
    if !independent_review {
        for message in &mirror_messages {
            let harness_id = format!("mirror-{}", message.id);
            if messages.iter().any(|current| current.get("id").and_then(Value::as_str) == Some(harness_id.as_str())) {
                return Err("Mirror reconciliation message was already materialized.".to_string());
            }
            messages.push(json!({
                "id": harness_id,
                "role": message.role,
                "content": message.content,
                "createdAt": message.created_at,
            }));
        }
    }
    let new_generation = expected_generation + 1;
    let saved_at = expected_fingerprint.updated_at.clone().unwrap_or(previous_saved_at);
    let session_dir = default_pi_session_dir(&mirror_runtime_root()?)?;
    fs::create_dir_all(&session_dir).map_err(|error| format!("Could not create Pi session directory: {}", error))?;
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?.as_nanos();
    let target_session = session_dir.join(format!("mirror-reconcile-{}_{}.jsonl", nonce, session_id));
    let staged_session = session_dir.join(format!(".mirror-reconcile-{}-{}.jsonl.tmp", session_id, nonce));
    let session_content = build_hydrated_pi_session(&session_id, &saved_at, messages, provider.trim(), model.trim())?;
    fs::write(&staged_session, session_content)
        .map_err(|error| format!("Could not stage reconciled Pi session: {}", error))?;

    let message_count = messages.len() as u64;
    let final_harness_id = messages.last().and_then(|message| message.get("id")).and_then(Value::as_str)
        .ok_or_else(|| "Reconciled Harness transcript has no final message.".to_string())?.to_string();
    let pi_leaf = format!("import-message-{}", message_count);
    let session_file = target_session.to_string_lossy().to_string();
    conversation.insert("liveIdentity".to_string(), json!({
        "schemaVersion": "0.1.0",
        "journeyId": safe_journey_id,
        "harnessConversationId": harness_conversation_id,
        "piSessionId": session_id,
        "mirrorConversationId": mirror_conversation_id,
        "generation": new_generation,
        "origin": "mirror_reconciliation",
    }));
    conversation.insert("reconciliation".to_string(), json!({
        "schemaVersion": "0.1.0",
        "authority": {
            "journeyId": safe_journey_id,
            "harnessConversationId": harness_conversation_id,
            "piSessionId": session_id,
            "generation": new_generation,
            "mirrorConversationId": mirror_conversation_id,
        },
        "checkpoints": {
            "harness": {
                "lastMessageId": final_harness_id,
                "lastTurnId": if independent_review {
                    format!("reviewed-convergence-{}", expected_fingerprint.last_message_id)
                } else {
                    format!("mirror-reconciliation-{}", expected_fingerprint.last_message_id)
                },
                "messageCount": message_count,
            },
            "pi": { "leafEntryId": pi_leaf, "entryCount": message_count + 1, "sessionFile": session_file },
            "mirror": {
                "conversationId": mirror_conversation_id,
                "lastMessageId": expected_fingerprint.last_message_id,
                "messageCount": expected_fingerprint.message_count,
                "updatedAt": expected_fingerprint.updated_at,
            },
        },
        "turns": [],
        "advancement": {},
        "classification": "in_sync",
        "classifiedAt": saved_at,
        "reasonCodes": ["explicit_hydration_baseline"],
    }));
    conversation.remove("authoritativeContextStats");
    if let Some(root) = payload.as_object_mut() {
        root.insert("schemaVersion".to_string(), Value::String("0.5.0".to_string()));
        root.insert("savedAt".to_string(), Value::String(saved_at));
    }
    let next_payload = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())? + "\n";
    let conversation_parent = conversation_path.parent().ok_or_else(|| "Conversation path has no parent.".to_string())?;
    let staged_conversation = conversation_parent.join(format!(".mirror-reconcile-{}-{}.json.tmp", safe_journey_id, nonce));
    fs::write(&staged_conversation, &next_payload)
        .map_err(|error| format!("Could not stage reconciled conversation: {}", error))?;

    activate_reconciled_files(
        Path::new(&old_session_file), &staged_session, &target_session,
        &conversation_path, &staged_conversation, nonce,
    )?;
    Ok(next_payload)
}

fn validate_mirror_reconciliation_messages(messages: &[MirrorObservedMessage]) -> Result<(), String> {
    if messages.is_empty() || messages.len() % 2 != 0 {
        return Err("Mirror reconciliation requires complete user/assistant turns.".to_string());
    }
    for (index, message) in messages.iter().enumerate() {
        let expected_role = if index % 2 == 0 { "user" } else { "assistant" };
        if message.role != expected_role || message.content.trim().is_empty()
            || message.boundary_truncated.unwrap_or(false)
            || message.content.ends_with("\n[… truncated]")
            || (message.role == "assistant" && message.content.contains("\n\n---\n\n"))
        {
            return Err("Mirror reconciliation contains unsupported or incomplete records.".to_string());
        }
    }
    Ok(())
}

fn activate_reconciled_files(
    old_session: &Path,
    staged_session: &Path,
    target_session: &Path,
    conversation: &Path,
    staged_conversation: &Path,
    nonce: u128,
) -> Result<(), String> {
    let session_backup = old_session.with_extension(format!("jsonl.mirror-reconcile-{}.bak", nonce));
    let conversation_backup = conversation.with_extension(format!("json.mirror-reconcile-{}.bak", nonce));
    fs::rename(old_session, &session_backup)
        .map_err(|error| format!("Could not preserve previous Pi session: {}", error))?;
    if let Err(error) = fs::rename(staged_session, target_session) {
        let _ = fs::rename(&session_backup, old_session);
        return Err(format!("Could not activate reconciled Pi session: {}", error));
    }
    if let Err(error) = fs::rename(conversation, &conversation_backup) {
        let _ = fs::remove_file(target_session);
        let _ = fs::rename(&session_backup, old_session);
        return Err(format!("Could not preserve previous Harness conversation: {}", error));
    }
    if let Err(error) = fs::rename(staged_conversation, conversation) {
        let _ = fs::remove_file(target_session);
        let _ = fs::rename(&conversation_backup, conversation);
        let _ = fs::rename(&session_backup, old_session);
        return Err(format!("Could not activate reconciled Harness conversation: {}", error));
    }
    Ok(())
}

fn run_mirror_inspection(
    journey_id: &str,
    conversation_id: &str,
    base_message_id: &str,
    base_message_count: u64,
) -> Result<String, String> {
    let output = Command::new("python3")
        .arg(mirror_inspection_script_path()?)
        .arg("--journey-id").arg(journey_id)
        .arg("--conversation-id").arg(conversation_id)
        .arg("--base-message-id").arg(base_message_id)
        .arg("--base-message-count").arg(base_message_count.to_string())
        .output()
        .map_err(|error| format!("Could not run Mirror observation: {}", error))?;
    if !output.status.success() {
        return Err(format!(
            "Could not inspect Mirror conversation: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str::<Value>(&value)
        .map_err(|_| "Mirror observation returned invalid structured evidence.".to_string())?;
    Ok(value)
}

#[tauri::command]
fn open_local_reference(path: String, base_path: Option<String>) -> Result<(), String> {
    if path.trim().is_empty()
        || path.contains('\0')
        || path.starts_with("http://")
        || path.starts_with("https://")
    {
        return Err("Unsupported local reference.".to_string());
    }

    let harness_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Could not resolve Harness root.".to_string())?
        .canonicalize()
        .map_err(|error| format!("Could not resolve Harness root: {}", error))?;
    let base_root = match base_path.filter(|value| !value.trim().is_empty()) {
        Some(value) => PathBuf::from(value)
            .canonicalize()
            .map_err(|error| format!("Could not resolve Journey base path: {}", error))?,
        None => harness_root.clone(),
    };

    let requested_path = PathBuf::from(path.trim());
    let resolved_path = if requested_path.is_absolute() {
        requested_path
    } else {
        base_root.join(requested_path)
    };
    let canonical_path = resolved_path
        .canonicalize()
        .map_err(|error| format!("Could not open local reference: {}", error))?;

    if !canonical_path.starts_with(&base_root) && !canonical_path.starts_with(&harness_root) {
        return Err("Local reference is outside the allowed workspace roots.".to_string());
    }

    open_path(&canonical_path)
}

#[tauri::command]
fn start_pi_invocation(
    app: AppHandle,
    state: State<'_, PiProcessState>,
    prompt: String,
    config: ProviderConfig,
    journey_id: String,
    session_id: String,
    correlation: Option<TurnCorrelation>,
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
    if let Some(value) = correlation.as_ref() {
        validate_turn_correlation(value, &journey_id, &session_id)?;
        validate_persisted_turn_authority(&app, value)?;
    }
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

    let child_state = state.child.clone();
    let cancelling_state = state.cancelling.clone();
    thread::spawn(move || {
        run_pi_process(
            app,
            child_state,
            cancelling_state,
            prompt,
            config,
            journey_id,
            session_id,
            correlation,
        )
    });

    Ok(())
}

#[tauri::command]
fn reset_pi_session(
    state: State<'_, PiProcessState>,
    journey_id: String,
    session_id: String,
) -> Result<String, String> {
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    let safe_session_id = sanitize_session_id(&session_id)?;
    if !safe_session_id.starts_with(&format!("nautilus-{}", safe_journey_id)) {
        return Err(
            "Pi session id does not belong to the active Journey conversation.".to_string(),
        );
    }
    let child_slot = state
        .child
        .lock()
        .map_err(|_| "Could not inspect active Pi process.".to_string())?;
    if child_slot.is_some() {
        return Err("Cannot restart the Pi session while an invocation is running.".to_string());
    }
    drop(child_slot);

    let session_id = safe_session_id;
    let session_dir = default_pi_session_dir(&mirror_runtime_root()?)?;
    let archived = archive_pi_session_files(&session_dir, &session_id)?;
    Ok(if archived == 0 {
        format!("Pi session {} was already empty.", session_id)
    } else {
        format!(
            "Pi session {} restarted; {} previous session file archived.",
            session_id, archived
        )
    })
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
async fn inspect_external_pi_activity(
    state: State<'_, ExternalPiObservationState>,
    journey_id: String,
    session_id: String,
    generation: u64,
    session_file: String,
    base_leaf_entry_id: String,
    base_entry_count: u64,
    fingerprint: Option<ExternalPiFileFingerprint>,
) -> Result<ExternalPiInspection, String> {
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    let safe_session_id = sanitize_session_id(&session_id)?;
    if !safe_session_id.starts_with(&format!("nautilus-{}", safe_journey_id)) {
        return Err("Pi session id does not belong to the selected Journey conversation.".to_string());
    }
    if base_leaf_entry_id.trim().is_empty() {
        return Err("A proven Pi checkpoint leaf is required.".to_string());
    }
    let cache = state.files.clone();
    tauri::async_runtime::spawn_blocking(move || {
        inspect_external_pi_session(
            &cache,
            &safe_journey_id,
            &safe_session_id,
            generation,
            &session_file,
            &base_leaf_entry_id,
            base_entry_count,
            fingerprint.as_ref(),
        )
    })
    .await
    .map_err(|error| format!("Could not inspect external Pi activity: {}", error))?
}

#[tauri::command]
fn hydrate_pi_session_from_local_conversation(
    app: AppHandle,
    state: State<'_, PiProcessState>,
    journey_id: String,
    session_id: String,
    provider: String,
    model: String,
) -> Result<String, String> {
    let safe_journey_id = sanitize_journey_id(&journey_id)?;
    let safe_session_id = sanitize_session_id(&session_id)?;
    if !safe_session_id.starts_with(&format!("nautilus-{}", safe_journey_id)) {
        return Err(
            "Pi session id does not belong to the selected Journey conversation.".to_string(),
        );
    }
    if provider.trim().is_empty() || model.trim().is_empty() {
        return Err("Provider and model are required to hydrate a Pi session.".to_string());
    }
    let child_slot = state
        .child
        .lock()
        .map_err(|_| "Could not inspect active Pi process.".to_string())?;
    if child_slot.is_some() {
        return Err("Cannot hydrate the Pi session while an invocation is running.".to_string());
    }
    drop(child_slot);

    let conversation_path = journey_conversation_path(&app, &safe_journey_id)?;
    let payload: Value = serde_json::from_str(
        &fs::read_to_string(&conversation_path)
            .map_err(|error| format!("Could not read imported Journey conversation: {}", error))?,
    )
    .map_err(|error| format!("Could not parse imported Journey conversation: {}", error))?;
    let conversation = payload
        .get("conversation")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            "Imported Journey conversation is missing its conversation object.".to_string()
        })?;
    let messages = conversation
        .get("messages")
        .and_then(Value::as_array)
        .ok_or_else(|| "Imported Journey conversation is missing messages.".to_string())?;
    let mirror_conversation_id = conversation
        .get("liveIdentity")
        .and_then(|identity| identity.get("mirrorConversationId"))
        .and_then(Value::as_str)
        .ok_or_else(|| {
            "Only an explicitly selected Mirror conversation can hydrate a Pi session.".to_string()
        })?;
    let timestamp = payload
        .get("savedAt")
        .and_then(Value::as_str)
        .unwrap_or("1970-01-01T00:00:00.000Z");
    let session_content = build_hydrated_pi_session(
        &safe_session_id,
        timestamp,
        messages,
        provider.trim(),
        model.trim(),
    )?;

    let session_dir = default_pi_session_dir(&mirror_runtime_root()?)?;
    fs::create_dir_all(&session_dir)
        .map_err(|error| format!("Could not create Pi session directory: {}", error))?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not timestamp hydrated Pi session: {}", error))?
        .as_nanos();
    let temp_path = session_dir.join(format!(".hydrate-{}-{}.tmp", safe_session_id, nonce));
    fs::write(&temp_path, session_content)
        .map_err(|error| format!("Could not stage hydrated Pi session: {}", error))?;
    let archived = archive_pi_session_files(&session_dir, &safe_session_id)?;
    let session_path =
        session_dir.join(format!("mirror-import-{}_{}.jsonl", nonce, safe_session_id));
    fs::rename(&temp_path, &session_path)
        .map_err(|error| format!("Could not activate hydrated Pi session: {}", error))?;

    Ok(format!(
        "Mirror conversation {} hydrated into Pi session {}; {} previous session file archived.",
        mirror_conversation_id, safe_session_id, archived,
    ))
}

#[tauri::command]
fn read_mirror_turn_commit_status(
    state: State<'_, PiProcessState>,
    journey_id: String,
    session_file: String,
    correlation: TurnCorrelation,
) -> Result<String, String> {
    ensure_pi_idle(&state)?;
    validate_turn_correlation(&correlation, &journey_id, &correlation.pi_session_id)?;
    validate_pi_session_file(&session_file, &correlation.pi_session_id)?;
    let value = run_mirror_logger_json(&[
        "commit-status".to_string(),
        session_file,
        "--correlation-json".to_string(),
        serde_json::to_string(&correlation).map_err(|error| error.to_string())?,
    ])?;
    serde_json::to_string(&value).map_err(|error| error.to_string())
}

#[tauri::command]
fn retry_mirror_turn_commit(
    app: AppHandle,
    state: State<'_, PiProcessState>,
    journey_id: String,
    session_file: String,
    correlation: TurnCorrelation,
) -> Result<String, String> {
    ensure_pi_idle(&state)?;
    validate_turn_correlation(&correlation, &journey_id, &correlation.pi_session_id)?;
    validate_pi_session_file(&session_file, &correlation.pi_session_id)?;
    let conversation_path = journey_conversation_path(&app, &journey_id)?;
    let payload: Value = serde_json::from_str(&fs::read_to_string(conversation_path)
        .map_err(|error| format!("Could not read staged Journey conversation: {}", error))?)
        .map_err(|error| format!("Could not parse staged Journey conversation: {}", error))?;
    let conversation = payload.get("conversation").and_then(Value::as_object)
        .ok_or_else(|| "Staged Journey conversation is missing.".to_string())?;
    let live = conversation.get("liveIdentity").and_then(Value::as_object)
        .ok_or_else(|| "Staged live identity is missing.".to_string())?;
    if live.get("piSessionId").and_then(Value::as_str) != Some(correlation.pi_session_id.as_str())
        || live.get("generation").and_then(Value::as_u64) != Some(correlation.generation)
    {
        return Err("Staged Journey conversation no longer matches turn authority.".to_string());
    }
    let messages = conversation.get("messages").and_then(Value::as_array)
        .ok_or_else(|| "Staged messages are missing.".to_string())?;
    let content_for = |id: &str| -> Result<String, String> {
        messages.iter().find(|message| message.get("id").and_then(Value::as_str) == Some(id))
            .and_then(|message| message.get("content").and_then(Value::as_str))
            .filter(|content| !content.trim().is_empty())
            .map(|content| content.chars().take(50_000).collect())
            .ok_or_else(|| format!("Eligible durable message is missing for {}.", id))
    };
    let correlation_json = serde_json::to_string(&correlation).map_err(|error| error.to_string())?;
    let mut status = run_mirror_logger_json(&[
        "commit-status".to_string(), session_file.clone(), "--correlation-json".to_string(), correlation_json.clone(),
    ])?;
    if status.get("userMessageId").and_then(Value::as_str).is_none() {
        run_mirror_logger_json(&[
            "log-user".to_string(), session_file.clone(), content_for(&correlation.harness_user_message_id)?,
            "--interface".to_string(), "pi".to_string(), "--correlation-json".to_string(), correlation_json.clone(),
        ])?;
    }
    if status.get("assistantMessageId").and_then(Value::as_str).is_none() {
        run_mirror_logger_json(&[
            "log-assistant".to_string(), session_file.clone(), content_for(&correlation.harness_assistant_message_id)?,
            "--interface".to_string(), "pi".to_string(), "--correlation-json".to_string(), correlation_json.clone(),
        ])?;
    }
    status = run_mirror_logger_json(&[
        "commit-status".to_string(), session_file, "--correlation-json".to_string(), correlation_json,
    ])?;
    serde_json::to_string(&status).map_err(|error| error.to_string())
}

fn ensure_pi_idle(state: &State<'_, PiProcessState>) -> Result<(), String> {
    if state.child.lock().map_err(|_| "Could not inspect active Pi process.".to_string())?.is_some() {
        return Err("Cannot reconcile Mirror while a Pi invocation is running.".to_string());
    }
    Ok(())
}

fn validate_pi_session_file(session_file: &str, pi_session_id: &str) -> Result<(), String> {
    let path = PathBuf::from(session_file);
    if !path.is_absolute() || path.extension().and_then(|value| value.to_str()) != Some("jsonl") {
        return Err("Mirror reconciliation requires an exact Pi JSONL session file.".to_string());
    }
    let canonical = path.canonicalize()
        .map_err(|_| "Mirror reconciliation Pi session file is unavailable.".to_string())?;
    let sessions_root = PathBuf::from(std::env::var("HOME").map_err(|_| "HOME is unavailable.".to_string())?)
        .join(".pi").join("agent").join("sessions").canonicalize()
        .map_err(|_| "Pi sessions root is unavailable.".to_string())?;
    if !canonical.starts_with(sessions_root) {
        return Err("Mirror reconciliation session is outside the Pi sessions root.".to_string());
    }
    let contents = fs::read_to_string(&canonical).map_err(|error| error.to_string())?;
    let first_line = contents.lines().next().unwrap_or_default();
    let header: Value = serde_json::from_str(first_line)
        .map_err(|_| "Mirror reconciliation session header is invalid.".to_string())?;
    if header.get("type").and_then(Value::as_str) != Some("session")
        || header.get("id").and_then(Value::as_str) != Some(pi_session_id)
    {
        return Err("Mirror reconciliation session does not match the Pi authority.".to_string());
    }
    Ok(())
}

fn inspect_external_pi_session(
    cache: &Arc<Mutex<HashMap<String, CachedExternalPiFile>>>,
    journey_id: &str,
    session_id: &str,
    generation: u64,
    session_file: &str,
    base_leaf_entry_id: &str,
    base_entry_count: u64,
    previous_fingerprint: Option<&ExternalPiFileFingerprint>,
) -> Result<ExternalPiInspection, String> {
    validate_pi_session_file(session_file, session_id)?;
    let path = PathBuf::from(session_file).canonicalize()
        .map_err(|error| format!("Could not resolve exact Pi session: {}", error))?;
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Could not inspect exact Pi session: {}", error))?;
    let fingerprint = external_pi_fingerprint(&path, &metadata)?;
    let base = ExternalPiInspection {
        status: "unchanged".to_string(),
        journey_id: journey_id.to_string(),
        pi_session_id: session_id.to_string(),
        generation,
        session_file: path.to_string_lossy().to_string(),
        fingerprint: fingerprint.clone(),
        base_leaf_entry_id: base_leaf_entry_id.to_string(),
        leaf_entry_id: None,
        entry_count: None,
        observed_entry_ids: None,
        ancestor_entry_ids: None,
        turns: None,
        reason_code: None,
    };
    if previous_fingerprint == Some(&fingerprint) {
        return Ok(base);
    }
    if let Some(previous) = previous_fingerprint {
        if previous.session_file != fingerprint.session_file
            || previous.file_id != fingerprint.file_id
            || fingerprint.size < previous.size
        {
            return Ok(ExternalPiInspection {
                status: "conflicted".to_string(),
                reason_code: Some("pi_session_file_changed".to_string()),
                ..base
            });
        }
    }

    let cache_key = format!("{}:{}:{}:{}", journey_id, session_id, generation, fingerprint.session_file);
    let cached = cache.lock().ok().and_then(|files| files.get(&cache_key).cloned());
    let content = if let Some(cached_file) = cached {
        if cached_file.fingerprint == fingerprint {
            cached_file.content
        } else if cached_file.fingerprint.session_file == fingerprint.session_file
            && cached_file.fingerprint.file_id == fingerprint.file_id
            && cached_file.fingerprint.size < fingerprint.size
            && cached_file.content.as_bytes().len() as u64 == cached_file.fingerprint.size
        {
            let mut file = File::open(&path)
                .map_err(|error| format!("Could not open exact Pi session tail: {}", error))?;
            file.seek(SeekFrom::Start(cached_file.fingerprint.size))
                .map_err(|error| format!("Could not seek exact Pi session tail: {}", error))?;
            let mut appended = String::new();
            file.read_to_string(&mut appended)
                .map_err(|error| format!("Could not read exact Pi session tail: {}", error))?;
            format!("{}{}", cached_file.content, appended)
        } else {
            fs::read_to_string(&path)
                .map_err(|error| format!("Could not read exact Pi session: {}", error))?
        }
    } else {
        fs::read_to_string(&path)
            .map_err(|error| format!("Could not read exact Pi session: {}", error))?
    };
    let inspection = inspect_external_pi_content(base, &content, base_leaf_entry_id, base_entry_count)?;
    if content.as_bytes().len() as u64 == fingerprint.size {
        if let Ok(mut files) = cache.lock() {
            if files.len() >= 8 && !files.contains_key(&cache_key) {
                if let Some(first_key) = files.keys().next().cloned() {
                    files.remove(&first_key);
                }
            }
            files.insert(cache_key, CachedExternalPiFile { fingerprint, content });
        }
    }
    Ok(inspection)
}

fn external_pi_fingerprint(
    path: &Path,
    metadata: &fs::Metadata,
) -> Result<ExternalPiFileFingerprint, String> {
    let modified_ms = metadata.modified()
        .map_err(|error| format!("Could not read Pi session modification time: {}", error))?
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Pi session modification time predates Unix epoch.".to_string())?
        .as_millis() as u64;
    #[cfg(unix)]
    let file_id = {
        use std::os::unix::fs::MetadataExt;
        metadata.ino()
    };
    #[cfg(not(unix))]
    let file_id = 0;
    Ok(ExternalPiFileFingerprint {
        session_file: path.to_string_lossy().to_string(),
        size: metadata.len(),
        modified_ms,
        file_id,
    })
}

fn inspect_external_pi_content(
    base: ExternalPiInspection,
    content: &str,
    base_leaf_entry_id: &str,
    base_entry_count: u64,
) -> Result<ExternalPiInspection, String> {
    let mut entries = Vec::new();
    let mut truncated_tail = false;
    let lines: Vec<&str> = content.split_inclusive('\n').collect();
    for (index, raw_line) in lines.iter().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        let value: Value = match serde_json::from_str(line) {
            Ok(value) => value,
            Err(_) if index + 1 == lines.len() => {
                truncated_tail = true;
                break;
            }
            Err(_) => {
                return Ok(ExternalPiInspection {
                    status: "conflicted".to_string(),
                    reason_code: Some("pi_jsonl_invalid".to_string()),
                    ..base
                });
            }
        };
        if value.get("type").and_then(Value::as_str) == Some("session") {
            continue;
        }
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
    if entries.is_empty() {
        return Ok(ExternalPiInspection { status: "waiting".to_string(), ..base });
    }

    let by_id = entries.iter().enumerate()
        .map(|(index, entry)| (entry.id.as_str(), index))
        .collect::<std::collections::HashMap<_, _>>();
    let mut branch = Vec::new();
    let mut cursor = entries.last();
    let mut seen = std::collections::HashSet::new();
    while let Some(entry) = cursor {
        if !seen.insert(entry.id.as_str()) {
            return Ok(ExternalPiInspection {
                status: "conflicted".to_string(),
                reason_code: Some("pi_ancestry_cycle".to_string()),
                ..base
            });
        }
        branch.push(entry.clone());
        cursor = entry.parent_id.as_deref().and_then(|parent| by_id.get(parent)).map(|index| &entries[*index]);
    }
    branch.reverse();
    let Some(base_index) = branch.iter().position(|entry| entry.id == base_leaf_entry_id) else {
        return Ok(ExternalPiInspection {
            status: "conflicted".to_string(),
            reason_code: Some("pi_base_leaf_missing".to_string()),
            ..base
        });
    };
    if base_index as u64 + 1 != base_entry_count {
        return Ok(ExternalPiInspection {
            status: "conflicted".to_string(),
            reason_code: Some("pi_checkpoint_count_mismatch".to_string()),
            ..base
        });
    }

    let mut turns = Vec::new();
    let mut pending_user: Option<(usize, &PiBranchEntry)> = None;
    let mut assistant_texts = Vec::new();
    let mut terminal_assistant: Option<(usize, &PiBranchEntry)> = None;
    for (index, entry) in branch.iter().enumerate().skip(base_index + 1) {
        match entry.role.as_deref() {
            Some("user") => {
                if let Some((_, user)) = pending_user {
                    let Some((assistant_index, assistant)) = terminal_assistant else {
                        return Ok(ExternalPiInspection { status: "waiting".to_string(), ..base });
                    };
                    turns.push(project_external_pi_turn(user, assistant, &assistant_texts, assistant_index));
                }
                pending_user = Some((index, entry));
                assistant_texts.clear();
                terminal_assistant = None;
            }
            Some("assistant") if pending_user.is_some() => {
                if !entry.text.trim().is_empty() {
                    assistant_texts.push(entry.text.trim().to_string());
                }
                if matches!(entry.stop_reason.as_deref(), Some("stop" | "length")) {
                    terminal_assistant = Some((index, entry));
                }
            }
            _ => {}
        }
    }
    if let Some((_, user)) = pending_user {
        if let Some((assistant_index, assistant)) = terminal_assistant {
            turns.push(project_external_pi_turn(user, assistant, &assistant_texts, assistant_index));
        } else if turns.is_empty() {
            return Ok(ExternalPiInspection { status: "waiting".to_string(), ..base });
        }
    }
    if turns.is_empty() {
        return Ok(if truncated_tail {
            ExternalPiInspection { status: "waiting".to_string(), ..base }
        } else {
            base
        });
    }
    if turns.iter().any(|turn| turn.user_text.is_empty() || turn.assistant_text.is_empty()) {
        return Ok(ExternalPiInspection {
            status: "conflicted".to_string(),
            reason_code: Some("pi_turn_unsupported".to_string()),
            ..base
        });
    }
    let last_assistant_id = turns.last().unwrap().assistant_entry_id.clone();
    let last_index = branch.iter().position(|entry| entry.id == last_assistant_id).unwrap();
    let observed_entry_ids = branch[base_index + 1..=last_index]
        .iter().map(|entry| entry.id.clone()).collect::<Vec<_>>();
    let ancestor_entry_ids = branch[..=last_index]
        .iter().map(|entry| entry.id.clone()).collect::<Vec<_>>();
    Ok(ExternalPiInspection {
        status: "advanced".to_string(),
        leaf_entry_id: Some(last_assistant_id),
        entry_count: Some(last_index as u64 + 1),
        observed_entry_ids: Some(observed_entry_ids),
        ancestor_entry_ids: Some(ancestor_entry_ids),
        turns: Some(turns),
        ..base
    })
}

fn project_external_pi_turn(
    user: &PiBranchEntry,
    assistant: &PiBranchEntry,
    assistant_texts: &[String],
    _assistant_index: usize,
) -> ExternalPiProjectedTurn {
    ExternalPiProjectedTurn {
        user_entry_id: user.id.clone(),
        assistant_entry_id: assistant.id.clone(),
        user_text: user.text.trim().to_string(),
        assistant_text: assistant_texts.join("\n\n"),
        started_at: user.timestamp.clone(),
        committed_at: assistant.timestamp.clone(),
    }
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

fn run_mirror_logger_json(args: &[String]) -> Result<Value, String> {
    let mut command_args = vec!["run".to_string(), "python".to_string(), "-m".to_string(), "memory".to_string(), "conversation-logger".to_string()];
    command_args.extend_from_slice(args);
    let output = Command::new("uv")
        .args(command_args)
        .current_dir(mirror_runtime_root()?)
        .output()
        .map_err(|error| format!("Could not run Mirror reconciliation: {}", error))?;
    if !output.status.success() {
        return Err("Mirror reconciliation command failed.".to_string());
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|_| "Mirror reconciliation returned invalid structured evidence.".to_string())
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
    child
        .kill()
        .map_err(|error| format!("Could not cancel local Pi invocation: {}", error))?;
    emit(
        &app,
        PiProcessEventKind::Cancelled,
        "Pi invocation cancelled.".to_string(),
    );
    Ok(())
}

fn run_pi_process(
    app: AppHandle,
    child_state: Arc<Mutex<Option<Child>>>,
    cancelling_state: Arc<Mutex<bool>>,
    prompt: String,
    config: ProviderConfig,
    journey_id: String,
    session_id: String,
    correlation: Option<TurnCorrelation>,
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
    if mirror_mediated {
        args = mirror_json_event_args(args);
    }
    if mirror_mediated && !args.iter().any(|arg| arg == "--session-id") {
        args.push("--session-id".to_string());
        args.push(session_id.clone());
    }
    if mirror_mediated
        && !args
            .iter()
            .any(|arg| arg == "--approve" || arg == "--no-approve")
    {
        args.push("--approve".to_string());
    }
    let use_stdin = config.safe_test_mode || config.use_stdin;

    if !use_stdin {
        args.push(prompt.clone());
    }

    if mirror_mediated {
        emit(
            &app,
            PiProcessEventKind::Started,
            format!(
                "Starting Mirror runtime Pi command for Journey {}: {} {}",
                journey_id,
                command,
                args_for_display(&args)
            ),
        );
    } else {
        emit(
            &app,
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
        if let Ok(mirror_root) = mirror_runtime_root() {
            process_command.current_dir(mirror_root);
        }
        if let Some(value) = correlation.as_ref() {
            match serde_json::to_string(value) {
                Ok(payload) => {
                    process_command.env("NAUTILUS_TURN_CORRELATION_V1", payload);
                }
                Err(error) => {
                    emit(&app, PiProcessEventKind::Error, format!("Could not serialize turn correlation: {}", error));
                    emit(&app, PiProcessEventKind::Done, "Pi invocation finished.".to_string());
                    return;
                }
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
                PiProcessEventKind::Error,
                format!("Could not start local Pi command '{}': {}", command, error),
            );
            emit(
                &app,
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
                    PiProcessEventKind::Error,
                    format!("Could not write prompt packet to Pi stdin: {}", error),
                );
            }
        }
    }

    let stdout_handle = child.stdout.take().map(|stdout| {
        let app = app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                match line {
                    Ok(line) => {
                        emit(&app, PiProcessEventKind::Stdout, format!("{}\n", line));
                    }
                    Err(error) => emit(
                        &app,
                        PiProcessEventKind::Error,
                        format!("Could not read Pi stdout: {}", error),
                    ),
                }
            }
        })
    });

    let stderr_handle = child.stderr.take().map(|stderr| {
        let app = app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines() {
                match line {
                    Ok(line) => emit(&app, PiProcessEventKind::Stderr, line),
                    Err(error) => emit(
                        &app,
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
            PiProcessEventKind::Error,
            "Could not track local Pi process.".to_string(),
        );
        emit(
            &app,
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

    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    if mirror_mediated {
        if let Some(value) = correlation.as_ref() {
            match read_latest_pi_mirror_commit_events(&session_id, value) {
                Ok(events) => {
                    for event in events {
                        emit(&app, PiProcessEventKind::Stdout, event);
                    }
                }
                Err(error) => emit(
                    &app,
                    PiProcessEventKind::Stderr,
                    format!("Could not read durable Mirror commit evidence: {}", error),
                ),
            }
        }
    }

    emit(
        &app,
        PiProcessEventKind::Done,
        "Pi invocation finished.".to_string(),
    );
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

fn emit(app: &AppHandle, kind: PiProcessEventKind, content: String) {
    let _ = app.emit(PI_PROCESS_EVENT, PiProcessEvent { kind, content });
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

fn build_hydrated_pi_session(
    session_id: &str,
    timestamp: &str,
    messages: &[Value],
    provider: &str,
    model: &str,
) -> Result<String, String> {
    let model_entry_id = "import-model";
    let mut entries = vec![
        json!({
            "type": "session",
            "version": 3,
            "id": session_id,
            "timestamp": timestamp,
            "cwd": mirror_runtime_root()?.to_string_lossy(),
        }),
        json!({
            "type": "model_change",
            "id": model_entry_id,
            "parentId": Value::Null,
            "timestamp": timestamp,
            "provider": provider,
            "modelId": model,
        }),
    ];
    let mut parent_id = model_entry_id.to_string();
    let base_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not timestamp imported Pi messages: {}", error))?
        .as_millis() as u64;

    for (index, message) in messages.iter().enumerate() {
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("Imported message {} has no role.", index + 1))?;
        if role != "user" && role != "assistant" {
            continue;
        }
        let content = message
            .get("content")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("Imported message {} has no text content.", index + 1))?;
        let entry_id = format!("import-message-{}", index + 1);
        let message_timestamp = base_timestamp + index as u64;
        let runtime_message = if role == "user" {
            json!({
                "role": "user",
                "content": [{ "type": "text", "text": content }],
                "timestamp": message_timestamp,
            })
        } else {
            json!({
                "role": "assistant",
                "content": [{ "type": "text", "text": content }],
                "api": "imported-mirror-conversation",
                "provider": provider,
                "model": model,
                "usage": {
                    "input": 0,
                    "output": 0,
                    "cacheRead": 0,
                    "cacheWrite": 0,
                    "totalTokens": 0,
                    "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0 }
                },
                "stopReason": "stop",
                "timestamp": message_timestamp,
            })
        };
        entries.push(json!({
            "type": "message",
            "id": entry_id,
            "parentId": parent_id,
            "timestamp": message.get("createdAt").and_then(Value::as_str).unwrap_or(timestamp),
            "message": runtime_message,
        }));
        parent_id = entry_id;
    }

    let imported_count = entries.len() - 2;
    if imported_count == 0 {
        return Err(
            "Selected Mirror conversation has no importable user or assistant messages."
                .to_string(),
        );
    }
    entries
        .into_iter()
        .map(|entry| serde_json::to_string(&entry).map_err(|error| error.to_string()))
        .collect::<Result<Vec<_>, _>>()
        .map(|lines| format!("{}\n", lines.join("\n")))
}

fn archive_pi_session_files(session_dir: &Path, session_id: &str) -> Result<usize, String> {
    if !session_dir.exists() {
        return Ok(0);
    }
    let suffix = format!("_{}.jsonl", session_id);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not timestamp Pi session backup: {}", error))?
        .as_nanos();
    let mut archived = 0;

    for entry in fs::read_dir(session_dir)
        .map_err(|error| format!("Could not inspect Pi session directory: {}", error))?
    {
        let entry =
            entry.map_err(|error| format!("Could not inspect Pi session entry: {}", error))?;
        if !entry
            .file_type()
            .map_err(|error| format!("Could not inspect Pi session file type: {}", error))?
            .is_file()
        {
            continue;
        }
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !file_name.ends_with(&suffix) {
            continue;
        }
        let backup_path = session_dir.join(format!(
            "{}.reset-{}-{}.bak",
            file_name,
            timestamp,
            archived + 1
        ));
        fs::rename(entry.path(), backup_path)
            .map_err(|error| format!("Could not archive previous Pi session: {}", error))?;
        archived += 1;
    }
    Ok(archived)
}

fn journey_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir.join(JOURNEY_PREFERENCES_FILE))
}

fn journey_conversation_path(app: &AppHandle, journey_id: &str) -> Result<PathBuf, String> {
    let safe_journey_id = sanitize_journey_id(journey_id)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {}", error))?;
    Ok(app_data_dir
        .join("journey-conversations")
        .join(format!("{}.json", safe_journey_id)))
}

fn validate_persisted_turn_authority(app: &AppHandle, value: &TurnCorrelation) -> Result<(), String> {
    let payload: Value = serde_json::from_str(
        &fs::read_to_string(journey_conversation_path(app, &value.journey_id)?)
            .map_err(|error| format!("Could not read staged turn authority: {}", error))?,
    ).map_err(|error| format!("Could not parse staged turn authority: {}", error))?;
    let conversation = payload.get("conversation").and_then(Value::as_object)
        .ok_or_else(|| "Staged turn authority is missing its conversation.".to_string())?;
    let live = conversation.get("liveIdentity").and_then(Value::as_object)
        .ok_or_else(|| "Staged turn authority is missing its live identity.".to_string())?;
    let live_matches = live.get("journeyId").and_then(Value::as_str) == Some(value.journey_id.as_str())
        && live.get("harnessConversationId").and_then(Value::as_str) == Some(value.harness_conversation_id.as_str())
        && live.get("piSessionId").and_then(Value::as_str) == Some(value.pi_session_id.as_str())
        && live.get("generation").and_then(Value::as_u64) == Some(value.generation)
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

fn validate_turn_correlation(
    value: &TurnCorrelation,
    journey_id: &str,
    session_id: &str,
) -> Result<(), String> {
    if value.schema_version != "0.1.0"
        || value.journey_id != journey_id
        || value.pi_session_id != session_id
        || value.harness_conversation_id.trim().is_empty()
        || value.turn_id.trim().is_empty()
        || value.run_id.trim().is_empty()
        || value.harness_user_message_id.trim().is_empty()
        || value.harness_assistant_message_id.trim().is_empty()
        || value.mirror_conversation_id.as_ref().is_some_and(|id| id.trim().is_empty())
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

fn main() {
    tauri::Builder::default()
        .manage(PiProcessState::default())
        .manage(ExternalPiObservationState::default())
        .invoke_handler(tauri::generate_handler![
            save_journey_conversation,
            load_journey_conversation,
            load_journey_registry,
            load_journey_preferences,
            save_journey_preferences,
            list_mirror_conversations,
            generate_mirror_conversation_title,
            reload_journey_from_mirror,
            inspect_mirror_conversation_activity,
            reconcile_mirror_conversation,
            open_local_reference,
            start_pi_invocation,
            read_pi_session_context_stats,
            inspect_external_pi_activity,
            hydrate_pi_session_from_local_conversation,
            read_mirror_turn_commit_status,
            retry_mirror_turn_commit,
            cancel_pi_invocation,
            reset_pi_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nautilus Harness");
}

#[cfg(test)]
mod tests {
    use super::{
        archive_pi_session_files, build_hydrated_pi_session,
        extract_context_stats_from_pi_session, extract_pi_mirror_commit_events,
        inspect_external_pi_content, validate_turn_correlation,
        validate_mirror_reconciliation_messages, activate_reconciled_files,
        ExternalPiFileFingerprint, ExternalPiInspection, MirrorObservedMessage,
        PiSessionContextSnapshot, TurnCorrelation,
    };
    use serde_json::json;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn builds_a_linked_pi_session_from_an_explicit_mirror_conversation() {
        let content = build_hydrated_pi_session(
            "nautilus-laboratorio",
            "2026-08-24T00:00:00.000Z",
            &[
                json!({"role": "user", "content": "remember cobalt", "createdAt": "2026-08-24T00:00:01.000Z"}),
                json!({"role": "assistant", "content": "remembered", "createdAt": "2026-08-24T00:00:02.000Z"}),
            ],
            "openai-codex",
            "gpt-5.4-mini",
        ).unwrap();
        let lines = content
            .lines()
            .map(|line| serde_json::from_str::<serde_json::Value>(line).unwrap())
            .collect::<Vec<_>>();

        assert_eq!(lines[0]["type"], "session");
        assert_eq!(lines[0]["id"], "nautilus-laboratorio");
        assert_eq!(lines[2]["message"]["role"], "user");
        assert_eq!(lines[3]["parentId"], "import-message-1");
        assert_eq!(lines[3]["message"]["content"][0]["text"], "remembered");
        // Reconciliation ancestry counts the model root plus messages; the session header is not a branch entry.
        assert_eq!(lines.len() - 1, 3);
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
    fn estimates_hydrated_context_before_provider_usage() {
        let session = [
            r#"{"type":"session","version":3,"id":"nautilus-import"}"#,
            r#"{"type":"message","message":{"role":"user","content":[{"type":"text","text":"12345678"}]}}"#,
            r#"{"type":"message","message":{"role":"assistant","provider":"openai-codex","model":"gpt-5.4-mini","stopReason":"stop","content":[{"type":"text","text":"123456789012"}],"usage":{"totalTokens":0}}}"#,
        ].join("\n");

        assert_eq!(
            extract_context_stats_from_pi_session(&session),
            Some(PiSessionContextSnapshot {
                tokens: 5,
                provider_model: "openai-codex/gpt-5.4-mini".to_string(),
            })
        );
    }

    #[test]
    fn validates_allowlisted_turn_correlation_against_invocation_authority() {
        let correlation = TurnCorrelation {
            schema_version: "0.1.0".to_string(),
            journey_id: "nautilus-harness".to_string(),
            harness_conversation_id: "harness-conversation".to_string(),
            pi_session_id: "nautilus-nautilus-harness".to_string(),
            generation: 2,
            turn_id: "turn-1".to_string(),
            run_id: "run-1".to_string(),
            harness_user_message_id: "user-1".to_string(),
            harness_assistant_message_id: "assistant-1".to_string(),
            mirror_conversation_id: None,
        };

        assert!(validate_turn_correlation(
            &correlation,
            "nautilus-harness",
            "nautilus-nautilus-harness",
        ).is_ok());
        assert!(validate_turn_correlation(
            &correlation,
            "another-journey",
            "nautilus-nautilus-harness",
        ).is_err());
        let serialized = serde_json::to_value(&correlation).expect("correlation should serialize");
        assert!(!serialized.as_object().unwrap().contains_key("mirrorConversationId"));

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
    fn extracts_only_complete_descendant_external_pi_turns() {
        let base = ExternalPiInspection {
            status: "unchanged".to_string(),
            journey_id: "journey-a".to_string(),
            pi_session_id: "nautilus-journey-a".to_string(),
            generation: 3,
            session_file: "/sessions/a.jsonl".to_string(),
            fingerprint: ExternalPiFileFingerprint {
                session_file: "/sessions/a.jsonl".to_string(), size: 10, modified_ms: 20, file_id: 30,
            },
            base_leaf_entry_id: "base".to_string(),
            leaf_entry_id: None,
            entry_count: None,
            observed_entry_ids: None,
            ancestor_entry_ids: None,
            turns: None,
            reason_code: None,
        };
        let session = [
            r#"{"type":"session","id":"nautilus-journey-a"}"#,
            r#"{"type":"model_change","id":"model","timestamp":"2026-08-24T10:00:00Z"}"#,
            r#"{"type":"message","id":"base","parentId":"model","timestamp":"2026-08-24T10:01:00Z","message":{"role":"assistant","stopReason":"stop","content":[{"type":"text","text":"base"}]}}"#,
            r#"{"type":"custom","id":"custom","parentId":"base","customType":"inert"}"#,
            r#"{"type":"message","id":"external-user","parentId":"custom","timestamp":"2026-08-24T11:00:00Z","message":{"role":"user","content":[{"type":"text","text":"external question"}]}}"#,
            r#"{"type":"message","id":"tool-assistant","parentId":"external-user","timestamp":"2026-08-24T11:00:10Z","message":{"role":"assistant","stopReason":"toolUse","content":[{"type":"thinking","thinking":"private"},{"type":"text","text":"checking"},{"type":"toolCall","name":"read"}]}}"#,
            r#"{"type":"message","id":"tool-result","parentId":"tool-assistant","timestamp":"2026-08-24T11:00:20Z","message":{"role":"toolResult","content":[{"type":"text","text":"secret tool output"}]}}"#,
            r#"{"type":"message","id":"external-assistant","parentId":"tool-result","timestamp":"2026-08-24T11:01:00Z","message":{"role":"assistant","stopReason":"stop","content":[{"type":"thinking","thinking":"private summary"},{"type":"text","text":"external answer"}]}}"#,
            r#"{"type":"custom","id":"tail-custom","parentId":"external-assistant","customType":"inert"}"#,
        ].join("\n");

        let result = inspect_external_pi_content(base.clone(), &session, "base", 2).unwrap();
        assert_eq!(result.status, "advanced");
        assert_eq!(result.leaf_entry_id.as_deref(), Some("external-assistant"));
        assert_eq!(result.entry_count, Some(7));
        let turn = &result.turns.unwrap()[0];
        assert_eq!(turn.user_text, "external question");
        assert_eq!(turn.assistant_text, "checking\n\nexternal answer");
        assert!(!turn.assistant_text.contains("private"));
        assert!(!turn.assistant_text.contains("secret tool output"));

        let partial = format!("{}\n{}", session, r#"{"type":"message","id":"next-user","parentId":"tail-custom","message":{"role":"user","content":[{"type":"text","text":"waiting"}]}}"#);
        let partial_after_complete = inspect_external_pi_content(base.clone(), &partial, "base", 2).unwrap();
        assert_eq!(partial_after_complete.status, "advanced");
        assert_eq!(partial_after_complete.turns.unwrap().len(), 1);
        let partial_only = [
            r#"{"type":"session","id":"nautilus-journey-a"}"#,
            r#"{"type":"model_change","id":"model"}"#,
            r#"{"type":"message","id":"base","parentId":"model","message":{"role":"assistant","stopReason":"stop","content":[{"type":"text","text":"base"}]}}"#,
            r#"{"type":"message","id":"waiting-user","parentId":"base","message":{"role":"user","content":[{"type":"text","text":"waiting"}]}}"#,
        ].join("\n");
        assert_eq!(inspect_external_pi_content(base.clone(), &partial_only, "base", 2).unwrap().status, "waiting");
        assert_eq!(inspect_external_pi_content(base, &session, "missing", 2).unwrap().reason_code.as_deref(), Some("pi_base_leaf_missing"));
    }

    #[test]
    fn validates_complete_supported_mirror_turns_only() {
        let valid = vec![
            MirrorObservedMessage { id: "u".to_string(), role: "user".to_string(), content: "question".to_string(), created_at: "now".to_string(), boundary_truncated: None },
            MirrorObservedMessage { id: "a".to_string(), role: "assistant".to_string(), content: "answer".to_string(), created_at: "now".to_string(), boundary_truncated: None },
        ];
        assert!(validate_mirror_reconciliation_messages(&valid).is_ok());
        assert!(validate_mirror_reconciliation_messages(&valid[..1]).is_err());
        let mut truncated = valid.clone();
        truncated[1].content = "answer\n[… truncated]".to_string();
        assert!(validate_mirror_reconciliation_messages(&truncated).is_err());
        let mut consolidated = valid.clone();
        consolidated[1].content = "one\n\n---\n\ntwo".to_string();
        assert!(validate_mirror_reconciliation_messages(&consolidated).is_err());
    }

    #[test]
    fn restores_previous_files_when_reconciled_conversation_activation_fails() {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("nautilus-mirror-rollback-{}-{}", std::process::id(), nonce));
        fs::create_dir_all(&directory).unwrap();
        let old_session = directory.join("old.jsonl");
        let staged_session = directory.join("staged.jsonl");
        let target_session = directory.join("new.jsonl");
        let conversation = directory.join("conversation.json");
        let missing_staged_conversation = directory.join("missing.json");
        fs::write(&old_session, "old-session").unwrap();
        fs::write(&staged_session, "new-session").unwrap();
        fs::write(&conversation, "old-conversation").unwrap();

        assert!(activate_reconciled_files(
            &old_session, &staged_session, &target_session, &conversation,
            &missing_staged_conversation, nonce,
        ).is_err());
        assert_eq!(fs::read_to_string(&old_session).unwrap(), "old-session");
        assert_eq!(fs::read_to_string(&conversation).unwrap(), "old-conversation");
        assert!(!target_session.exists());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn archives_only_the_exact_journey_pi_session() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "nautilus-pi-session-reset-{}-{}",
            std::process::id(),
            nonce
        ));
        fs::create_dir_all(&directory).unwrap();
        let target = directory.join("2026-08-23_nautilus-laboratorio-mirror-harness.jsonl");
        let other = directory.join("2026-08-23_nautilus-other.jsonl");
        fs::write(&target, "target").unwrap();
        fs::write(&other, "other").unwrap();

        let archived =
            archive_pi_session_files(&directory, "nautilus-laboratorio-mirror-harness").unwrap();

        assert_eq!(archived, 1);
        assert!(!target.exists());
        assert!(other.exists());
        let backups = fs::read_dir(&directory)
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("bak"))
            .collect::<Vec<PathBuf>>();
        assert_eq!(backups.len(), 1);
        assert_eq!(fs::read_to_string(&backups[0]).unwrap(), "target");

        fs::remove_dir_all(directory).unwrap();
    }
}
