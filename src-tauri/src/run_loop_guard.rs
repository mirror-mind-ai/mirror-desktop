//! CR147: catching a run-loop panic so the turn it owned does not end in silence.
//!
//! Everything that owns terminalization for a turn runs on the worker thread spawned
//! for it, and that thread's `JoinHandle` is discarded on the spot. Every explicit
//! early return on that path terminalizes before it emits; a panic is covered by
//! nothing, unwinds the thread, and in a release build there is no console to say so.
//! The result is the 2026-10-11 shape: child gone, journal frozen at `running`, lease
//! still held, and a renderer waiting forever on a `Done` that will never come.
//!
//! This module holds only the catching, with no Tauri types in it, so the behaviour can
//! be characterised by injecting a panic instead of by reproducing that failure.

use std::any::Any;
use std::panic::{catch_unwind, AssertUnwindSafe};

/// The payload of a panic that was caught, bounded so a panic carrying a large message
/// cannot turn a durable trace into an unbounded write.
pub const MAX_PANIC_PAYLOAD_CHARS: usize = 2_048;

/// What a panic is described as when its payload is neither `&str` nor `String`.
/// Named rather than empty, because an empty payload would read as "no reason given"
/// and the real fact is that the reason exists in a type we cannot render.
pub const UNKNOWN_PANIC_PAYLOAD: &str = "<panic payload was not a string>";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UnwindReport {
    pub payload: String,
    pub truncated: bool,
}

/// Describe a caught panic payload.
///
/// `panic!` with a literal yields `&str`; `panic!` with formatting yields `String`.
/// Anything else is reported as unknown rather than guessed at.
pub fn describe_panic_payload(payload: &(dyn Any + Send)) -> UnwindReport {
    let text = if let Some(literal) = payload.downcast_ref::<&str>() {
        (*literal).to_string()
    } else if let Some(owned) = payload.downcast_ref::<String>() {
        owned.clone()
    } else {
        UNKNOWN_PANIC_PAYLOAD.to_string()
    };
    bound_payload(text)
}

/// Truncate by characters rather than by bytes, so a multi-byte payload cannot be cut
/// in the middle of one.
fn bound_payload(text: String) -> UnwindReport {
    if text.chars().count() <= MAX_PANIC_PAYLOAD_CHARS {
        return UnwindReport { payload: text, truncated: false };
    }
    UnwindReport {
        payload: text.chars().take(MAX_PANIC_PAYLOAD_CHARS).collect(),
        truncated: true,
    }
}

/// Run `body`, and if it panics, hand the description to `on_unwind` and return `None`.
///
/// `on_unwind` runs after the unwind has finished, on the same thread, with every handle
/// the caller captured still in scope — which is what lets it terminalize, adopt a
/// terminal journal record and emit, exactly as every explicit failure path already
/// does. A panic hook could not: it runs *during* unwinding and process-wide.
///
/// `AssertUnwindSafe` is sound here for the reason CR147's first slice established: the
/// shared state this crosses is behind `std::sync::Mutex`, whose poisoning makes a
/// panic-interrupted invariant visible to later readers rather than silent, and
/// terminalization now reports that unreadability instead of mistaking it for a
/// duplicate.
pub fn guard_run_loop<R>(
    body: impl FnOnce() -> R,
    on_unwind: impl FnOnce(UnwindReport),
) -> Option<R> {
    match catch_unwind(AssertUnwindSafe(body)) {
        Ok(value) => Some(value),
        Err(payload) => {
            on_unwind(describe_panic_payload(payload.as_ref()));
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    fn capture() -> (RefCell<Vec<UnwindReport>>,) {
        (RefCell::new(Vec::new()),)
    }

    #[test]
    fn a_panic_with_a_literal_reports_its_payload_and_returns_nothing() {
        let (reports,) = capture();
        let outcome = guard_run_loop(
            || panic!("the run loop fell over"),
            |report| reports.borrow_mut().push(report),
        );
        assert_eq!(outcome, None::<()>);
        assert_eq!(
            *reports.borrow(),
            vec![UnwindReport {
                payload: "the run loop fell over".to_string(),
                truncated: false
            }]
        );
    }

    #[test]
    fn a_panic_with_formatting_reports_its_payload() {
        let (reports,) = capture();
        let turn = "run-42";
        guard_run_loop(
            || -> () { panic!("terminalizing {turn} failed") },
            |report| reports.borrow_mut().push(report),
        );
        assert_eq!(reports.borrow()[0].payload, "terminalizing run-42 failed");
    }

    #[test]
    fn a_body_that_returns_normally_reports_nothing_and_passes_its_value_through() {
        let (reports,) = capture();
        let outcome = guard_run_loop(|| 7, |report| reports.borrow_mut().push(report));
        assert_eq!(outcome, Some(7));
        assert!(
            reports.borrow().is_empty(),
            "a healthy run loop must produce no unwind report"
        );
    }

    #[test]
    fn a_payload_that_is_not_a_string_is_named_rather_than_left_empty() {
        let (reports,) = capture();
        guard_run_loop(
            || -> () { std::panic::panic_any(7u32) },
            |report| reports.borrow_mut().push(report),
        );
        assert_eq!(reports.borrow()[0].payload, UNKNOWN_PANIC_PAYLOAD);
        assert!(!reports.borrow()[0].truncated);
    }

    #[test]
    fn an_oversized_payload_is_bounded_and_says_it_was_bounded() {
        let long = "x".repeat(MAX_PANIC_PAYLOAD_CHARS + 500);
        let report = bound_payload(long);
        assert_eq!(report.payload.chars().count(), MAX_PANIC_PAYLOAD_CHARS);
        assert!(report.truncated);
    }

    #[test]
    fn a_multibyte_payload_is_bounded_on_a_character_boundary() {
        // Counting bytes here would split a character and panic inside the guard
        // that exists to survive a panic.
        let long = "ãé∞".repeat(MAX_PANIC_PAYLOAD_CHARS);
        let report = bound_payload(long);
        assert_eq!(report.payload.chars().count(), MAX_PANIC_PAYLOAD_CHARS);
        assert!(report.truncated);
        assert!(report.payload.ends_with(|c: char| c == 'ã' || c == 'é' || c == '∞'));
    }

    #[test]
    fn a_payload_at_the_cap_is_not_reported_as_truncated() {
        let exact = "y".repeat(MAX_PANIC_PAYLOAD_CHARS);
        let report = bound_payload(exact);
        assert_eq!(report.payload.chars().count(), MAX_PANIC_PAYLOAD_CHARS);
        assert!(!report.truncated);
    }

    // CR147 wiring guard. `run_pi_process` takes an `AppHandle` and cannot be called from
    // a test, so the catching above is characterised by injection while the wiring is
    // pinned against the source. Correct domain, wrong wiring is this project's recurring
    // failure shape, and the parts that cannot be executed in a test are the parts where
    // it hides.

    const MAIN_SOURCE: &str = include_str!("main.rs");

    /// Slice a function body by a literal start anchor and the function's own closing
    /// brace at column zero. Inner blocks are indented, so `"\n}\n"` cannot match one.
    fn body_of(declaration: &str) -> &'static str {
        let start = MAIN_SOURCE
            .find(declaration)
            .unwrap_or_else(|| panic!("declaration not found: {declaration}"));
        let end = MAIN_SOURCE[start..]
            .find("\n}\n")
            .unwrap_or_else(|| panic!("no closing brace for: {declaration}"))
            + start
            + 3;
        &MAIN_SOURCE[start..end]
    }

    #[test]
    fn the_run_loop_body_runs_only_inside_the_guard() {
        let wrapper = body_of("fn run_pi_process(\n");
        assert!(wrapper.contains("guard_run_loop("), "the run loop is not guarded");
        assert!(wrapper.contains("run_pi_process_unguarded("));
        assert!(wrapper.contains("fail_pi_process_after_unwind("));
        assert_eq!(
            MAIN_SOURCE.matches("run_pi_process_unguarded(").count(),
            2,
            "the unguarded body must be reachable from exactly one place: its declaration \
             and the guard's call. Another call site would restore the silence."
        );
    }

    #[test]
    fn the_unwind_path_measures_before_it_claims_anything() {
        let unwind = body_of("fn fail_pi_process_after_unwind(\n");
        assert!(
            unwind.contains("measure_child_liveness("),
            "the unwind path must measure the child"
        );
        assert!(
            unwind.contains("unwind_disposition("),
            "the unwind path must decide through the tested mapping, not inline"
        );
        assert!(
            unwind.contains("TerminalState::ProcessDied"),
            "an exited child's turn must be terminalized"
        );
    }

    #[test]
    fn the_unwind_path_never_kills_a_live_child_and_never_invents_provider_evidence() {
        let unwind = body_of("fn fail_pi_process_after_unwind(\n");
        assert!(
            !unwind.contains(".kill()"),
            "killing a live child is a mutation CR147 has no authority for"
        );
        assert!(
            !unwind.contains("provider_failure"),
            "a run-loop panic is this application's failure, not the provider's, and the \
             renderer presents provider_failure as the terminal cause"
        );
    }
}
