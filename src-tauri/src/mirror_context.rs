//! CV-010.DS-005 slice 3d: Mirror's context before the model.
//!
//! Before a mediated turn starts Pi, the app asks the Mirror host for the turn's context (Core's
//! `deliverMirrorContext`, the terminal's doorman as a call) with the OpenRouter key kept in the
//! Keychain. A block is written, owner-only, to a file of this turn's in the home's state folder,
//! and Pi starts with the app's own extension (`mirror-host/mirror-context.mjs`, checked against the
//! runtime's receipt) and `MIRROR_DESKTOP_CONTEXT_FILE` naming the file. The extension hands the
//! block to the model as the hidden `mirror-context` message the terminal sends.
//!
//! Context never blocks a turn. No key, a refusal, the host's deadline (30 s, longer than Core's
//! own provider bounds) or a block it cannot write: the turn goes on without context and says so
//! once, as a warning on the turn.
//!
//! When the turn ends the file and its compaction marker are removed. If Pi compacted the session
//! during the turn, the extension left the marker, and the host is told: the next turn delivers the
//! full folder again. A manual compaction tells the host too.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

pub(crate) const CONTEXT_ENV: &str = "MIRROR_DESKTOP_CONTEXT_FILE";
const CONTEXT_DIR: &str = "mirror-context";
const MAX_BLOCK_BYTES: usize = 1_048_576;
const WITHOUT: &str = "This turn went without Mirror's context:";

/// What a turn carries into Pi: the file the extension reads (it may never be written), and the
/// warning to show when there is no context.
pub(crate) struct TurnContext {
    pub file: Option<PathBuf>,
    pub note: Option<String>,
}

/// The host's answer, as the turn needs it.
#[derive(Debug, PartialEq)]
pub(crate) enum Delivery {
    Nothing,
    Block(String),
}

pub(crate) fn parse_delivery(result: &Value) -> Result<Delivery, String> {
    let kind = result.get("kind").and_then(Value::as_str);
    let block = result.get("block").and_then(Value::as_str);
    match (kind, block) {
        (Some("nothing"), _) => Ok(Delivery::Nothing),
        (Some("full" | "delta"), Some(block)) if !block.trim().is_empty() => Ok(Delivery::Block(block.to_string())),
        _ => Err("the Mirror host's answer could not be read.".to_string()),
    }
}

/// A file name of this turn's own, unguessable, so two turns never share one.
pub(crate) fn context_file_in(dir: &Path) -> PathBuf {
    use std::io::Read;
    let mut bytes = [0u8; 12];
    let random = std::fs::File::open("/dev/urandom").and_then(|mut source| source.read_exact(&mut bytes));
    if random.is_err() {
        let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
        bytes.copy_from_slice(&nanos.to_le_bytes()[..12]);
    }
    dir.join(format!("turn-{}.md", bytes.iter().map(|byte| format!("{byte:02x}")).collect::<String>()))
}

fn write_owner_only(path: &Path, text: &str) -> std::io::Result<()> {
    use std::os::unix::fs::OpenOptionsExt;
    let mut file = std::fs::OpenOptions::new().write(true).create_new(true).mode(0o600).open(path)?;
    file.write_all(text.as_bytes())?;
    file.sync_all()
}

/// Ask for the turn's context and lay it down in `dir`. `key` is the Keychain's answer; `ask` sends
/// the request to the host with the key.
pub(crate) fn prepare_in(
    dir: Result<PathBuf, String>,
    key: Result<Option<String>, String>,
    ask: impl FnOnce(&str) -> Result<Value, String>,
) -> TurnContext {
    let without = |why: String| TurnContext { file: None, note: Some(format!("{WITHOUT} {why}")) };
    let dir = match dir.and_then(|dir| {
        std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
        set_owner_only_dir(&dir).map(|()| dir)
    }) {
        Ok(dir) => dir,
        Err(error) => return without(format!("its folder could not be prepared ({error}).")),
    };
    let file = context_file_in(&dir);
    let key = match key {
        Ok(Some(key)) if !key.trim().is_empty() => key,
        Ok(_) => {
            return TurnContext {
                file: Some(file),
                note: Some(format!("{WITHOUT} no OpenRouter key is kept. Add one in Settings › Connections.")),
            }
        }
        Err(error) => return TurnContext { file: Some(file), note: Some(format!("{WITHOUT} {error}")) },
    };
    let delivery = ask(&key).and_then(|result| parse_delivery(&result));
    match delivery {
        Ok(Delivery::Nothing) => TurnContext { file: Some(file), note: None },
        Ok(Delivery::Block(block)) if block.len() > MAX_BLOCK_BYTES => {
            TurnContext { file: Some(file), note: Some(format!("{WITHOUT} the block exceeded {MAX_BLOCK_BYTES} bytes.")) }
        }
        Ok(Delivery::Block(block)) => match write_owner_only(&file, &block) {
            Ok(()) => TurnContext { file: Some(file), note: None },
            Err(error) => {
                let _ = std::fs::remove_file(&file);
                TurnContext { file: Some(file), note: Some(format!("{WITHOUT} it could not be written ({error}).")) }
            }
        },
        Err(error) => TurnContext { file: Some(file), note: Some(format!("{WITHOUT} {error}")) },
    }
}

fn set_owner_only_dir(dir: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let metadata = std::fs::symlink_metadata(dir).map_err(|error| error.to_string())?;
    if !metadata.is_dir() {
        return Err("it is not a folder".to_string());
    }
    std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700)).map_err(|error| error.to_string())
}

/// The compaction marker the extension leaves beside a turn's file.
pub(crate) fn compaction_marker(file: &Path) -> PathBuf {
    let mut name = file.as_os_str().to_owned();
    name.push(".compacted");
    PathBuf::from(name)
}

/// The turn's leftovers removed; whether Pi compacted during it.
pub(crate) fn finish_in(file: &Path) -> bool {
    let marker = compaction_marker(file);
    let compacted = std::fs::symlink_metadata(&marker).is_ok();
    let _ = std::fs::remove_file(file);
    let _ = std::fs::remove_file(&marker);
    compacted
}

/// The extension, when it is the one the runtime's receipt records.
pub(crate) fn context_extension(runtime_dir: &Path) -> Result<PathBuf, String> {
    let damaged = || crate::mirror_host_bridge::RUNTIME_MISSING.to_string();
    let receipt: Value = std::fs::read(runtime_dir.join("pin-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(damaged)?;
    let extension = runtime_dir.join("mirror-context.mjs");
    let recorded = receipt.pointer("/mirrorContext/sha256").and_then(Value::as_str).ok_or_else(damaged)?;
    let actual = std::fs::read(&extension).ok().map(|bytes| format!("{:x}", Sha256::digest(bytes)));
    if actual.as_deref() != Some(recorded) {
        return Err(damaged());
    }
    Ok(extension)
}

/// Removes the turn's file when the turn ends, and tells the host if Pi compacted meanwhile.
pub(crate) struct TurnContextGuard {
    app: AppHandle,
    session_id: String,
    file: Option<PathBuf>,
}

impl Drop for TurnContextGuard {
    fn drop(&mut self) {
        if let Some(file) = self.file.take() {
            if finish_in(&file) {
                let _ = forget(&self.app, &self.session_id);
            }
        }
    }
}

/// The context for one mediated turn, and the guard that cleans up after it.
pub(crate) fn prepare_turn(app: &AppHandle, session_id: &str, prompt: &str, journey_id: &str) -> (TurnContext, TurnContextGuard) {
    let dir = crate::home_state::home_state_dir(app).map(|dir| dir.join(CONTEXT_DIR));
    let key = crate::openrouter_key::kept_key(app).map_err(|error| format!("the OpenRouter key could not be read ({error})."));
    let context = prepare_in(dir, key, |key| {
        crate::mirror_host_bridge::request(
            app,
            "deliverMirrorContext",
            json!({"request": {"sessionId": session_id, "prompt": prompt, "journeyId": journey_id}, "apiKey": key}),
        )
    });
    let guard = TurnContextGuard { app: app.clone(), session_id: session_id.to_string(), file: context.file.clone() };
    (context, guard)
}

/// Tell the host the session's transcript was compacted.
pub(crate) fn forget(app: &AppHandle, session_id: &str) -> Result<(), String> {
    crate::mirror_host_bridge::request(app, "forgetMirrorContext", json!({"request": {"sessionId": session_id}})).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    fn scratch(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("mirror-context-{label}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn a_block_is_written_owner_only_in_an_owner_only_folder_and_the_key_goes_to_the_host() {
        let dir = scratch("block").join(CONTEXT_DIR);
        let mut sent = None;
        let context = prepare_in(Ok(dir.clone()), Ok(Some("sk-or-kept".into())), |key| {
            sent = Some(key.to_string());
            Ok(json!({"kind": "full", "block": "=== mirror context ===\nhello", "persona": null, "journey": "j"}))
        });
        assert_eq!(sent.as_deref(), Some("sk-or-kept"));
        assert_eq!(context.note, None);
        let file = context.file.unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "=== mirror context ===\nhello");
        assert_eq!(std::fs::metadata(&file).unwrap().permissions().mode() & 0o777, 0o600);
        assert_eq!(std::fs::metadata(&dir).unwrap().permissions().mode() & 0o777, 0o700);
        assert!(!std::fs::read_to_string(&file).unwrap().contains("sk-or"), "the key is never written");
    }

    #[test]
    fn nothing_gives_a_file_name_but_no_file_and_no_warning() {
        let dir = scratch("nothing");
        let context = prepare_in(Ok(dir), Ok(Some("k".into())), |_| Ok(json!({"kind": "nothing", "block": ""})));
        assert_eq!(context.note, None);
        assert!(!context.file.unwrap().exists());
    }

    #[test]
    fn without_a_key_the_host_is_not_asked_and_the_turn_says_so() {
        for key in [Ok(None), Ok(Some("   ".to_string()))] {
            let context = prepare_in(Ok(scratch("nokey")), key, |_| panic!("the host was asked"));
            assert!(context.note.unwrap().contains("no OpenRouter key is kept"));
        }
        let context = prepare_in(Ok(scratch("keychain")), Err("the Keychain said no".into()), |_| panic!("the host was asked"));
        assert_eq!(context.note.as_deref(), Some("This turn went without Mirror's context: the Keychain said no"));
    }

    #[test]
    fn a_refusal_a_timeout_or_an_unreadable_answer_goes_on_without_context() {
        let refused = prepare_in(Ok(scratch("refused")), Ok(Some("k".into())), |_| Err("The Mirror host did not answer deliverMirrorContext in time; it was restarted.".into()));
        assert!(refused.note.unwrap().ends_with("in time; it was restarted."));
        assert!(!refused.file.unwrap().exists());
        for answer in [json!({"kind": "full"}), json!({"kind": "delta", "block": "  "}), json!({"kind": "other", "block": "x"}), json!(null)] {
            let context = prepare_in(Ok(scratch("unreadable")), Ok(Some("k".into())), |_| Ok(answer.clone()));
            assert!(context.note.unwrap().contains("could not be read"), "{answer}");
            assert!(!context.file.unwrap().exists());
        }
        let huge = prepare_in(Ok(scratch("huge")), Ok(Some("k".into())), |_| Ok(json!({"kind": "full", "block": "x".repeat(MAX_BLOCK_BYTES + 1)})));
        assert!(huge.note.unwrap().contains("exceeded"));
        assert!(!huge.file.unwrap().exists());
    }

    #[test]
    fn a_folder_that_is_a_link_or_a_file_is_refused() {
        let base = scratch("folder");
        std::fs::write(base.join("plain"), "x").unwrap();
        let context = prepare_in(Ok(base.join("plain")), Ok(Some("k".into())), |_| panic!("asked"));
        assert!(context.note.unwrap().contains("could not be prepared"));
        assert!(context.file.is_none());
        std::os::unix::fs::symlink(&base, base.join("link")).unwrap();
        let linked = prepare_in(Ok(base.join("link")), Ok(Some("k".into())), |_| panic!("asked"));
        assert!(linked.note.unwrap().contains("not a folder"));
        let unresolved = prepare_in(Err("unbound".into()), Ok(Some("k".into())), |_| panic!("asked"));
        assert!(unresolved.note.unwrap().contains("unbound"));
    }

    #[test]
    fn finishing_removes_the_file_and_says_whether_pi_compacted() {
        let dir = scratch("finish");
        let file = context_file_in(&dir);
        std::fs::write(&file, "block").unwrap();
        assert!(!finish_in(&file));
        assert!(!file.exists());
        std::fs::write(compaction_marker(&file), "").unwrap();
        assert!(finish_in(&file));
        assert!(!compaction_marker(&file).exists());
        assert_ne!(context_file_in(&dir), context_file_in(&dir), "each turn its own name");
    }

    /// The entries Pi 1.4.0 wrote for a turn with context, measured with a local provider: the
    /// block is a `custom_message` between the person's message and the answer.
    #[test]
    fn the_block_pi_keeps_is_neither_shown_nor_recorded_as_the_turn() {
        let session = [
            json!({"type":"session","id":"s","version":3}),
            json!({"type":"message","id":"u1","parentId":null,"timestamp":"2026-10-30T12:00:00Z","message":{"role":"user","content":[{"type":"text","text":"hello there"}]}}),
            json!({"type":"custom_message","id":"c1","parentId":"u1","timestamp":"2026-10-30T12:00:01Z","customType":"mirror-context","content":"=== mirror context ===\nPRIVATE-BLOCK","display":false}),
            json!({"type":"message","id":"a1","parentId":"c1","timestamp":"2026-10-30T12:00:02Z","message":{"role":"assistant","content":[{"type":"text","text":"ok"}],"stopReason":"stop"}}),
        ]
        .iter()
        .map(Value::to_string)
        .collect::<Vec<_>>()
        .join("\n");
        let branch = crate::project_active_pi_branch(&session).unwrap();
        let turn = crate::project_pi_run_from_branch(&branch, None).unwrap();
        assert_eq!((turn.user_entry_id.as_str(), turn.assistant_entry_id.as_str()), ("u1", "a1"));
        assert_eq!((turn.user_text.as_str(), turn.assistant_text.as_str()), ("hello there", "ok"));
        let shown = crate::project_pi_transcript_entries(&branch);
        assert_eq!(shown.iter().map(|entry| entry.entry_id.as_str()).collect::<Vec<_>>(), ["u1", "a1"]);
        assert!(!serde_json::to_string(&shown).unwrap().contains("PRIVATE-BLOCK"));
    }

    #[test]
    fn the_extension_is_used_only_as_the_receipt_records_it() {
        let runtime = scratch("receipt");
        std::fs::write(runtime.join("mirror-context.mjs"), "export default () => {};").unwrap();
        let sha = format!("{:x}", Sha256::digest(b"export default () => {};"));
        assert!(context_extension(&runtime).is_err(), "no receipt");
        std::fs::write(runtime.join("pin-receipt.json"), json!({"mirrorContext": {"sha256": sha}}).to_string()).unwrap();
        assert_eq!(context_extension(&runtime).unwrap(), runtime.join("mirror-context.mjs"));
        std::fs::write(runtime.join("mirror-context.mjs"), "export default () => { steal(); };").unwrap();
        assert!(context_extension(&runtime).is_err(), "changed after the receipt");
    }
}
