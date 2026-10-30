//! CV-010.DS-005 phase 2, slice 2d-1: the app's reads go through the Mirror host.
//!
//! This is a transport swap. The routes that read Mirror keep the answers they had when the
//! Python scripts gave them, so their callers do not change:
//!
//! - `catalog` and `inspect`, from `listJourneyConversations` and `inspectConversation`;
//! - the Journey registry, from `readJourneyTree`. Desktop stamps the envelope itself, at schema
//!   `0.1.0`, with no `sourceVersion`, which only the retired `journey mutate` needed. The tree's
//!   `findings` travel in the payload.
//!
//! The host runs the bound 0.3 home only (`request_for_home` checks its marker on every request).
//! Since slice 2f a packaged app carries its runtime in `Resources/mirror-host`; only the
//! Development channel, run from the repository, falls back to `.mirror-host/runtime/<platform>`.
//!
//! Slice 3a: the app creates a home through the same supervisor. The folder is named with the
//! person's user name, the kebab-case slug the core keys the identity on and the doorman reads
//! back from the folder's name, inside `~/Mirror Homes` unless the person chose another folder. Not `~/Mirror`:
//! macOS folds case, and `~/mirror` is where the Python Mirror's guide clones Mirror.

use crate::mirror_home::{load_home_binding, MarkedHome};
use crate::mirror_host::{MirrorHost, MirrorHostConfig, MirrorHostError};
use crate::runtime_channel::{RuntimeChannel, UNBOUND_0_3};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// The supervisor, started on the first request and kept for the app's life.
#[derive(Default)]
pub(crate) struct MirrorHostState(Mutex<Option<MirrorHost>>);

const CATALOG_REJECTED: &str = "Mirror conversation catalog operation was rejected.";

/// `^[A-Za-z0-9][A-Za-z0-9._:-]{7,255}$`, the catalog script's rule for a Conversation id.
pub(crate) fn is_mirror_identifier(value: &str) -> bool {
    let mut characters = value.chars();
    (8..=256).contains(&value.len())
        && characters.next().is_some_and(|first| first.is_ascii_alphanumeric())
        && characters.all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | ':' | '-'))
}

/// The catalog script's `catalog` entries, from `listJourneyConversations`.
pub(crate) fn catalog_entries(rows: &Value) -> Result<Vec<Value>, String> {
    let rejected = || CATALOG_REJECTED.to_string();
    let mut seen = std::collections::HashSet::new();
    rows.as_array().ok_or_else(rejected)?.iter().map(|row| {
        let id = row.get("conversationId").and_then(Value::as_str).filter(|id| is_mirror_identifier(id)).ok_or_else(rejected)?;
        if !seen.insert(id.to_string()) {
            return Err(rejected());
        }
        let message_count = row.get("messageCount").and_then(Value::as_u64).ok_or_else(rejected)?;
        let mut entry = json!({
            "kind": "mirror_history",
            "conversationId": id,
            "title": row.get("title").and_then(Value::as_str).filter(|title| !title.is_empty()).unwrap_or("Untitled conversation"),
            "updatedAt": row.get("startedAt").cloned().unwrap_or(Value::Null),
            "messageCount": message_count,
            "availability": "available_in_mirror",
        });
        if let Some(persona) = row.get("persona").and_then(Value::as_str).filter(|persona| !persona.is_empty()) {
            entry["persona"] = json!(persona);
        }
        Ok(entry)
    }).collect()
}

/// The Journey registry payload, from `readJourneyTree`.
pub(crate) fn registry_from_tree(tree: &Value, synced_at: &str) -> Result<String, String> {
    let roots = tree.get("roots").filter(|roots| roots.is_array())
        .ok_or_else(|| "Mirror returned a Journey tree without roots.".to_string())?;
    let findings = tree.get("findings").and_then(Value::as_array)
        .ok_or_else(|| "Mirror returned a Journey tree without findings.".to_string())?;
    let mut payload = json!({"schemaVersion": "0.1.0", "source": "mirror", "syncedAt": synced_at, "roots": roots});
    if !findings.is_empty() {
        payload["findings"] = Value::Array(findings.clone());
    }
    let text = serde_json::to_string(&payload).map_err(|error| error.to_string())?;
    crate::validate_journey_registry_payload(&text)?;
    Ok(text)
}

pub(crate) const RUNTIME_MISSING: &str = "Mirror Desktop TS is missing its Mirror host runtime. Reinstall the app.";

/// Where the laid-out runtime is: the app's own `Resources/mirror-host` when it carries one,
/// checked against its receipt; otherwise, for the Development channel only, the repository's.
pub(crate) fn runtime_dir(channel: RuntimeChannel, resources: Option<&Path>, repository: &Path, arch: &str) -> Result<PathBuf, String> {
    let platform = match arch {
        "x86_64" => "darwin-x64",
        "aarch64" => "darwin-arm64",
        other => return Err(format!("No Mirror host runtime is pinned for {other}.")),
    };
    if let Some(directory) = resources.map(|resources| resources.join("mirror-host")) {
        if directory.join("host.mjs").is_file() {
            check_bundled_runtime(&directory, platform)?;
            return directory.canonicalize().map_err(|error| format!("Could not resolve {}: {error}", directory.display()));
        }
    }
    if channel != RuntimeChannel::Development {
        return Err(RUNTIME_MISSING.to_string());
    }
    let directory = repository.join(".mirror-host").join("runtime").join(platform);
    if !directory.join("host.mjs").is_file() {
        return Err(format!("No Mirror host runtime at {}. Run: node scripts/mirror_host_pin.mjs materialize", directory.display()));
    }
    directory.canonicalize().map_err(|error| format!("Could not resolve {}: {error}", directory.display()))
}

/// The runtime this process runs with. The resources folder is the one Tauri resolves on macOS,
/// `Contents/Resources` beside the executable's `Contents/MacOS`, found without an `AppHandle` so
/// the runtime channel's profile and the host supervisor read the same runtime.
pub(crate) fn current_runtime_dir() -> Result<PathBuf, String> {
    let resources = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().and_then(Path::parent).map(|contents| contents.join("Resources")));
    runtime_dir(
        RuntimeChannel::active(),
        resources.as_deref(),
        &Path::new(env!("CARGO_MANIFEST_DIR")).join(".."),
        std::env::consts::ARCH,
    )
}

/// A bundled runtime is the one its receipt names: this platform's, with that `host.mjs`, and a
/// `node` to run it. A damaged app refuses rather than runs something else.
fn check_bundled_runtime(directory: &Path, platform: &str) -> Result<(), String> {
    use sha2::{Digest, Sha256};
    let receipt: Value = std::fs::read(directory.join("pin-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(|| RUNTIME_MISSING.to_string())?;
    if receipt.get("platform").and_then(Value::as_str) != Some(platform) {
        return Err(format!("This Mirror Desktop TS carries a Mirror host runtime for another Mac ({platform} needed). Reinstall the app."));
    }
    let host = std::fs::read(directory.join("host.mjs")).map_err(|_| RUNTIME_MISSING.to_string())?;
    let recorded = receipt.pointer("/host/sha256").and_then(Value::as_str);
    if recorded != Some(format!("{:x}", Sha256::digest(&host)).as_str()) || !directory.join("node").join("bin").join("node").is_file() {
        return Err(RUNTIME_MISSING.to_string());
    }
    Ok(())
}

/// The sentence every route the 0.3 line does not carry answers with, before touching any state.
pub(crate) fn not_carried(what: &str) -> String {
    format!("{what} is not available in Mirror Desktop TS yet.")
}

/// The catalog script's `rename` answer, from `renameConversation`.
pub(crate) fn rename_response(journey_id: &str, conversation_id: &str, result: &Value) -> Result<Value, String> {
    if result.get("conversationId").and_then(Value::as_str) != Some(conversation_id)
        || result.get("journeyId").and_then(Value::as_str) != Some(journey_id)
    {
        return Err(CATALOG_REJECTED.to_string());
    }
    let title = result.get("title").and_then(Value::as_str).ok_or_else(|| CATALOG_REJECTED.to_string())?;
    Ok(json!({"schemaVersion": "1.0.0", "operation": "rename", "status": "ok",
              "journeyId": journey_id, "conversationId": conversation_id, "title": title}))
}

/// The catalog script's `rebind-journey` answer, from `rebindConversationJourney`.
pub(crate) fn rebind_response(journey_id: &str, conversation_id: &str, result: &Value) -> Result<Value, String> {
    if result.get("conversationId").and_then(Value::as_str) != Some(conversation_id)
        || result.get("journeyId").and_then(Value::as_str) != Some(journey_id)
    {
        return Err(CATALOG_REJECTED.to_string());
    }
    let rebound = result.get("rebound").and_then(Value::as_bool).ok_or_else(|| CATALOG_REJECTED.to_string())?;
    Ok(json!({"schemaVersion": "1.0.0", "operation": "rebind-journey", "status": "ok", "journeyId": journey_id,
              "conversationId": conversation_id, "rebound": rebound,
              "previousJourneyId": result.get("previousJourneyId").cloned().unwrap_or(Value::Null)}))
}

/// The interface Desktop's Conversations carry; learning (slice 4a) asks for these alone.
pub(crate) const CONVERSATION_INTERFACE: &str = "nautilus_harness";

/// `provision_mirror_conversation.py`, answered by `ensureConversation`: the Mirror Conversation
/// bound to a Pi session. The interface stays `nautilus_harness`, as the script wrote it.
pub(crate) fn ensure_conversation(app: &AppHandle, session_id: &str, journey_id: &str, title: &str) -> Result<String, String> {
    let result = request(app, "ensureConversation", json!({"request": {
        "sessionId": session_id, "journeyId": journey_id, "title": title, "interface": CONVERSATION_INTERFACE,
    }}))
    .map_err(|error| format!("Mirror conversation provisioning did not complete. {error}"))?;
    if result.get("journeyId").and_then(Value::as_str) != Some(journey_id) {
        return Err("Mirror did not return native conversation authority.".to_string());
    }
    result.get("conversationId").and_then(Value::as_str).filter(|id| !id.is_empty()).map(str::to_string)
        .ok_or_else(|| "Mirror did not return native conversation authority.".to_string())
}

pub(crate) fn describe(error: MirrorHostError) -> String {
    match error {
        MirrorHostError::Rejected { name, reason, .. } => format!("Mirror refused the request ({name}: {reason})."),
        MirrorHostError::HomeNotMarked(message) => message,
        MirrorHostError::Unavailable { failures } => {
            format!("The Mirror host is unavailable after {failures} consecutive failures. Restart Mirror Desktop TS.")
        }
        MirrorHostError::SpawnFailed(message) => format!("The Mirror host could not start: {message}"),
        MirrorHostError::HandshakeRefused(message) => format!("The Mirror host was refused: {message}"),
        MirrorHostError::TimedOut { method, .. } => format!("The Mirror host did not answer {method} in time; it was restarted."),
        MirrorHostError::HostExited { .. } => "The Mirror host stopped; it will be restarted.".to_string(),
        MirrorHostError::Protocol(message) => format!("The Mirror host broke its protocol: {message}"),
    }
}

pub(crate) fn active_home(app: &AppHandle) -> Result<MarkedHome, String> {
    let app_data_root = app.path().app_data_dir().map_err(|error| error.to_string())?;
    load_home_binding(&app_data_root)?.ok_or_else(|| UNBOUND_0_3.to_string())
}

/// Send `method` about `home` through the app's supervisor.
pub(crate) fn request_for(app: &AppHandle, home: &MarkedHome, method: &str, params: Value) -> Result<Value, MirrorHostError> {
    with_host(app, |host| host.request_for_home(home, method, params))
}

/// The default folder for a created home, inside the person's home folder.
pub(crate) const DEFAULT_HOMES_FOLDER: &str = "Mirror Homes";
const USER_NAME_MAX: usize = 80;

/// The core's rule for a user name: lowercase ASCII letters and digits in runs joined by single
/// hyphens, at most 80 characters.
pub(crate) fn is_user_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= USER_NAME_MAX
        && value.split('-').all(|run| !run.is_empty() && run.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit()))
}

/// Where a home for `user_name` is created: `<folder>/<user_name>`, `folder` being the one the
/// person chose or `~/Mirror Homes`.
pub(crate) fn home_creation_target(user_home: &Path, folder: Option<&Path>, user_name: &str) -> Result<PathBuf, String> {
    if !is_user_name(user_name) {
        return Err("Your Mirror name must use lowercase letters, digits and single hyphens, up to 80 characters.".to_string());
    }
    let folder = match folder {
        Some(folder) if folder.is_absolute() => folder.to_path_buf(),
        Some(_) => return Err("Choose a folder for your Mirror home.".to_string()),
        None => user_home.join(DEFAULT_HOMES_FOLDER),
    };
    Ok(folder.join(user_name))
}

/// Have the host create a marked home at `home_path`.
pub(crate) fn create_home(app: &AppHandle, home_path: &Path, user_name: &str) -> Result<Value, MirrorHostError> {
    let params = json!({"request": {"homePath": home_path, "userName": user_name}});
    with_host(app, |host| host.request("createMarkedHome", params))
}

/// A refused home creation, in the words the setup screen shows.
pub(crate) fn describe_home_creation(error: MirrorHostError, home_path: &Path) -> String {
    let MirrorHostError::Rejected { reason, .. } = &error else { return describe(error) };
    match reason.as_str() {
        "home_exists" => format!("{} already exists. Choose another name or another folder.", home_path.display()),
        "reserved_location" => "That folder belongs to the terminal Mirror's homes. Choose another folder.".to_string(),
        "inside_repository" => format!(
            "{} is inside a code repository, such as a Mirror installation. Choose another folder.",
            home_path.parent().unwrap_or(home_path).display()
        ),
        "invalid_home_path" => "That folder can't hold a Mirror home: it must exist and not be a link. Choose another folder.".to_string(),
        "invalid_user_name" => "Your Mirror name must use lowercase letters, digits and single hyphens, up to 80 characters.".to_string(),
        "templates_unavailable" | "seed_failed" => {
            "Mirror could not fill in your new home, so nothing was created. Try again; if it fails again, reinstall Mirror Desktop TS.".to_string()
        }
        _ => describe(error),
    }
}

fn with_host<T>(app: &AppHandle, call: impl FnOnce(&mut MirrorHost) -> Result<T, MirrorHostError>) -> Result<T, MirrorHostError> {
    with_supervisor(&app.state::<MirrorHostState>().0, call)
}

/// Run `call` on the supervisor kept in `slot`, starting one on first use. The turns' host and
/// the learning host (slice 4a) are two slots, so learning never holds a turn's host.
pub(crate) fn with_supervisor<T>(
    slot: &Mutex<Option<MirrorHost>>,
    call: impl FnOnce(&mut MirrorHost) -> Result<T, MirrorHostError>,
) -> Result<T, MirrorHostError> {
    let mut guard = slot.lock().map_err(|_| MirrorHostError::Protocol("the Mirror host lock is poisoned".into()))?;
    if guard.is_none() {
        let directory = current_runtime_dir().map_err(MirrorHostError::SpawnFailed)?;
        let mut config = MirrorHostConfig::for_runtime(directory);
        // CR163's bound, single-sourced: the append deadline is the app's append timeout.
        config.deadlines.append = crate::MIRROR_APPEND_TIMEOUT;
        *guard = Some(MirrorHost::new(config));
    }
    call(guard.as_mut().expect("started above"))
}

/// Send `method` about the bound home.
pub(crate) fn request(app: &AppHandle, method: &str, params: Value) -> Result<Value, String> {
    let home = active_home(app)?;
    request_for(app, &home, method, params).map_err(describe)
}

/// Phase 4, slice 4b: the Desktop's Journey request envelope, unchanged from 0.2 but for the
/// whole-tree `expectedSourceVersion`, which the 0.3 tree has no longer. An edit carries its
/// Journey's `updatedAt` instead, and the core checks it.
pub(crate) const JOURNEY_MUTATION_SCHEMA: &str = "mirror.journey-mutation@1.0";
/// The exact sentence the frontend's `STALE_SOURCE_MESSAGE` compares by equality.
pub(crate) const JOURNEY_STALE_MESSAGE: &str = "Journeys changed in Mirror. Reload the tree and try again.";
const JOURNEY_MALFORMED: &str = "Journey mutation request is malformed.";

/// The core call (CV24.DS8) for one Desktop Journey request, with exactly the fields that
/// operation takes, as `journey mutate`'s `exact()` allowed them.
pub(crate) fn journey_call(request: &Value) -> Result<(&'static str, Value), String> {
    let malformed = || JOURNEY_MALFORMED.to_string();
    let envelope = request.as_object().ok_or_else(malformed)?;
    if envelope.keys().any(|key| !matches!(key.as_str(), "schemaVersion" | "requestId" | "operation" | "payload"))
        || envelope.get("schemaVersion").and_then(Value::as_str) != Some(JOURNEY_MUTATION_SCHEMA)
    {
        return Err(malformed());
    }
    let payload = envelope.get("payload").and_then(Value::as_object).ok_or_else(malformed)?;
    let (method, allowed, required): (&'static str, &[&str], &[&str]) = match envelope.get("operation").and_then(Value::as_str) {
        Some("create_journey") => ("addJourney", &["slug", "name", "description", "parentId", "position", "projectPath"], &["slug", "name", "description"]),
        Some("update_journey") => ("updateJourney", &["journeyId", "expectedUpdatedAt", "name", "description", "status"], &["journeyId", "expectedUpdatedAt"]),
        Some("set_project_path") => ("setJourneyProjectPath", &["journeyId", "projectPath"], &["journeyId", "projectPath"]),
        Some("clear_project_path") => ("setJourneyProjectPath", &["journeyId"], &["journeyId"]),
        Some("move_journey") => ("moveJourney", &["journeyId", "parentId", "position"], &["journeyId", "position"]),
        Some("delete_journey") => ("deleteJourney", &["journeyId"], &["journeyId"]),
        _ => return Err(malformed()),
    };
    if payload.keys().any(|key| !allowed.contains(&key.as_str())) || required.iter().any(|key| !payload.contains_key(*key)) {
        return Err(malformed());
    }
    let mut call = payload.clone();
    if method == "setJourneyProjectPath" && !call.contains_key("projectPath") {
        call.insert("projectPath".into(), Value::Null);
    }
    if method == "moveJourney" && !call.contains_key("parentId") {
        call.insert("parentId".into(), Value::Null);
    }
    Ok((method, Value::Object(call)))
}

/// A Journey refusal in the Navigator's words; any other failure as every host failure reads.
pub(crate) fn describe_journey_refusal(error: MirrorHostError) -> String {
    let MirrorHostError::Rejected { name, reason, .. } = &error else { return describe(error) };
    if name != "JourneyCallRejectedError" {
        return describe(error);
    }
    if let Some(classes) = reason.strip_prefix("journey_not_empty:") {
        return format!("Journey cannot be deleted because protected records remain: {}.", classes.replace('_', " ").replace(',', ", "));
    }
    match reason.as_str() {
        "journey_changed" => JOURNEY_STALE_MESSAGE.to_string(),
        "unknown_journey" => "Journey no longer exists in Mirror.".to_string(),
        "invalid_or_duplicate_slug" => "Journey slug is invalid or already exists.".to_string(),
        "invalid_name" => "Journey name is invalid.".to_string(),
        "invalid_description" => "Journey description must be 20 to 4,000 characters.".to_string(),
        "invalid_status" => "Journey status must be active, paused, completed or planned.".to_string(),
        "invalid_path" => "Project path must be an existing folder, given as a full path, and not a link.".to_string(),
        "unknown_parent" => "The selected parent Journey no longer exists.".to_string(),
        "invalid_parent" => "A Journey cannot be moved under itself or one of its own Journeys.".to_string(),
        "invalid_position" => "Journey position is invalid for the selected parent.".to_string(),
        _ => "Mirror refused the Journey change.".to_string(),
    }
}

/// Whether the tree holds `journey_id` anywhere.
pub(crate) fn tree_contains(nodes: &Value, journey_id: &str) -> bool {
    nodes.as_array().is_some_and(|nodes| {
        nodes.iter().any(|node| {
            node.get("id").and_then(Value::as_str) == Some(journey_id)
                || node.get("children").is_some_and(|children| tree_contains(children, journey_id))
        })
    })
}

/// Send one Journey call about the bound home; it answers `{ journeyId, tree }`.
pub(crate) fn request_journey(app: &AppHandle, method: &str, request: Value) -> Result<Value, String> {
    let home = active_home(app)?;
    request_for(app, &home, method, json!({ "request": request })).map_err(describe_journey_refusal)
}

/// The catalog script's `catalog` and `inspect`, answered by the host.
pub(crate) fn conversation_catalog(app: &AppHandle, operation: &str, journey_id: &str, additional_args: &[&str]) -> Result<Value, String> {
    let option = |name: &str| additional_args.windows(2).find(|pair| pair[0] == name).map(|pair| pair[1]);
    match operation {
        "catalog" => {
            let limit = option("--limit").and_then(|value| value.parse::<u64>().ok()).filter(|limit| (1..=100).contains(limit))
                .ok_or_else(|| CATALOG_REJECTED.to_string())?;
            let rows = request(app, "listJourneyConversations", json!({"request": {"journeyId": journey_id, "limit": limit}}))?;
            Ok(json!({
                "schemaVersion": "1.0.0", "operation": "catalog", "status": "ok",
                "journeyId": journey_id, "entries": catalog_entries(&rows)?,
            }))
        }
        "inspect" => {
            let conversation_id = option("--conversation-id").filter(|id| is_mirror_identifier(id))
                .ok_or_else(|| CATALOG_REJECTED.to_string())?;
            let found = request(app, "inspectConversation", json!({"request": {"conversationId": conversation_id}}))
                .map_err(|_| CATALOG_REJECTED.to_string())?;
            if found.get("journeyId").and_then(Value::as_str) != Some(journey_id)
                || found.get("conversationId").and_then(Value::as_str) != Some(conversation_id)
            {
                return Err(CATALOG_REJECTED.to_string());
            }
            Ok(json!({
                "schemaVersion": "1.0.0", "operation": "inspect", "status": "ok",
                "journeyId": journey_id, "conversationId": conversation_id,
            }))
        }
        "rename" => {
            let conversation_id = option("--conversation-id").filter(|id| is_mirror_identifier(id))
                .ok_or_else(|| CATALOG_REJECTED.to_string())?;
            let title = option("--title").ok_or_else(|| CATALOG_REJECTED.to_string())?;
            let result = request(app, "renameConversation", json!({"request": {"conversationId": conversation_id, "journeyId": journey_id, "title": title}}))
                .map_err(|_| CATALOG_REJECTED.to_string())?;
            rename_response(journey_id, conversation_id, &result)
        }
        "rebind-journey" => {
            let conversation_id = option("--conversation-id").filter(|id| is_mirror_identifier(id))
                .ok_or_else(|| CATALOG_REJECTED.to_string())?;
            let result = request(app, "rebindConversationJourney", json!({"request": {"conversationId": conversation_id, "journeyId": journey_id}}))
                .map_err(|_| CATALOG_REJECTED.to_string())?;
            rebind_response(journey_id, conversation_id, &result)
        }
        "delete" => Err(not_carried("Deleting Conversations")),
        _ => Err(CATALOG_REJECTED.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_follow_the_catalog_rule() {
        for good in ["a1b2c3d4", "conv-desktop-0001", "A.b:c-d_e"] {
            assert!(is_mirror_identifier(good), "{good}");
        }
        for bad in ["", "short", "-starts-with-dash", "has space in it", "slash/inside", &"x".repeat(257)] {
            assert!(!is_mirror_identifier(bad), "{bad}");
        }
        assert!(is_mirror_identifier(&"x".repeat(256)));
    }

    #[test]
    fn catalog_entries_keep_the_script_shape() {
        let rows = json!([
            {"conversationId": "conv-new-0001", "title": null, "startedAt": "2026-10-29T10:00:00Z", "messageCount": 2, "persona": "engineer"},
            {"conversationId": "conv-old-0001", "title": "Older", "startedAt": "2026-10-28T10:00:00Z", "messageCount": 0, "persona": null},
        ]);
        assert_eq!(
            catalog_entries(&rows).unwrap(),
            vec![
                json!({"kind": "mirror_history", "conversationId": "conv-new-0001", "title": "Untitled conversation",
                       "updatedAt": "2026-10-29T10:00:00Z", "messageCount": 2, "availability": "available_in_mirror", "persona": "engineer"}),
                json!({"kind": "mirror_history", "conversationId": "conv-old-0001", "title": "Older",
                       "updatedAt": "2026-10-28T10:00:00Z", "messageCount": 0, "availability": "available_in_mirror"}),
            ]
        );
    }

    #[test]
    fn catalog_entries_refuse_a_bad_or_repeated_identity() {
        let row = |id: &str| json!({"conversationId": id, "title": "t", "startedAt": "x", "messageCount": 1, "persona": null});
        assert!(catalog_entries(&json!([row("bad id")])).is_err());
        assert!(catalog_entries(&json!([row("conv-same-0001"), row("conv-same-0001")])).is_err());
        assert!(catalog_entries(&json!({"not": "a list"})).is_err());
        assert!(catalog_entries(&json!([{"conversationId": "conv-ok-00001"}])).is_err());
        assert_eq!(catalog_entries(&json!([])).unwrap(), Vec::<Value>::new());
    }

    #[test]
    fn the_registry_is_stamped_by_desktop_and_passes_its_validator() {
        let tree = json!({
            "roots": [{"id": "one", "name": "One", "updatedAt": "2026-10-29T00:00:00Z", "siblingPosition": 0,
                       "children": [{"id": "child", "name": "Child", "updatedAt": "2026-10-29T00:00:00Z", "parentId": "one"}]}],
            "findings": [],
        });
        let payload = registry_from_tree(&tree, "2026-10-29T12:00:00Z").unwrap();
        let value: Value = serde_json::from_str(&payload).unwrap();
        assert_eq!(value, json!({"schemaVersion": "0.1.0", "source": "mirror", "syncedAt": "2026-10-29T12:00:00Z", "roots": tree["roots"]}));
        crate::validate_journey_registry_payload(&payload).unwrap();
    }

    #[test]
    fn findings_travel_in_the_payload_and_a_malformed_tree_is_refused() {
        let finding = json!({"kind": "malformed_order", "journeyId": null});
        let tree = json!({"roots": [{"id": "a", "name": "A", "updatedAt": "x"}], "findings": [finding]});
        let value: Value = serde_json::from_str(&registry_from_tree(&tree, "2026-10-29T12:00:00Z").unwrap()).unwrap();
        assert_eq!(value["findings"], json!([finding]));
        for bad in [json!({"findings": []}), json!({"roots": [], "findings": {}}), json!([]), json!({"roots": [{"name": "no id"}], "findings": []})] {
            assert!(registry_from_tree(&bad, "2026-10-29T12:00:00Z").is_err(), "{bad}");
        }
    }

    fn scratch_dir(label: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!("mirror-host-bridge-{label}-{}-{:?}", std::process::id(), std::thread::current().id()));
        let _ = std::fs::remove_dir_all(&directory);
        std::fs::create_dir_all(&directory).unwrap();
        directory.canonicalize().unwrap()
    }

    fn lay_out_bundled(resources: &Path, platform: &str, host: &str) -> PathBuf {
        use sha2::{Digest, Sha256};
        let directory = resources.join("mirror-host");
        std::fs::create_dir_all(directory.join("node/bin")).unwrap();
        std::fs::write(directory.join("node/bin/node"), "").unwrap();
        std::fs::write(directory.join("host.mjs"), host).unwrap();
        let receipt = json!({"platform": platform, "host": {"sha256": format!("{:x}", Sha256::digest(host.as_bytes()))}});
        std::fs::write(directory.join("pin-receipt.json"), receipt.to_string()).unwrap();
        directory
    }

    #[test]
    fn a_packaged_app_runs_the_runtime_it_carries_on_every_channel() {
        let base = scratch_dir("bundled");
        let bundled = lay_out_bundled(&base.join("Resources"), "darwin-x64", "// host\n");
        let repository = base.join("repository");
        for channel in [RuntimeChannel::User, RuntimeChannel::Evaluation, RuntimeChannel::Development] {
            assert_eq!(runtime_dir(channel, Some(&base.join("Resources")), &repository, "x86_64").unwrap(), bundled);
        }
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn a_damaged_or_foreign_bundled_runtime_is_refused_not_replaced() {
        let base = scratch_dir("damaged");
        let resources = base.join("Resources");
        let repository = base.join("repository");
        std::fs::create_dir_all(repository.join(".mirror-host/runtime/darwin-x64")).unwrap();
        std::fs::write(repository.join(".mirror-host/runtime/darwin-x64/host.mjs"), "").unwrap();
        let bundled = lay_out_bundled(&resources, "darwin-arm64", "// host\n");
        let foreign = runtime_dir(RuntimeChannel::Development, Some(&resources), &repository, "x86_64").unwrap_err();
        assert!(foreign.contains("another Mac"), "{foreign}");
        lay_out_bundled(&resources, "darwin-x64", "// host\n");
        std::fs::write(bundled.join("host.mjs"), "// edited\n").unwrap();
        assert_eq!(runtime_dir(RuntimeChannel::User, Some(&resources), &repository, "x86_64").unwrap_err(), RUNTIME_MISSING);
        lay_out_bundled(&resources, "darwin-x64", "// host\n");
        std::fs::remove_file(bundled.join("node/bin/node")).unwrap();
        assert_eq!(runtime_dir(RuntimeChannel::User, Some(&resources), &repository, "x86_64").unwrap_err(), RUNTIME_MISSING);
        lay_out_bundled(&resources, "darwin-x64", "// host\n");
        std::fs::remove_file(bundled.join("pin-receipt.json")).unwrap();
        assert_eq!(runtime_dir(RuntimeChannel::Development, Some(&resources), &repository, "x86_64").unwrap_err(), RUNTIME_MISSING);
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn without_a_bundled_runtime_only_the_development_channel_falls_back_to_the_repository() {
        let base = scratch_dir("fallback");
        let repository = base.join("repository");
        std::fs::create_dir_all(repository.join(".mirror-host/runtime/darwin-x64")).unwrap();
        std::fs::write(repository.join(".mirror-host/runtime/darwin-x64/host.mjs"), "").unwrap();
        let empty_resources = base.join("Resources");
        std::fs::create_dir_all(&empty_resources).unwrap();
        for resources in [None, Some(empty_resources.as_path())] {
            assert_eq!(
                runtime_dir(RuntimeChannel::Development, resources, &repository, "x86_64").unwrap(),
                repository.join(".mirror-host/runtime/darwin-x64")
            );
            assert!(runtime_dir(RuntimeChannel::Development, resources, &repository, "aarch64").unwrap_err().contains("materialize"));
            assert!(runtime_dir(RuntimeChannel::Development, resources, &repository, "riscv64").unwrap_err().contains("riscv64"));
            for channel in [RuntimeChannel::User, RuntimeChannel::Evaluation] {
                assert_eq!(runtime_dir(channel, resources, &repository, "x86_64").unwrap_err(), RUNTIME_MISSING);
            }
        }
        let _ = std::fs::remove_dir_all(&base);
    }

    /// The real host, through the same functions the app's routes use. Run with
    /// `MIRROR_HOST_RUNTIME=<repo>/.mirror-host/runtime/<platform> cargo test -- --ignored real_host_feeds`.
    #[test]
    #[ignore]
    fn real_host_feeds_the_catalog_and_the_registry_in_the_shapes_the_app_reads() {
        let runtime = PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let parent = std::env::temp_dir().join(format!("mirror-bridge-real-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&parent);
        std::fs::create_dir_all(&parent).unwrap();
        let parent = parent.canonicalize().unwrap();
        let mut host = MirrorHost::new(MirrorHostConfig::for_runtime(runtime));
        host.request("createMarkedHome", json!({"request": {"homePath": parent.join("ana"), "userName": "ana"}})).unwrap();
        let home = MarkedHome::open(&parent.join("ana")).unwrap();

        let tree = host.request_for_home(&home, "readJourneyTree", json!({})).unwrap();
        let registry: Value = serde_json::from_str(&registry_from_tree(&tree, "2026-10-29T12:00:00Z").unwrap()).unwrap();
        let journey = registry["roots"][0]["id"].as_str().expect("a seeded home has a Journey").to_string();

        let ensured = host.request_for_home(&home, "ensureConversation",
            json!({"request": {"sessionId": "s-1", "journeyId": journey, "title": "Primeira", "interface": "mirror-desktop-ts"}})).unwrap();
        let conversation = ensured["conversationId"].as_str().unwrap().to_string();
        let rows = host.request_for_home(&home, "listJourneyConversations", json!({"request": {"journeyId": journey, "limit": 100}})).unwrap();
        let entries = catalog_entries(&rows).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0]["conversationId"], conversation.as_str());
        assert_eq!(entries[0]["title"], "Primeira");
        assert_eq!(entries[0]["availability"], "available_in_mirror");
        let inspected = host.request_for_home(&home, "inspectConversation", json!({"request": {"conversationId": conversation}})).unwrap();
        assert_eq!(inspected["journeyId"], journey.as_str());

        // Slice 2d-2: the writes, through the same adapters the app's routes use.
        let item = json!({
            "itemId": "turn-1", "runId": "run-1", "journeyId": journey, "conversationId": conversation,
            "sourceInterface": "nautilus-harness",
            "messages": [
                {"id": "user-real-0001", "role": "user", "content": "olá", "createdAt": "2026-10-29T12:00:00Z"},
                {"id": "assistant-real-0001", "role": "assistant", "content": "oi", "createdAt": "2026-10-29T12:00:01Z"},
            ],
        });
        let failures = parent.join("failures.jsonl");
        let accepted = crate::run_explicit_mirror_append_using(&item, |payload| {
            host.request_for_home(&home, "appendConversationMessages", json!({"request": payload}))
        }, &failures).unwrap();
        assert_eq!(accepted["insertedCount"], 2);
        let replay = crate::run_explicit_mirror_append_using(&item, |payload| {
            host.request_for_home(&home, "appendConversationMessages", json!({"request": payload}))
        }, &failures).unwrap();
        assert_eq!(replay["existingCount"], 2, "a replay is idempotent");
        let mut conflicting = item.clone();
        conflicting["messages"][0]["content"] = json!("changed");
        assert_eq!(crate::run_explicit_mirror_append_using(&conflicting, |payload| {
            host.request_for_home(&home, "appendConversationMessages", json!({"request": payload}))
        }, &failures).unwrap_err(), "mirror_append_idempotency_conflict");
        assert!(!failures.to_string_lossy().is_empty() && failures.exists());

        let renamed = host.request_for_home(&home, "renameConversation",
            json!({"request": {"conversationId": conversation, "journeyId": journey, "title": "Renomeada"}})).unwrap();
        assert_eq!(rename_response(&journey, &conversation, &renamed).unwrap()["title"], "Renomeada");
        let rebound = host.request_for_home(&home, "rebindConversationJourney",
            json!({"request": {"conversationId": conversation, "journeyId": "outra-journey"}})).unwrap();
        assert_eq!(rebind_response("outra-journey", &conversation, &rebound).unwrap()["previousJourneyId"], journey.as_str());
        let _ = std::fs::remove_dir_all(&parent);
    }

    fn journey_request(operation: &str, payload: Value) -> Value {
        json!({"schemaVersion": JOURNEY_MUTATION_SCHEMA, "requestId": "request-001", "operation": operation, "payload": payload})
    }

    #[test]
    fn each_journey_request_becomes_its_core_call_with_exactly_its_fields() {
        let cases = [
            ("create_journey", json!({"slug": "work", "name": "Work", "description": "d", "parentId": null, "position": 0}), "addJourney",
             json!({"slug": "work", "name": "Work", "description": "d", "parentId": null, "position": 0})),
            ("update_journey", json!({"journeyId": "work", "expectedUpdatedAt": "t", "name": "W"}), "updateJourney",
             json!({"journeyId": "work", "expectedUpdatedAt": "t", "name": "W"})),
            ("set_project_path", json!({"journeyId": "work", "projectPath": "/p"}), "setJourneyProjectPath", json!({"journeyId": "work", "projectPath": "/p"})),
            ("clear_project_path", json!({"journeyId": "work"}), "setJourneyProjectPath", json!({"journeyId": "work", "projectPath": null})),
            ("move_journey", json!({"journeyId": "work", "position": 1}), "moveJourney", json!({"journeyId": "work", "parentId": null, "position": 1})),
            ("delete_journey", json!({"journeyId": "work"}), "deleteJourney", json!({"journeyId": "work"})),
        ];
        for (operation, payload, method, call) in cases {
            assert_eq!(journey_call(&journey_request(operation, payload)).unwrap(), (method, call), "{operation}");
        }
    }

    #[test]
    fn a_journey_request_outside_its_operation_s_fields_is_refused() {
        let malformed = [
            journey_request("create_journey", json!({"slug": "work", "name": "Work"})),
            journey_request("update_journey", json!({"journeyId": "work", "name": "W"})),
            journey_request("update_journey", json!({"journeyId": "work", "expectedUpdatedAt": "t", "slug": "renamed"})),
            journey_request("clear_project_path", json!({"journeyId": "work", "projectPath": "/p"})),
            journey_request("delete_journey", json!({"journeyId": "work", "force": true})),
            journey_request("rename_journey", json!({"journeyId": "work"})),
            json!({"schemaVersion": "other", "operation": "delete_journey", "payload": {"journeyId": "work"}}),
            json!({"schemaVersion": JOURNEY_MUTATION_SCHEMA, "expectedSourceVersion": "x", "operation": "delete_journey", "payload": {"journeyId": "work"}}),
            json!({"schemaVersion": JOURNEY_MUTATION_SCHEMA, "operation": "delete_journey", "payload": []}),
        ];
        for request in malformed {
            assert_eq!(journey_call(&request).unwrap_err(), JOURNEY_MALFORMED, "{request}");
        }
    }

    #[test]
    fn a_journey_refusal_reads_as_a_sentence_and_a_stale_edit_as_the_reload_message() {
        let refused = |reason: &str| MirrorHostError::Rejected { name: "JourneyCallRejectedError".into(), reason: reason.into(), message: reason.into() };
        assert_eq!(describe_journey_refusal(refused("journey_changed")), JOURNEY_STALE_MESSAGE);
        assert_eq!(
            describe_journey_refusal(refused("journey_not_empty:conversations,runtime_sessions")),
            "Journey cannot be deleted because protected records remain: conversations, runtime sessions."
        );
        for reason in ["unknown_journey", "invalid_or_duplicate_slug", "invalid_name", "invalid_description", "invalid_status",
                       "invalid_path", "unknown_parent", "invalid_parent", "invalid_position", "something_new"] {
            let sentence = describe_journey_refusal(refused(reason));
            assert!(sentence.ends_with('.') && !sentence.contains('_'), "{reason}: {sentence}");
        }
        let other = MirrorHostError::Rejected { name: "DatabaseNotCurrentError".into(), reason: "ahead".into(), message: String::new() };
        assert_eq!(describe_journey_refusal(other), "Mirror refused the request (DatabaseNotCurrentError: ahead).");
    }

    #[test]
    fn the_tree_is_searched_at_every_depth() {
        let roots = json!([{"id": "a", "children": [{"id": "b", "children": [{"id": "c"}]}]}, {"id": "d"}]);
        for id in ["a", "b", "c", "d"] {
            assert!(tree_contains(&roots, id), "{id}");
        }
        assert!(!tree_contains(&roots, "e"));
        assert!(!tree_contains(&json!({}), "a"));
    }

    /// Slice 4b through the real core: create, edit, move, path, delete, and the refusals the
    /// app names. Run as `real_host_feeds` is.
    #[test]
    #[ignore]
    fn real_host_administers_journeys_in_the_shapes_the_app_reads() {
        let runtime = PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let parent = std::env::temp_dir().join(format!("mirror-bridge-journeys-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&parent);
        std::fs::create_dir_all(&parent).unwrap();
        let parent = parent.canonicalize().unwrap();
        let mut host = MirrorHost::new(MirrorHostConfig::for_runtime(runtime));
        host.request("createMarkedHome", json!({"request": {"homePath": parent.join("ana"), "userName": "ana"}})).unwrap();
        let home = MarkedHome::open(&parent.join("ana")).unwrap();
        let mut send = |operation: &str, payload: Value| {
            let (method, call) = journey_call(&journey_request(operation, payload)).unwrap();
            host.request_for_home(&home, method, json!({"request": call})).map_err(describe_journey_refusal)
        };
        let created = send("create_journey", json!({"slug": "escrita", "name": "Escrita", "description": "Um lugar para escrever o livro.", "parentId": null, "position": 1})).unwrap();
        let registry: Value = serde_json::from_str(&registry_from_tree(&created["tree"], "2026-10-30T12:00:00Z").unwrap()).unwrap();
        assert_eq!(registry["roots"][1]["id"], "escrita");
        assert_eq!(registry["roots"][1]["name"], "Escrita");
        let updated_at = registry["roots"][1]["updatedAt"].as_str().unwrap().to_string();
        let edited = send("update_journey", json!({"journeyId": "escrita", "expectedUpdatedAt": updated_at, "name": "O Livro", "status": "paused"})).unwrap();
        assert_eq!(edited["tree"]["roots"][1]["name"], "O Livro");
        assert_eq!(edited["tree"]["roots"][1]["status"], "paused");
        assert_eq!(send("update_journey", json!({"journeyId": "escrita", "expectedUpdatedAt": updated_at, "name": "Tarde"})).unwrap_err(), JOURNEY_STALE_MESSAGE);
        let project = parent.join("projeto");
        std::fs::create_dir_all(&project).unwrap();
        let pathed = send("set_project_path", json!({"journeyId": "escrita", "projectPath": project})).unwrap();
        assert_eq!(pathed["tree"]["roots"][1]["projectPath"], json!(project));
        assert!(send("set_project_path", json!({"journeyId": "escrita", "projectPath": "relativo"})).unwrap_err().contains("full path"));
        send("clear_project_path", json!({"journeyId": "escrita"})).unwrap();
        let seeded = registry["roots"][0]["id"].as_str().unwrap().to_string();
        let moved = send("move_journey", json!({"journeyId": "escrita", "parentId": seeded, "position": 0})).unwrap();
        assert!(tree_contains(&moved["tree"]["roots"][0]["children"], "escrita"));
        assert_eq!(send("delete_journey", json!({"journeyId": seeded})).unwrap_err(),
            "Journey cannot be deleted because protected records remain: child journeys.");
        let deleted = send("delete_journey", json!({"journeyId": "escrita"})).unwrap();
        assert!(!tree_contains(&deleted["tree"]["roots"], "escrita"));
        let _ = std::fs::remove_dir_all(&parent);
    }

    #[test]
    fn rename_and_rebind_answers_keep_the_script_shape() {
        let renamed = json!({"conversationId": "conv-one-0001", "journeyId": "j1", "title": "Nova"});
        assert_eq!(
            rename_response("j1", "conv-one-0001", &renamed).unwrap(),
            json!({"schemaVersion": "1.0.0", "operation": "rename", "status": "ok", "journeyId": "j1", "conversationId": "conv-one-0001", "title": "Nova"})
        );
        assert!(rename_response("j1", "conv-other-001", &renamed).is_err());
        assert!(rename_response("j2", "conv-one-0001", &renamed).is_err());
        let rebound = json!({"conversationId": "conv-one-0001", "journeyId": "j2", "rebound": true, "previousJourneyId": "j1"});
        assert_eq!(
            rebind_response("j2", "conv-one-0001", &rebound).unwrap(),
            json!({"schemaVersion": "1.0.0", "operation": "rebind-journey", "status": "ok", "journeyId": "j2",
                   "conversationId": "conv-one-0001", "rebound": true, "previousJourneyId": "j1"})
        );
        assert!(rebind_response("j2", "conv-one-0001", &json!({"conversationId": "conv-one-0001", "journeyId": "j2"})).is_err());
    }

    #[test]
    fn a_created_home_is_named_for_its_user_inside_mirror_unless_another_folder_was_chosen() {
        let user_home = Path::new("/Users/ana");
        assert_eq!(home_creation_target(user_home, None, "ana-souza").unwrap(), PathBuf::from("/Users/ana/Mirror Homes/ana-souza"));
        // Never a Mirror checkout's name, in any case: APFS folds case.
        assert_ne!(DEFAULT_HOMES_FOLDER.to_lowercase(), "mirror");
        assert_eq!(
            home_creation_target(user_home, Some(Path::new("/Volumes/Notes")), "ana").unwrap(),
            PathBuf::from("/Volumes/Notes/ana")
        );
        assert!(home_creation_target(user_home, Some(Path::new("notes")), "ana").is_err());
        for refused in ["", "Ana", "ana souza", "ana--souza", "-ana", "ana-", "ana/..", "..", "ana_souza", "josé", &"a".repeat(81)] {
            assert!(home_creation_target(user_home, None, refused).is_err(), "{refused:?}");
        }
        assert!(is_user_name(&"a".repeat(80)) && is_user_name("ana-2") && is_user_name("7"));
    }

    #[test]
    fn a_refused_home_creation_reads_as_a_sentence_naming_what_to_do() {
        let rejected = |reason: &str| MirrorHostError::Rejected { name: "HomeCreationRefusedError".into(), reason: reason.into(), message: "m".into() };
        let target = Path::new("/Users/ana/Mirror Homes/ana");
        assert!(describe_home_creation(rejected("home_exists"), target).starts_with("/Users/ana/Mirror Homes/ana already exists."));
        for reason in ["reserved_location", "inside_repository", "invalid_home_path", "invalid_user_name", "templates_unavailable", "seed_failed"] {
            let sentence = describe_home_creation(rejected(reason), target);
            assert!(!sentence.contains(reason) && !sentence.contains("Rejected"), "{reason}: {sentence}");
        }
        assert!(describe_home_creation(MirrorHostError::Unavailable { failures: 3 }, target).contains("unavailable"));
    }

    #[test]
    fn what_0_3_does_not_carry_says_so() {
        for what in ["Deleting Conversations", "Journey administration", "Terminal recall", "The Canvas"] {
            assert_eq!(not_carried(what), format!("{what} is not available in Mirror Desktop TS yet."));
        }
    }

    #[test]
    fn a_host_error_reads_as_a_sentence() {
        assert_eq!(
            describe(MirrorHostError::Rejected { name: "DatabaseNotCurrentError".into(), reason: "pending".into(), message: "m".into() }),
            "Mirror refused the request (DatabaseNotCurrentError: pending)."
        );
        assert!(describe(MirrorHostError::HomeNotMarked("x is not a marked 0.3 home.".into())).contains("not a marked 0.3 home"));
        assert!(describe(MirrorHostError::Unavailable { failures: 3 }).contains("unavailable"));
    }
}
