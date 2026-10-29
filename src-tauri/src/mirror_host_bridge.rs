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
//! Until slice 2f bundles the runtime into the app, only the Development channel finds one, in the
//! repository's `.mirror-host/runtime/<platform>`.

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

/// Where the laid-out runtime is, for `channel`.
pub(crate) fn runtime_dir(channel: RuntimeChannel, repository: &Path, arch: &str) -> Result<PathBuf, String> {
    let platform = match arch {
        "x86_64" => "darwin-x64",
        "aarch64" => "darwin-arm64",
        other => return Err(format!("No Mirror host runtime is pinned for {other}.")),
    };
    if channel != RuntimeChannel::Development {
        return Err("The Mirror host runtime ships inside the app from DS-005 slice 2f; until then only Mirror Desktop TS Dev runs it.".to_string());
    }
    let directory = repository.join(".mirror-host").join("runtime").join(platform);
    if !directory.join("host.mjs").is_file() {
        return Err(format!("No Mirror host runtime at {}. Run: node scripts/mirror_host_pin.mjs materialize", directory.display()));
    }
    directory.canonicalize().map_err(|error| format!("Could not resolve {}: {error}", directory.display()))
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
    let state = app.state::<MirrorHostState>();
    let mut guard = state.0.lock().map_err(|_| MirrorHostError::Protocol("the Mirror host lock is poisoned".into()))?;
    if guard.is_none() {
        let directory = runtime_dir(
            RuntimeChannel::active(),
            &Path::new(env!("CARGO_MANIFEST_DIR")).join(".."),
            std::env::consts::ARCH,
        )
        .map_err(MirrorHostError::SpawnFailed)?;
        *guard = Some(MirrorHost::new(MirrorHostConfig::for_runtime(directory)));
    }
    guard.as_mut().expect("started above").request_for_home(home, method, params)
}

/// Send `method` about the bound home.
pub(crate) fn request(app: &AppHandle, method: &str, params: Value) -> Result<Value, String> {
    let home = active_home(app)?;
    request_for(app, &home, method, params).map_err(describe)
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
        _ => Err(crate::runtime_channel::UV_RETIRED.to_string()),
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

    #[test]
    fn only_the_development_channel_finds_a_runtime_until_2f() {
        let repository = std::env::temp_dir().join(format!("mirror-host-bridge-{}", std::process::id()));
        let runtime = repository.join(".mirror-host/runtime/darwin-x64");
        std::fs::create_dir_all(&runtime).unwrap();
        std::fs::write(runtime.join("host.mjs"), "").unwrap();
        let repository = repository.canonicalize().unwrap();
        assert_eq!(
            runtime_dir(RuntimeChannel::Development, &repository, "x86_64").unwrap(),
            repository.join(".mirror-host/runtime/darwin-x64")
        );
        assert!(runtime_dir(RuntimeChannel::Development, &repository, "aarch64").unwrap_err().contains("materialize"));
        assert!(runtime_dir(RuntimeChannel::Development, &repository, "riscv64").unwrap_err().contains("riscv64"));
        for channel in [RuntimeChannel::User, RuntimeChannel::Evaluation] {
            assert!(runtime_dir(channel, &repository, "x86_64").unwrap_err().contains("2f"));
        }
        let _ = std::fs::remove_dir_all(&repository);
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
        host.request("createHome", json!({"request": {"homePath": parent.join("ana"), "userName": "ana"}})).unwrap();
        std::fs::create_dir_all(parent.join("ana/.mirror-desktop")).unwrap();
        std::fs::write(parent.join("ana/.mirror-desktop/home.json"), r#"{"line":"0.3","homeId":"home-bridge-0001","createdAt":"2026-10-29T00:00:00Z"}"#).unwrap();
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
        let _ = std::fs::remove_dir_all(&parent);
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
