//! CV-010.DS-005 phase 4, slice 4a: Mirror learns from the app's Conversations.
//!
//! A Desktop Conversation stays open for its whole life, so the terminal's extraction, which
//! learns from an ended Conversation once, never reaches it. Core's `learnFromConversations`
//! (CV24.DS7) learns instead from the stretch each idle Conversation gained since it was last
//! learned from, and never ends it.
//!
//! - **When.** A minute after launch, then every ten minutes, and only while no turn is reserved or
//!   running. The idle rule is the core's: a Conversation's newest message is 30 minutes old.
//! - **Where.** In a second Mirror host with its own supervisor and a ten-minute deadline, so a turn's
//!   context never waits behind a learning run. It stops after each run.
//! - **The key.** Passed per run from the Keychain; never kept here. With nothing to learn the core
//!   needs none; with work and no key it refuses, and Settings says Mirror is waiting for a key.
//! - **What is kept.** The last run's counts and time, in memory, for Settings. Nothing of what was
//!   learned.

use crate::mirror_host::{MirrorHost, MirrorHostError};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub(crate) const FIRST_RUN_AFTER: Duration = Duration::from_secs(60);
pub(crate) const RUN_EVERY: Duration = Duration::from_secs(600);
pub(crate) const PIECES_PER_RUN: u64 = 10;

/// The learning host and the last run, for the app's life.
#[derive(Default)]
pub(crate) struct MirrorLearningState {
    host: Mutex<Option<MirrorHost>>,
    last: Mutex<Option<LearningRun>>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LearningRun {
    pub at: String,
    /// `learned` (something or nothing new), `no_key`, or `failed`.
    pub outcome: &'static str,
    pub pieces: u64,
    pub memories: u64,
    pub failed: u64,
    pub skipped: u64,
    pub waiting: u64,
    pub message: Option<String>,
}

impl LearningRun {
    fn empty(at: &str, outcome: &'static str, message: Option<String>) -> Self {
        Self { at: at.to_string(), outcome, pieces: 0, memories: 0, failed: 0, skipped: 0, waiting: 0, message }
    }
}

/// The interfaces a run learns from, newest first. CV-013.DS-002: the core asks for one interface
/// per call, and the Conversations already open keep `nautilus_harness` until they are ensured
/// again, so a run asks for both, within the same pieces.
pub(crate) const LEARNED_INTERFACES: [&str; 2] = [
    crate::mirror_host_bridge::CONVERSATION_INTERFACE,
    crate::mirror_host_bridge::PREVIOUS_CONVERSATION_INTERFACE,
];

/// The request a run sends for one interface; the key goes only when one is kept.
pub(crate) fn learning_params(interface: &str, limit: u64, key: Option<&str>) -> Value {
    let mut params = json!({"request": {
        "interface": interface,
        "limit": limit,
    }});
    if let Some(key) = key {
        params["apiKey"] = json!(key);
    }
    params
}

/// What a run's answer means for Settings.
pub(crate) fn classify(at: &str, answer: Result<Value, MirrorHostError>) -> LearningRun {
    match answer {
        Ok(report) => {
            let count = |name: &str| report.get(name).and_then(Value::as_u64);
            match (count("pieces"), count("memories"), count("failed"), count("skipped"), count("waiting")) {
                (Some(pieces), Some(memories), Some(failed), Some(skipped), Some(waiting)) => LearningRun {
                    at: at.to_string(), outcome: "learned", pieces, memories, failed, skipped, waiting, message: None,
                },
                _ => LearningRun::empty(at, "failed", Some("Mirror answered with an unreadable report.".into())),
            }
        }
        Err(MirrorHostError::Rejected { reason, .. }) if reason == "no_key" => LearningRun::empty(at, "no_key", None),
        Err(error) => LearningRun::empty(at, "failed", Some(crate::mirror_host_bridge::describe(error))),
    }
}

/// The pieces a run may still learn after the answers it has.
pub(crate) fn remaining_pieces(answers: &[LearningRun]) -> u64 {
    PIECES_PER_RUN.saturating_sub(answers.iter().map(|run| run.pieces).sum())
}

/// One run's answers as one: their counts summed, or the first that did not learn.
pub(crate) fn combine(at: &str, answers: Vec<LearningRun>) -> LearningRun {
    if let Some(stopped) = answers.iter().find(|run| run.outcome != "learned") {
        return stopped.clone();
    }
    answers.into_iter().fold(LearningRun::empty(at, "learned", None), |sum, run| LearningRun {
        pieces: sum.pieces + run.pieces,
        memories: sum.memories + run.memories,
        failed: sum.failed + run.failed,
        skipped: sum.skipped + run.skipped,
        waiting: sum.waiting + run.waiting,
        ..sum
    })
}

/// One run on the bound home, through the learning host. `None` when no home is bound.
pub(crate) fn run_once(app: &AppHandle) -> Option<LearningRun> {
    let home = crate::mirror_host_bridge::active_home(app).ok()?;
    let at = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let key = match crate::openrouter_key::kept_key(app) {
        Ok(key) => key,
        Err(error) => return Some(LearningRun::empty(&at, "failed", Some(format!("The OpenRouter key could not be read ({error})."))))
    };
    let state = app.state::<MirrorLearningState>();
    // The host stops after each run: nothing idles between runs ten minutes apart.
    let answers = crate::mirror_host_bridge::with_supervisor(&state.host, |host| {
        let mut answers = Vec::new();
        for interface in LEARNED_INTERFACES {
            let limit = remaining_pieces(&answers);
            if limit == 0 {
                break;
            }
            let answer = classify(&at, host.request_for_home(&home, "learnFromConversations", learning_params(interface, limit, key.as_deref())));
            let stop = answer.outcome != "learned";
            answers.push(answer);
            if stop {
                break;
            }
        }
        host.shutdown();
        Ok(answers)
    });
    match answers {
        Ok(answers) => Some(combine(&at, answers)),
        Err(error) => Some(classify(&at, Err(error))),
    }
}

/// Start the schedule. `turns_idle` says whether no turn is reserved or running.
pub(crate) fn start(app: AppHandle, turns_idle: fn(&AppHandle) -> bool) {
    std::thread::spawn(move || {
        std::thread::sleep(FIRST_RUN_AFTER);
        loop {
            if turns_idle(&app) {
                if let Some(run) = run_once(&app) {
                    if let Ok(mut last) = app.state::<MirrorLearningState>().last.lock() {
                        *last = Some(run);
                    }
                }
            }
            std::thread::sleep(RUN_EVERY);
        }
    });
}

/// Async: it reads an in-memory value and needs neither the main thread nor the serialisation guard.
#[tauri::command]
pub(crate) async fn mirror_learning_status(app: AppHandle) -> Result<Option<LearningRun>, String> {
    Ok(app.state::<MirrorLearningState>().last.lock().ok().and_then(|last| last.clone()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn learned(pieces: u64, memories: u64) -> LearningRun {
        LearningRun { at: "t".into(), outcome: "learned", pieces, memories, failed: 0, skipped: 1, waiting: 2, message: None }
    }

    #[test]
    fn learns_from_the_nautilus_label_first_and_then_the_previous_one() {
        // CV-013.DS-002 slice 3: open Conversations keep nautilus_harness until ensured again.
        assert_eq!(LEARNED_INTERFACES, ["nautilus", "nautilus_harness"]);
        let params = learning_params("nautilus_harness", 7, Some("k"));
        assert_eq!(params["request"]["interface"], "nautilus_harness");
        assert_eq!(params["request"]["limit"], 7);
        assert_eq!(params["apiKey"], "k");
    }

    #[test]
    fn one_run_shares_its_pieces_between_the_labels_and_sums_their_counts() {
        assert_eq!(remaining_pieces(&[]), PIECES_PER_RUN);
        assert_eq!(remaining_pieces(&[learned(4, 1)]), PIECES_PER_RUN - 4);
        assert_eq!(remaining_pieces(&[learned(PIECES_PER_RUN, 1)]), 0);
        assert_eq!(combine("t", vec![learned(4, 1), learned(3, 2)]), LearningRun {
            at: "t".into(), outcome: "learned", pieces: 7, memories: 3, failed: 0, skipped: 2, waiting: 4, message: None,
        });
        let failed = LearningRun::empty("t", "failed", Some("no".into()));
        assert_eq!(combine("t", vec![learned(4, 1), failed.clone()]), failed);
        let no_key = LearningRun::empty("t", "no_key", None);
        assert_eq!(combine("t", vec![no_key.clone(), learned(0, 0)]), no_key);
    }

    #[test]
    fn a_report_becomes_counts_and_nothing_else() {
        let run = classify("t", Ok(json!({"pieces": 2, "memories": 3, "tasks": 1, "failed": 1, "skipped": 0, "waiting": 4})));
        assert_eq!(run, LearningRun {
            at: "t".into(), outcome: "learned", pieces: 2, memories: 3, failed: 1, skipped: 0, waiting: 4, message: None,
        });
        assert_eq!(classify("t", Ok(json!({"pieces": 2}))).outcome, "failed");
    }

    #[test]
    fn no_key_is_waiting_not_failing_and_other_refusals_fail() {
        let refused = |reason: &str| Err(MirrorHostError::Rejected {
            name: "LearningRejectedError".into(), reason: reason.into(), message: reason.into(),
        });
        assert_eq!(classify("t", refused("no_key")).outcome, "no_key");
        assert_eq!(classify("t", refused("no_key")).message, None);
        let invalid = classify("t", refused("invalid_request"));
        assert_eq!(invalid.outcome, "failed");
        assert!(invalid.message.unwrap().contains("invalid_request"));
        let timed_out = classify("t", Err(MirrorHostError::TimedOut { method: "learnFromConversations".into(), stderr_tail: String::new() }));
        assert!(timed_out.message.unwrap().contains("did not answer learnFromConversations in time"));
    }

    #[test]
    fn the_request_names_desktops_interface_and_carries_the_key_only_when_kept() {
        let with = learning_params(LEARNED_INTERFACES[0], PIECES_PER_RUN, Some("sk-test"));
        assert_eq!(with["request"]["interface"], "nautilus");
        assert_eq!(with["request"]["limit"], 10);
        assert_eq!(with["apiKey"], "sk-test");
        assert!(learning_params(LEARNED_INTERFACES[0], PIECES_PER_RUN, None).get("apiKey").is_none());
    }

    /// The real host and core. Run with
    /// `MIRROR_HOST_RUNTIME=<repo>/.mirror-host/runtime/<platform> cargo test -- --ignored real_host_learns`.
    #[test]
    #[ignore]
    fn real_host_learns_nothing_without_work_and_asks_for_a_key_with_it() {
        use crate::mirror_home::MarkedHome;
        use crate::mirror_host::MirrorHostConfig;
        let runtime = std::path::PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let parent = std::env::temp_dir().join(format!("mirror-learning-real-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&parent);
        std::fs::create_dir_all(&parent).unwrap();
        let parent = parent.canonicalize().unwrap();
        let mut host = MirrorHost::new(MirrorHostConfig::for_runtime(runtime));
        host.request("createMarkedHome", json!({"request": {"homePath": parent.join("ana"), "userName": "ana"}})).unwrap();
        let home = MarkedHome::open(&parent.join("ana")).unwrap();

        let quiet = classify("t", host.request_for_home(&home, "learnFromConversations", learning_params(LEARNED_INTERFACES[0], PIECES_PER_RUN, None)));
        assert_eq!((quiet.outcome, quiet.pieces, quiet.waiting), ("learned", 0, 0), "nothing to learn needs no key");

        let tree = host.request_for_home(&home, "readJourneyTree", json!({})).unwrap();
        let journey = tree["roots"][0]["id"].as_str().expect("a seeded home has a Journey").to_string();
        let ensured = host.request_for_home(&home, "ensureConversation", json!({"request": {
            "sessionId": "s-1", "journeyId": journey, "title": "Primeira",
            "interface": crate::mirror_host_bridge::CONVERSATION_INTERFACE,
        }})).unwrap();
        let conversation = ensured["conversationId"].as_str().unwrap();
        let messages: Vec<Value> = (0..4).map(|index| json!({
            "id": format!("learn-real-{index:04}"), "role": if index % 2 == 0 { "user" } else { "assistant" },
            "content": format!("mensagem {index}"), "createdAt": format!("2026-10-29T12:00:0{index}Z"),
        })).collect();
        host.request_for_home(&home, "appendConversationMessages", json!({"request": {
            "schemaVersion": "1.0.0", "conversationId": conversation, "journeyId": journey,
            "sourceInterface": "nautilus-harness", "messages": messages,
        }})).unwrap();

        let waiting = classify("t", host.request_for_home(&home, "learnFromConversations", learning_params(LEARNED_INTERFACES[0], PIECES_PER_RUN, None)));
        assert_eq!(waiting.outcome, "no_key", "an idle stretch with no key is refused, not learned");
        let _ = std::fs::remove_dir_all(&parent);
    }

    #[test]
    fn the_schedule_is_a_minute_then_every_ten() {
        assert_eq!(FIRST_RUN_AFTER, Duration::from_secs(60));
        assert_eq!(RUN_EVERY, Duration::from_secs(600));
    }
}
