//! CR194: where the seconds between Send and Pi having the message go.
//!
//! Production shows 2 s on a small Journey and 42 s on a large one between the turn journal's
//! admission and the user entry Pi writes, and clones of every piece measured apart explain about
//! 10 s. This timer marks each step of a turn's start as it finishes, in the running app, and
//! yields one record for the settlement timing ledger, so the rest is read instead of guessed.
//!
//! A phase is named by the step that ends it and spans from the previous mark (or the start). The
//! first mark of a phase wins, and the record is taken once: the turn's start has one measurement.

use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub(crate) const RECORD_KIND: &str = "turn_start";

struct State {
    started_at: DateTime<Utc>,
    started: Instant,
    marks: Vec<(&'static str, Duration)>,
    taken: bool,
}

#[derive(Clone)]
pub(crate) struct TurnStartTimer {
    state: Arc<Mutex<State>>,
}

impl TurnStartTimer {
    pub(crate) fn start() -> Self {
        Self {
            state: Arc::new(Mutex::new(State {
                started_at: Utc::now(),
                started: Instant::now(),
                marks: Vec::new(),
                taken: false,
            })),
        }
    }

    /// The step `phase` has just finished. A diagnostic never fails the turn, so a poisoned lock
    /// only loses the mark.
    pub(crate) fn mark(&self, phase: &'static str) {
        if let Ok(mut state) = self.state.lock() {
            if state.taken || state.marks.iter().any(|(name, _)| *name == phase) {
                return;
            }
            let elapsed = state.started.elapsed();
            state.marks.push((phase, elapsed));
        }
    }

    pub(crate) fn has_mark(&self, phase: &'static str) -> bool {
        self.state
            .lock()
            .map(|state| state.marks.iter().any(|(name, _)| *name == phase))
            .unwrap_or(true)
    }

    /// The turn's start as a settlement timing record, once; `None` after the first take.
    pub(crate) fn take_record(&self, journey_id: &str, run_id: &str, outcome: &str) -> Option<Value> {
        let mut state = self.state.lock().ok()?;
        if state.taken {
            return None;
        }
        state.taken = true;
        let total = state.marks.last().map(|(_, at)| *at).unwrap_or_default();
        let mut previous = Duration::ZERO;
        let phases: Vec<Value> = state
            .marks
            .iter()
            .map(|(phase, at)| {
                let began = state.started_at + chrono::Duration::from_std(previous).unwrap_or_default();
                let elapsed = at.saturating_sub(previous);
                previous = *at;
                json!({
                    "depth": 0,
                    "elapsedMs": elapsed.as_millis() as u64,
                    "outcome": "completed",
                    "phase": phase,
                    "startedAt": iso(began),
                })
            })
            .collect();
        let finished = state.started_at + chrono::Duration::from_std(total).unwrap_or_default();
        Some(json!({
            "kind": RECORD_KIND,
            "journeyId": journey_id,
            "runId": run_id,
            "startedAt": iso(state.started_at),
            "finishedAt": iso(finished),
            "elapsedMs": total.as_millis() as u64,
            "outcome": outcome,
            "phases": phases,
        }))
    }
}

/// Whether a line of Pi's RPC output is the agent starting its turn.
pub(crate) fn is_agent_start_line(line: &str) -> bool {
    line.contains("agent_start")
        && serde_json::from_str::<Value>(line)
            .ok()
            .and_then(|value| value.get("type").and_then(Value::as_str).map(|kind| kind == "agent_start"))
            .unwrap_or(false)
}

fn iso(at: DateTime<Utc>) -> String {
    at.to_rfc3339_opts(SecondsFormat::Millis, true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn each_phase_spans_from_the_previous_mark_and_is_named_by_the_step_that_ends_it() {
        let timer = TurnStartTimer::start();
        sleep(Duration::from_millis(20));
        timer.mark("serial_lock");
        sleep(Duration::from_millis(40));
        timer.mark("mirror_context");
        let record = timer.take_record("mirror-desktop", "run-1", "agent_started").unwrap();
        assert_eq!(record["kind"], "turn_start");
        assert_eq!(record["journeyId"], "mirror-desktop");
        assert_eq!(record["runId"], "run-1");
        assert_eq!(record["outcome"], "agent_started");
        let phases = record["phases"].as_array().unwrap();
        let names: Vec<_> = phases.iter().map(|phase| phase["phase"].as_str().unwrap()).collect();
        assert_eq!(names, ["serial_lock", "mirror_context"]);
        let first = phases[0]["elapsedMs"].as_u64().unwrap();
        let second = phases[1]["elapsedMs"].as_u64().unwrap();
        assert!((20..40).contains(&first), "first phase {first} ms");
        assert!((40..80).contains(&second), "second phase {second} ms, not the running total");
        let total = record["elapsedMs"].as_u64().unwrap();
        assert!(total >= first + second && total < first + second + 5);
        assert_eq!(phases[0]["startedAt"], record["startedAt"]);
        assert!(phases[1]["startedAt"].as_str().unwrap() > phases[0]["startedAt"].as_str().unwrap());
    }

    #[test]
    fn the_first_mark_of_a_phase_wins_and_the_record_is_taken_once() {
        let timer = TurnStartTimer::start();
        timer.mark("first_output");
        sleep(Duration::from_millis(15));
        timer.mark("first_output");
        assert!(timer.has_mark("first_output"));
        assert!(!timer.has_mark("agent_start"));
        let record = timer.take_record("j", "r", "agent_started").unwrap();
        assert_eq!(record["phases"].as_array().unwrap().len(), 1);
        assert!(record["phases"][0]["elapsedMs"].as_u64().unwrap() < 15);
        assert!(timer.take_record("j", "r", "ended_before_agent_start").is_none());
        timer.mark("agent_start");
        assert!(!timer.has_mark("agent_start"), "nothing is marked after the record is taken");
    }

    #[test]
    fn the_record_is_one_the_settlement_ledger_accepts() {
        let timer = TurnStartTimer::start();
        timer.mark("spawn");
        let record = timer.take_record("mirror-desktop", "run-1", "agent_started").unwrap();
        let document = crate::append_settlement_timing_record(None, "mirror-desktop", record).unwrap();
        assert_eq!(document["records"][0]["kind"], "turn_start");
    }

    #[test]
    fn the_worker_marks_every_step_of_the_start_in_order_and_records_it() {
        let source = include_str!("main.rs");
        let start = source.find("fn start_pi_invocation(").unwrap();
        let after = |needle: &str, from: usize| -> usize {
            from + source[from..].find(needle).unwrap_or_else(|| panic!("missing {needle}"))
        };
        let mut at = after("native_command_serialization::acquire()", start);
        for step in [
            "TurnStartTimer::start()",
            "admit_turn_journal(&app, &run_authority)",
            "start_timer.mark(\"admission\")",
            "fn run_pi_process(",
            "start_timer.mark(\"worker_start\")",
            "latest_pi_leaf_entry_id(&run_authority)",
            "start_timer.mark(\"session_baseline\")",
            "\"ended_before_agent_start\"",
            "fn run_pi_process_unguarded(",
            "transition_running_journal(&app, &authority)",
            "start_timer.mark(\"journal_running\")",
            "mediated_turn_flags(&global_extensions)",
            "start_timer.mark(\"extensions\")",
            "mirror_context::prepare_turn(",
            "start_timer.mark(\"mirror_context\")",
            "anchor_session_cwd(",
            "start_timer.mark(\"workspace\")",
            ".spawn()",
            "start_timer.mark(\"spawn\")",
            "start_timer.mark(\"first_output\")",
            "is_agent_start_line(&line)",
            "start_timer.mark(\"agent_start\")",
            "\"agent_started\"",
            "process.prompt_sent = true;",
            "start_timer.mark(\"prompt_write\")",
        ] {
            at = after(step, at) + step.len();
        }
    }

    #[test]
    fn only_pis_agent_start_event_starts_the_agent() {
        assert!(is_agent_start_line(r#"{"type":"agent_start"}"#));
        assert!(!is_agent_start_line(r#"{"type":"message_update","text":"agent_start"}"#));
        assert!(!is_agent_start_line("agent_start"));
        assert!(!is_agent_start_line(r#"{"type":"turn_start"}"#));
    }
}
