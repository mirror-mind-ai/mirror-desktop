//! CR147: the durable trace of last resort for a native panic.
//!
//! Slice 2 catches an unwind in the run loop and finishes or reports the turn it
//! abandoned. This module covers what slice 2 cannot: a panic somewhere the guard does
//! not wrap, and the fact that the `Error` event slice 2 emits is not durable — after a
//! reload the journal says `process_died` and nothing says a panic caused it.
//!
//! A probe of the unified log for the 2026-10-11 incident window found 163,154 lines
//! from the process and no panic among them, but the binary has no logging plugin and
//! its only `eprintln!` sites are error paths that never fired, so nothing proved the
//! default panic hook's stderr reaches the log at all. That absence of a control is the
//! reason this file exists: the repair has to write its own trace, because nothing else
//! will.
//!
//! The hook cannot be given the turn's authority as an argument — it runs process-wide,
//! during unwinding, for every panic. A thread-local set by the run loop is what lets it
//! name the turn, and the thread name cannot serve: `worker_name` is
//! `nautilus-pi-{journey_id}`, the Journey only, and widening it runs into the 63-byte
//! pthread limit on macOS, which truncates in silence.

use serde_json::json;
use std::cell::RefCell;
use std::fs;
use std::io::Write;
use std::panic::PanicHookInfo;
use std::path::{Path, PathBuf};

/// Bounds a payload so a panic carrying a large message cannot turn an append into an
/// unbounded write. Mirrors `run_loop_guard`'s cap deliberately: two places that bound
/// the same thing to different sizes would be a discrepancy waiting to be found.
pub const MAX_TRACE_PAYLOAD_CHARS: usize = 2_048;

pub const NATIVE_PANIC_TRACE_FILE: &str = "native-panics.jsonl";

/// Which turn the panicking thread was running, when it was running one.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PanicTurnContext {
    pub journey_id: String,
    pub run_id: String,
    pub turn_id: String,
}

thread_local! {
    static TURN_CONTEXT: RefCell<Option<PanicTurnContext>> = const { RefCell::new(None) };
}

/// Announce, on this thread, which turn is being run.
pub fn set_panic_turn_context(context: PanicTurnContext) {
    TURN_CONTEXT.with(|slot| {
        *slot.borrow_mut() = Some(context);
    });
}

pub fn clear_panic_turn_context() {
    TURN_CONTEXT.with(|slot| {
        *slot.borrow_mut() = None;
    });
}

/// Read this thread's turn, tolerating a borrow that is already taken.
///
/// A hook that panicked while reporting a panic would abort the process, so this never
/// unwraps: `try_borrow` failing means some frame up the stack holds the slot, and
/// reporting the panic without the turn is better than not reporting it.
pub fn panic_turn_context() -> Option<PanicTurnContext> {
    TURN_CONTEXT
        .try_with(|slot| slot.try_borrow().ok().and_then(|value| value.clone()))
        .ok()
        .flatten()
}

fn bound(text: &str) -> (String, bool) {
    if text.chars().count() <= MAX_TRACE_PAYLOAD_CHARS {
        return (text.to_string(), false);
    }
    (text.chars().take(MAX_TRACE_PAYLOAD_CHARS).collect(), true)
}

/// Render one trace record as a single line of JSON.
///
/// Pure, so the shape is characterised without installing a process-global hook from a
/// test — which would race every other test in the binary.
pub fn render_panic_trace_line(
    at: &str,
    thread: Option<&str>,
    context: Option<&PanicTurnContext>,
    payload: &str,
    location: Option<&str>,
) -> String {
    let (payload, truncated) = bound(payload);
    let mut record = json!({
        "schemaVersion": 1,
        "at": at,
        "payload": payload,
        "truncated": truncated,
    });
    let map = record.as_object_mut().expect("rendered record is an object");
    if let Some(thread) = thread {
        map.insert("thread".to_string(), json!(thread));
    }
    if let Some(location) = location {
        map.insert("location".to_string(), json!(location));
    }
    if let Some(context) = context {
        map.insert("journeyId".to_string(), json!(context.journey_id));
        map.insert("runId".to_string(), json!(context.run_id));
        map.insert("turnId".to_string(), json!(context.turn_id));
    }
    record.to_string()
}

/// Describe a hook's payload. `panic!` with a literal yields `&str`, with formatting a
/// `String`; anything else is named rather than guessed at.
pub fn describe_hook_payload(info: &PanicHookInfo<'_>) -> String {
    if let Some(literal) = info.payload().downcast_ref::<&str>() {
        (*literal).to_string()
    } else if let Some(owned) = info.payload().downcast_ref::<String>() {
        owned.clone()
    } else {
        "<panic payload was not a string>".to_string()
    }
}

/// Append one line, dropping every failure.
///
/// Append-only on purpose: a write that cannot truncate cannot destroy the record it is
/// adding to. Every error is dropped because this runs inside a panic — surfacing a
/// failure here would replace a reported panic with an unreported one.
pub fn append_panic_trace_line(path: &Path, line: &str) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line.as_bytes());
        let _ = file.write_all(b"\n");
    }
}

pub fn native_panic_trace_path(app_data_root: &Path) -> PathBuf {
    app_data_root.join(NATIVE_PANIC_TRACE_FILE)
}

/// Install the trace hook, chaining to whatever hook was already installed.
///
/// Chained rather than replacing, so the default hook's stderr output is not removed on
/// the chance that some environment does capture it.
pub fn install_panic_trace_hook(path: PathBuf, now: fn() -> String) {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let line = render_panic_trace_line(
            &now(),
            std::thread::current().name(),
            panic_turn_context().as_ref(),
            &describe_hook_payload(info),
            info.location().map(|location| location.to_string()).as_deref(),
        );
        append_panic_trace_line(&path, &line);
        previous(info);
    }));
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn parse(line: &str) -> Value {
        assert!(!line.contains('\n'), "a trace record must be one line");
        serde_json::from_str(line).expect("a trace record must be valid JSON")
    }

    #[test]
    fn a_trace_names_the_turn_when_the_thread_was_running_one() {
        let context = PanicTurnContext {
            journey_id: "mirror-desktop".to_string(),
            run_id: "agent-run-1".to_string(),
            turn_id: "turn-1".to_string(),
        };
        let record = parse(&render_panic_trace_line(
            "2026-10-12T18:00:00.000Z",
            Some("nautilus-pi-mirror-desktop"),
            Some(&context),
            "the run loop fell over",
            Some("src/main.rs:8058:9"),
        ));
        assert_eq!(record["journeyId"], "mirror-desktop");
        assert_eq!(record["runId"], "agent-run-1");
        assert_eq!(record["turnId"], "turn-1");
        assert_eq!(record["payload"], "the run loop fell over");
        assert_eq!(record["location"], "src/main.rs:8058:9");
        assert_eq!(record["thread"], "nautilus-pi-mirror-desktop");
        assert_eq!(record["truncated"], false);
        assert_eq!(record["schemaVersion"], 1);
    }

    #[test]
    fn a_trace_without_a_turn_omits_the_turn_rather_than_naming_an_empty_one() {
        let record = parse(&render_panic_trace_line(
            "2026-10-12T18:00:00.000Z",
            None,
            None,
            "something else panicked",
            None,
        ));
        for absent in ["journeyId", "runId", "turnId", "thread", "location"] {
            assert!(
                record.get(absent).is_none(),
                "{absent} must be absent, not empty: an empty identifier reads as a turn \
                 that exists and has no name"
            );
        }
        assert_eq!(record["payload"], "something else panicked");
    }

    #[test]
    fn a_payload_with_newlines_stays_one_line() {
        // A multi-line panic message must not break the one-record-per-line contract.
        let record = parse(&render_panic_trace_line(
            "2026-10-12T18:00:00.000Z",
            None,
            None,
            "first line\nsecond line",
            None,
        ));
        assert_eq!(record["payload"], "first line\nsecond line");
    }

    #[test]
    fn an_oversized_payload_is_bounded_and_says_so() {
        let long = "ã".repeat(MAX_TRACE_PAYLOAD_CHARS + 100);
        let record = parse(&render_panic_trace_line(
            "2026-10-12T18:00:00.000Z",
            None,
            None,
            &long,
            None,
        ));
        assert_eq!(
            record["payload"].as_str().unwrap().chars().count(),
            MAX_TRACE_PAYLOAD_CHARS
        );
        assert_eq!(record["truncated"], true);
    }

    #[test]
    fn the_thread_local_turn_is_set_and_cleared() {
        assert_eq!(panic_turn_context(), None);
        let context = PanicTurnContext {
            journey_id: "j".to_string(),
            run_id: "r".to_string(),
            turn_id: "t".to_string(),
        };
        set_panic_turn_context(context.clone());
        assert_eq!(panic_turn_context(), Some(context));
        clear_panic_turn_context();
        assert_eq!(
            panic_turn_context(),
            None,
            "a cleared turn must not be reported by a later panic on this thread"
        );
    }

    #[test]
    fn appending_creates_the_file_and_never_truncates_it() {
        let dir = std::env::temp_dir().join(format!(
            "cr147-trace-{}-{:?}",
            std::process::id(),
            std::thread::current().id()
        ));
        let path = native_panic_trace_path(&dir);
        let _ = fs::remove_file(&path);
        append_panic_trace_line(&path, "{\"a\":1}");
        append_panic_trace_line(&path, "{\"a\":2}");
        let content = fs::read_to_string(&path).expect("the trace file was created");
        assert_eq!(content, "{\"a\":1}\n{\"a\":2}\n");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn appending_to_an_unwritable_path_is_dropped_rather_than_raised() {
        // Inside a panic, surfacing a failure would replace a reported panic with an
        // unreported one. The only correct behaviour is to do nothing.
        append_panic_trace_line(Path::new("/dev/null/cr147/impossible.jsonl"), "{}");
    }

    #[test]
    fn the_trace_file_name_is_the_one_the_module_publishes() {
        assert_eq!(
            native_panic_trace_path(Path::new("/tmp/data")),
            Path::new("/tmp/data/native-panics.jsonl")
        );
    }

    // CR147 wiring guard. The hook is process-global and the run loop needs an
    // `AppHandle`, so neither can be exercised from a test; the wiring is pinned against
    // the source instead.

    const MAIN_SOURCE: &str = include_str!("main.rs");

    fn region(start_anchor: &str, end_anchor: &str) -> &'static str {
        let start = MAIN_SOURCE
            .find(start_anchor)
            .unwrap_or_else(|| panic!("start anchor not found: {start_anchor}"));
        let end = MAIN_SOURCE[start..]
            .find(end_anchor)
            .unwrap_or_else(|| panic!("end anchor not found: {end_anchor}"))
            + start;
        &MAIN_SOURCE[start..end]
    }

    #[test]
    fn the_hook_is_installed_only_after_the_channel_validates_its_data_directory() {
        let setup = region(".setup(|app| {", ".manage(PiProcessState::default())");
        let install = setup
            .find("install_panic_trace_hook(")
            .expect("the panic trace hook is not installed");
        let validate = setup
            .find("validate_app_identity(")
            .expect("the channel identity validation moved");
        assert!(
            validate < install,
            "installing the hook before the channel validates this data directory would \
             let a trace be written into another channel's directory"
        );
        assert_eq!(
            MAIN_SOURCE.matches("install_panic_trace_hook(").count(),
            1,
            "the hook must be installed exactly once"
        );
    }

    #[test]
    fn the_run_loop_announces_and_withdraws_its_turn() {
        let wrapper = region("fn run_pi_process(\n", "\n/// CR147: finish or report");
        let set = wrapper
            .find("set_panic_turn_context(")
            .expect("the run loop does not announce its turn, so a panic cannot name it");
        let clear = wrapper
            .find("clear_panic_turn_context(")
            .expect("the run loop does not withdraw its turn");
        let guard = wrapper.find("guard_run_loop(").expect("the guard moved");
        assert!(
            set < guard && guard < clear,
            "the turn must be announced before the body runs and withdrawn after it, or \
             a panic is either unattributable or attributed to a finished turn"
        );
    }
}
