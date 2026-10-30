//! CR149: the serialisation the main thread used to provide, now explicit.
//!
//! Until CR149 every non-`async` command ran inline on the macOS main thread, inside the
//! `WKURLSchemeHandler` callback that delivers Tauri's IPC. `sample` showed a settlement spending
//! **5,984 ms on that thread** — reading, parsing, re-serialising and fsyncing multi-megabyte JSON
//! on the thread AppKit uses to deliver key events to every window of the process. That is the
//! whole-app freeze during `Finishing`, and why it crossed Journeys.
//!
//! Moving commands to `#[tauri::command(async)]` frees the main thread, but it also removes an
//! accidental guarantee: the main thread serialised every one of those commands against every
//! other. Nothing in the data layer was ever asked to tolerate two commands at once.
//!
//! This module restores exactly that guarantee, by construction, so the thread move changes *where*
//! the work runs and nothing else. Every converted command acquires this lock as its first
//! statement. Finer-grained locking is a later decision with its own evidence; this slice's claim
//! is "same semantics, different thread", and the tests below hold it to that.
//!
//! The lock is a `std::sync::Mutex` held across blocking I/O on a tokio worker. That is acceptable
//! because converted commands never `.await` while holding it, and the renderer awaits settlement
//! phases one at a time, so the queue depth is small against the runtime's worker count.

use std::sync::{Mutex, MutexGuard};

static SERIAL: Mutex<()> = Mutex::new(());

/// Acquire the command serialisation guard. A poisoned lock is recovered rather than propagated:
/// a panic inside one command must not make every later command fail.
pub(crate) fn acquire() -> MutexGuard<'static, ()> {
    SERIAL.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    /// Every file that declares a `#[tauri::command]`. A command in a file not listed here would be
    /// invisible to these tests, so the count assertion below pins the total.
    const SOURCES: &[&str] = &[
        include_str!("main.rs"),
        include_str!("voice_transcription.rs"),
        include_str!("whats_new_state.rs"),
        include_str!("journey_appearance.rs"),
        include_str!("agent_settings.rs"),
        include_str!("model_intents.rs"),
        include_str!("pi_install.rs"),
        include_str!("pi_auth.rs"),
        include_str!("openrouter_key.rs"),
    ];

    /// Commands that stay on the main thread. Each is either a native dialog, hands off to another
    /// application, or is window lifecycle — none reads or writes application data, so none can
    /// race a serialised command.
    const KEPT_ON_MAIN_THREAD: &[&str] = &[
        "choose_file_attachments",
        "choose_project_directory",
        "choose_runtime_directory",
        "open_external_url",
        "open_journey_document",
        "open_local_reference",
        "reveal_journey_artifact",
        "confirm_desktop_quit",
        "cancel_desktop_quit",
        "inspect_runtime_channel",
    ];

    /// The commands the main-thread sample caught during one settlement, by name. The conversion
    /// set must contain every one of them or the measurement was not acted on.
    const MEASURED_HOT: &[&str] = &[
        "append_mirror_outbox_item",
        "enqueue_mirror_append_item",
        "acknowledge_mirror_append_item",
        "transition_turn_journal",
        "save_dedicated_journey_conversation",
        "inspect_dedicated_pi_transcript",
        "reconcile_pi_backed_mirror_delivery_debt",
        "refresh_conversation_segments",
        "list_turn_journal",
        "publish_conversation_segment_projections",
    ];

    fn without_comments(source: &str) -> String {
        let mut out = String::with_capacity(source.len());
        let mut in_block = false;
        for line in source.lines() {
            let mut rest = line;
            let mut kept = String::new();
            loop {
                if in_block {
                    match rest.find("*/") {
                        Some(end) => { in_block = false; rest = &rest[end + 2..]; }
                        None => { rest = ""; break; }
                    }
                } else if let Some(start) = rest.find("/*") {
                    kept.push_str(&rest[..start]);
                    in_block = true;
                    rest = &rest[start + 2..];
                } else {
                    break;
                }
            }
            if !in_block {
                let line_comment = rest.find("//").unwrap_or(rest.len());
                kept.push_str(&rest[..line_comment]);
            }
            out.push_str(&kept);
            out.push('\n');
        }
        out
    }

    /// `(attribute, is_async_attr, is_async_fn, name, body)` for every `#[tauri::command…]` in a
    /// source file, with the body sliced by brace depth.
    fn commands(source: &str) -> Vec<(bool, bool, String, String)> {
        let src = without_comments(source);
        let mut out = Vec::new();
        let mut from = 0;
        while let Some(at) = src[from..].find("#[tauri::command") {
            let at = from + at;
            let attr_end = at + src[at..].find(']').expect("attribute closes") + 1;
            let attr = &src[at..attr_end];
            let sig_start = attr_end;
            let brace = sig_start + src[sig_start..].find('{').expect("fn body opens");
            let sig = &src[sig_start..brace];
            let fn_at = sig.find("fn ").expect("fn keyword");
            let name: String = sig[fn_at + 3..].chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect();
            let async_fn = sig[..fn_at].contains("async");
            let mut depth = 0usize;
            let mut end = brace;
            for (i, ch) in src[brace..].char_indices() {
                match ch { '{' => depth += 1, '}' => { depth -= 1; if depth == 0 { end = brace + i; break; } } _ => {} }
            }
            out.push((attr.contains("async"), async_fn, name, src[brace + 1..end].to_string()));
            from = end;
        }
        out
    }

    fn all_commands() -> Vec<(bool, bool, String, String)> {
        let v: Vec<_> = SOURCES.iter().flat_map(|s| commands(s)).collect();
        // CR160 added `inspect_pi_session_leaf`, serialised and off the main thread: 90 → 91.
        // CV-010.DS-005 slice 2d-1 added `bind_mirror_home`, serialised and off the main thread: 92 → 93.
        // CV-010.DS-005 slice 2f-2 removed the Python binding's candidate, discovery, validate and
        // save commands: 93 → 89.
        // CV-010.DS-005 slice 3a added `create_mirror_home`, serialised and off the main thread: 89 → 90.
        // CV-010.DS-005 slice 3b added `install_pi`, async, its long work on a blocking thread: 90 → 91.
        // CV-010.DS-005 slice 3c-1 added the four sign-in commands, async, Pi's work off the
        // command thread and the sign-in serialised by its own slot: 91 → 95.
        // CV-010.DS-005 slice 3c-2 added `disconnect_pi_provider` and the five OpenRouter key commands,
        // async, the Keychain and the key check on their own: 95 → 101.
        assert_eq!(v.len(), 101, "the command census changed; update SOURCES or this count");
        v
    }

    #[test]
    fn every_command_is_either_serialised_off_the_main_thread_or_on_the_explicit_keep_list() {
        let cmds = all_commands();
                let kept: BTreeSet<&str> = KEPT_ON_MAIN_THREAD.iter().copied().collect();
        let mut on_main: Vec<&str> = Vec::new();
        let mut serialised = 0;
        for (async_attr, async_fn, name, body) in &cmds {
            if *async_fn {
                continue; // the pre-existing async commands, which await and use spawn_blocking
            }
            if *async_attr {
                let first = body.trim_start();
                assert!(
                    first.starts_with("let _serialized = crate::native_command_serialization::acquire();"),
                    "{name} runs off the main thread but does not acquire the serialisation guard first"
                );
                serialised += 1;
            } else {
                on_main.push(name.as_str());
            }
        }
        let on_main: BTreeSet<&str> = on_main.into_iter().collect();
        assert_eq!(on_main, kept, "the set of commands still on the main thread must equal the explicit keep list");
        assert!(serialised >= 65, "expected most commands converted, found {serialised}");
    }

    #[test]
    fn the_commands_the_sample_caught_are_all_off_the_main_thread() {
        let cmds = all_commands();
        for hot in MEASURED_HOT {
            let found = cmds.iter().find(|(_, _, n, _)| n == hot).unwrap_or_else(|| panic!("{hot} is not a command"));
            assert!(found.0, "{hot} was measured on the main thread and is still there");
        }
    }

    #[test]
    fn kept_commands_do_not_touch_application_data() {
        let cmds = all_commands();
        for kept in KEPT_ON_MAIN_THREAD {
            let (_, _, _, body) = cmds.iter().find(|(_, _, n, _)| n == kept).unwrap_or_else(|| panic!("{kept} is not a command"));
            for marker in ["fs::write", "fs::read", "read_to_string", "File::create", "File::open", "sync_all", "fs::rename"] {
                assert!(!body.contains(marker), "{kept} stays on the main thread but contains {marker}; it could race a serialised command");
            }
        }
    }

    /// `std::sync::Mutex` is not re-entrant. A serialised command that calls another serialised
    /// command would deadlock on its own guard, so no converted body may name another converted
    /// command.
    #[test]
    fn no_serialised_command_calls_another() {
        let cmds = all_commands();
        let converted: Vec<&str> = cmds.iter().filter(|(a, f, _, _)| *a && !*f).map(|(_, _, n, _)| n.as_str()).collect();
        for (a, f, name, body) in &cmds {
            if !(*a && !*f) { continue; }
            for other in &converted {
                if other == name { continue; }
                let call = format!("{other}(");
                assert!(!body.contains(&call), "{name} calls {other}; both acquire the serialisation guard and would deadlock");
            }
        }
    }

    #[test]
    fn the_guard_recovers_from_poison() {
        let _ = std::thread::spawn(|| {
            let _g = super::acquire();
            panic!("poison on purpose");
        }).join();
        let _g = super::acquire();
    }
}
