use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, path::Path};

const JOURNAL_SCHEMA_VERSION: &str = "0.1.0";
const JOURNAL_MAX_RECORDS: usize = 64;
const JOURNAL_MAX_BYTES: usize = 8 * 1024 * 1024;
const JOURNAL_MAX_RECEIPT_LENGTH: usize = 160;
const JOURNAL_MAX_TERMINAL_STREAM_BYTES: usize = 131_072;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnJournalAuthority {
    pub schema_version: String,
    pub journey_id: String,
    pub run_id: String,
    pub turn_id: String,
    pub thread_id: String,
    pub generation: u64,
    pub pi_session_id: String,
    pub mirror_conversation_id: String,
    pub harness_user_message_id: String,
    pub harness_assistant_message_id: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TurnPhase {
    Admitted,
    Running,
    TerminalDurable,
    Projected,
    OutboxEnqueued,
    Settled,
    Interrupted,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TurnTerminalOutcome {
    Completed,
    Cancelled,
    SpawnFailed,
    ProcessDied,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TurnCancellationIntent {
    None,
    Requested,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TurnRecoveryDisposition {
    None,
    ResumeExecution,
    ResumeProjection,
    ResumeOutbox,
    Complete,
    Interrupted,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnPiExecutionEvidence {
    pub user_entry_id: String,
    pub assistant_entry_id: String,
    pub leaf_entry_id: String,
    pub entry_count: usize,
    pub assistant_text: String,
    #[serde(default)]
    pub assistant_text_truncated: bool,
    pub started_at: String,
    pub committed_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnTerminalEvidence {
    #[serde(default, rename = "stdout", skip_serializing)]
    pub legacy_stdout: String,
    #[serde(default, rename = "stderr", skip_serializing)]
    pub legacy_stderr: String,
    #[serde(default, rename = "stdoutTruncated", skip_serializing)]
    pub legacy_stdout_truncated: bool,
    #[serde(default, rename = "stderrTruncated", skip_serializing)]
    pub legacy_stderr_truncated: bool,
    pub captured_at: String,
    pub pi_execution: Option<TurnPiExecutionEvidence>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnTransitionReceipt {
    pub receipt_id: String,
    pub expected_phase: TurnPhase,
    pub next_phase: TurnPhase,
    pub terminal_outcome: Option<TurnTerminalOutcome>,
    pub terminal_evidence_digest: Option<String>,
    pub cancellation_intent: Option<TurnCancellationIntent>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnJournalRecord {
    pub schema_version: String,
    pub authority: TurnJournalAuthority,
    pub phase: TurnPhase,
    pub terminal_outcome: Option<TurnTerminalOutcome>,
    pub terminal_evidence: Option<TurnTerminalEvidence>,
    pub cancellation_intent: TurnCancellationIntent,
    pub recovery_disposition: TurnRecoveryDisposition,
    pub revision: u64,
    pub created_at: String,
    pub updated_at: String,
    pub last_receipt: Option<TurnTransitionReceipt>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnJournalDocument {
    pub schema_version: String,
    pub records: Vec<TurnJournalRecord>,
    pub saved_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnTransitionRequest {
    pub expected_revision: u64,
    pub expected_phase: TurnPhase,
    pub next_phase: TurnPhase,
    pub receipt_id: String,
    pub terminal_outcome: Option<TurnTerminalOutcome>,
    pub terminal_evidence: Option<TurnTerminalEvidence>,
    pub cancellation_intent: Option<TurnCancellationIntent>,
    pub recovery_disposition: Option<TurnRecoveryDisposition>,
}

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn valid_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 512
        && value == value.trim()
        && value.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_alphanumeric()
                || (index > 0 && matches!(byte, b'.' | b'_' | b':' | b'@' | b'/' | b'+' | b'-'))
        })
}

fn validate_authority(authority: &TurnJournalAuthority) -> Result<(), String> {
    if authority.schema_version != "0.1.0"
        || authority.generation == 0
        || authority.generation > 1_000_000_000
        || [
            &authority.journey_id,
            &authority.run_id,
            &authority.turn_id,
            &authority.thread_id,
            &authority.pi_session_id,
            &authority.mirror_conversation_id,
            &authority.harness_user_message_id,
            &authority.harness_assistant_message_id,
        ]
        .iter()
        .any(|value| !valid_identifier(value))
    {
        return Err("turn_journal_authority_invalid".to_string());
    }
    Ok(())
}

fn empty_document() -> TurnJournalDocument {
    TurnJournalDocument {
        schema_version: JOURNAL_SCHEMA_VERSION.to_string(),
        records: Vec::new(),
        saved_at: now(),
    }
}

pub fn read_turn_journal(path: &Path) -> Result<TurnJournalDocument, String> {
    if !path.exists() {
        return Ok(empty_document());
    }
    let metadata =
        fs::symlink_metadata(path).map_err(|_| "turn_journal_unavailable".to_string())?;
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() as usize > JOURNAL_MAX_BYTES
    {
        return Err("turn_journal_invalid".to_string());
    }
    let document: TurnJournalDocument = serde_json::from_slice(
        &fs::read(path).map_err(|_| "turn_journal_unavailable".to_string())?,
    )
    .map_err(|_| "turn_journal_invalid".to_string())?;
    if document.schema_version != JOURNAL_SCHEMA_VERSION
        || document.records.len() > JOURNAL_MAX_RECORDS
    {
        return Err("turn_journal_invalid".to_string());
    }
    let mut run_ids = std::collections::HashSet::new();
    for record in &document.records {
        validate_authority(&record.authority)?;
        let terminal_required = matches!(
            record.phase,
            TurnPhase::TerminalDurable
                | TurnPhase::Projected
                | TurnPhase::OutboxEnqueued
                | TurnPhase::Settled,
        );
        let terminal_consistent = if terminal_required {
            record.terminal_outcome.is_some()
                && record
                    .terminal_evidence
                    .as_ref()
                    .is_some_and(valid_terminal_evidence)
        } else if matches!(record.phase, TurnPhase::Admitted | TurnPhase::Running) {
            record.terminal_outcome.is_none() && record.terminal_evidence.is_none()
        } else {
            record
                .terminal_evidence
                .as_ref()
                .is_none_or(valid_terminal_evidence)
                && record.terminal_outcome.is_some() == record.terminal_evidence.is_some()
        };
        if record.schema_version != JOURNAL_SCHEMA_VERSION
            || record.revision == 0
            || !run_ids.insert(record.authority.run_id.as_str())
            || !terminal_consistent
        {
            return Err("turn_journal_invalid".to_string());
        }
    }
    Ok(document)
}

fn write_turn_journal(path: &Path, document: &mut TurnJournalDocument) -> Result<(), String> {
    if document.records.len() > JOURNAL_MAX_RECORDS {
        return Err("turn_journal_full".to_string());
    }
    document.saved_at = now();
    let bytes =
        serde_json::to_vec_pretty(document).map_err(|_| "turn_journal_invalid".to_string())?;
    if bytes.len() > JOURNAL_MAX_BYTES {
        return Err("turn_journal_full".to_string());
    }
    let parent = path
        .parent()
        .ok_or_else(|| "turn_journal_unavailable".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "turn_journal_unavailable".to_string())?;
    let staged = path.with_extension("json.tmp");
    if staged.exists() {
        fs::remove_file(&staged).map_err(|_| "turn_journal_unavailable".to_string())?;
    }
    fs::write(&staged, bytes).map_err(|_| "turn_journal_unavailable".to_string())?;
    fs::File::open(&staged)
        .and_then(|file| file.sync_all())
        .map_err(|_| "turn_journal_unavailable".to_string())?;
    fs::rename(&staged, path).map_err(|_| "turn_journal_unavailable".to_string())?;
    fs::File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|_| "turn_journal_unavailable".to_string())?;
    Ok(())
}

pub fn admit_turn(
    path: &Path,
    authority: TurnJournalAuthority,
    admitted_at: Option<String>,
) -> Result<TurnJournalRecord, String> {
    validate_authority(&authority)?;
    let mut document = read_turn_journal(path)?;
    if let Some(existing) = document
        .records
        .iter()
        .find(|record| record.authority.run_id == authority.run_id)
    {
        return if existing.authority == authority {
            Ok(existing.clone())
        } else {
            Err("turn_journal_authority_conflict".to_string())
        };
    }
    if document.records.iter().any(|record| {
        record.authority.journey_id == authority.journey_id
            && !matches!(
                record.phase,
                TurnPhase::OutboxEnqueued | TurnPhase::Settled | TurnPhase::Interrupted
            )
    }) {
        return Err("turn_journal_journey_occupied".to_string());
    }
    while document.records.len() >= JOURNAL_MAX_RECORDS {
        let Some(index) = document
            .records
            .iter()
            .position(|record| record.phase == TurnPhase::Settled)
        else {
            return Err("turn_journal_full".to_string());
        };
        document.records.remove(index);
    }
    let timestamp = admitted_at.unwrap_or_else(now);
    let record = TurnJournalRecord {
        schema_version: JOURNAL_SCHEMA_VERSION.to_string(),
        authority,
        phase: TurnPhase::Admitted,
        terminal_outcome: None,
        terminal_evidence: None,
        cancellation_intent: TurnCancellationIntent::None,
        recovery_disposition: TurnRecoveryDisposition::ResumeExecution,
        revision: 1,
        created_at: timestamp.clone(),
        updated_at: timestamp,
        last_receipt: None,
    };
    document.records.push(record.clone());
    document.records.sort_by(|left, right| {
        left.created_at
            .cmp(&right.created_at)
            .then_with(|| left.authority.run_id.cmp(&right.authority.run_id))
    });
    write_turn_journal(path, &mut document)?;
    Ok(record)
}

fn valid_terminal_evidence(evidence: &TurnTerminalEvidence) -> bool {
    let execution_valid = evidence.pi_execution.as_ref().map_or(true, |execution| {
        valid_identifier(&execution.user_entry_id)
            && valid_identifier(&execution.assistant_entry_id)
            && valid_identifier(&execution.leaf_entry_id)
            && execution.entry_count > 0
            && execution.entry_count <= 1_000_000
            && execution.assistant_text.len() <= 65_536
            && !execution.started_at.is_empty()
            && !execution.committed_at.is_empty()
    });
    evidence.legacy_stdout.len() <= JOURNAL_MAX_TERMINAL_STREAM_BYTES
        && evidence.legacy_stderr.len() <= JOURNAL_MAX_TERMINAL_STREAM_BYTES
        && evidence.legacy_stdout.len() + evidence.legacy_stderr.len() <= JOURNAL_MAX_TERMINAL_STREAM_BYTES
        && !evidence.captured_at.trim().is_empty()
        && evidence.captured_at.len() <= 64
        && execution_valid
}

fn valid_transition(
    from: TurnPhase,
    to: TurnPhase,
    outcome: Option<TurnTerminalOutcome>,
    evidence: Option<&TurnTerminalEvidence>,
    cancellation_intent: Option<TurnCancellationIntent>,
) -> bool {
    if from == to && matches!(from, TurnPhase::Admitted | TurnPhase::Running) {
        return outcome.is_none()
            && evidence.is_none()
            && cancellation_intent == Some(TurnCancellationIntent::Requested);
    }
    match (from, to) {
        (TurnPhase::Admitted, TurnPhase::Running) => outcome.is_none() && evidence.is_none(),
        (TurnPhase::Admitted | TurnPhase::Running, TurnPhase::TerminalDurable) => match (outcome, evidence) {
            (Some(TurnTerminalOutcome::Completed), Some(evidence)) => {
                evidence.pi_execution.is_some() && valid_terminal_evidence(evidence)
            }
            (Some(_), Some(evidence)) => valid_terminal_evidence(evidence),
            _ => false,
        },
        (TurnPhase::Admitted | TurnPhase::Running, TurnPhase::Interrupted) => {
            outcome.is_none() && evidence.is_none()
        }
        (TurnPhase::TerminalDurable, TurnPhase::Projected | TurnPhase::Interrupted) => {
            outcome.is_none() && evidence.is_none()
        }
        (TurnPhase::Projected, TurnPhase::OutboxEnqueued) => {
            outcome.is_none() && evidence.is_none()
        }
        (TurnPhase::OutboxEnqueued, TurnPhase::Settled) => outcome.is_none() && evidence.is_none(),
        _ => false,
    }
}

fn default_recovery(phase: TurnPhase) -> TurnRecoveryDisposition {
    match phase {
        TurnPhase::Admitted | TurnPhase::Running => TurnRecoveryDisposition::ResumeExecution,
        TurnPhase::TerminalDurable => TurnRecoveryDisposition::ResumeProjection,
        TurnPhase::Projected => TurnRecoveryDisposition::ResumeOutbox,
        TurnPhase::OutboxEnqueued => TurnRecoveryDisposition::Complete,
        TurnPhase::Settled => TurnRecoveryDisposition::Complete,
        TurnPhase::Interrupted => TurnRecoveryDisposition::Interrupted,
    }
}

pub fn transition_turn(
    path: &Path,
    authority: &TurnJournalAuthority,
    request: TurnTransitionRequest,
) -> Result<TurnJournalRecord, String> {
    validate_authority(authority)?;
    if request.receipt_id.is_empty()
        || request.receipt_id.len() > JOURNAL_MAX_RECEIPT_LENGTH
        || !valid_identifier(&request.receipt_id)
        || !valid_transition(
            request.expected_phase,
            request.next_phase,
            request.terminal_outcome,
            request.terminal_evidence.as_ref(),
            request.cancellation_intent,
        )
    {
        return Err("turn_journal_transition_invalid".to_string());
    }
    let terminal_evidence_digest = request.terminal_evidence.as_ref().map(|evidence| {
        let bytes =
            serde_json::to_vec(evidence).expect("terminal evidence serialization is infallible");
        format!("{:x}", Sha256::digest(bytes))
    });
    let receipt = TurnTransitionReceipt {
        receipt_id: request.receipt_id,
        expected_phase: request.expected_phase,
        next_phase: request.next_phase,
        terminal_outcome: request.terminal_outcome,
        terminal_evidence_digest,
        cancellation_intent: request.cancellation_intent,
    };
    let mut document = read_turn_journal(path)?;
    let record = document
        .records
        .iter_mut()
        .find(|record| record.authority.run_id == authority.run_id)
        .ok_or_else(|| "turn_journal_record_missing".to_string())?;
    if record.authority != *authority {
        return Err("turn_journal_authority_conflict".to_string());
    }
    if record
        .last_receipt
        .as_ref()
        .is_some_and(|existing| existing.receipt_id == receipt.receipt_id)
    {
        return if record.last_receipt.as_ref() == Some(&receipt) {
            Ok(record.clone())
        } else {
            Err("turn_journal_receipt_conflict".to_string())
        };
    }
    if record.revision != request.expected_revision || record.phase != request.expected_phase {
        return Err("turn_journal_transition_stale".to_string());
    }
    record.phase = request.next_phase;
    if let Some(outcome) = request.terminal_outcome {
        if record.terminal_outcome.is_some() && record.terminal_outcome != Some(outcome) {
            return Err("turn_journal_terminal_conflict".to_string());
        }
        record.terminal_outcome = Some(outcome);
    }
    if let Some(evidence) = request.terminal_evidence {
        if record.terminal_evidence.is_some()
            && record.terminal_evidence.as_ref() != Some(&evidence)
        {
            return Err("turn_journal_terminal_conflict".to_string());
        }
        record.terminal_evidence = Some(evidence);
    }
    if let Some(intent) = request.cancellation_intent {
        if record.cancellation_intent == TurnCancellationIntent::Requested
            && intent == TurnCancellationIntent::None
        {
            return Err("turn_journal_cancellation_conflict".to_string());
        }
        record.cancellation_intent = intent;
    }
    record.recovery_disposition = request
        .recovery_disposition
        .unwrap_or_else(|| default_recovery(request.next_phase));
    record.revision += 1;
    record.updated_at = now();
    record.last_receipt = Some(receipt);
    let result = record.clone();
    write_turn_journal(path, &mut document)?;
    Ok(result)
}

pub fn can_interrupt_inactive_turn(
    record: &TurnJournalRecord,
    active_generation: u64,
    journey_has_retained_lease: bool,
) -> bool {
    !journey_has_retained_lease
        && record.authority.generation <= active_generation
        && matches!(record.phase, TurnPhase::Admitted | TurnPhase::Running | TurnPhase::TerminalDurable)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root(label: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("nautilus-turn-journal-{}-{}", label, nonce))
    }

    fn authority(run: &str, journey: &str) -> TurnJournalAuthority {
        TurnJournalAuthority {
            schema_version: "0.1.0".to_string(),
            journey_id: journey.to_string(),
            run_id: run.to_string(),
            turn_id: format!("turn-{}", run),
            thread_id: format!("thread-{}", journey),
            generation: 1,
            pi_session_id: format!("pi-{}", journey),
            mirror_conversation_id: format!("mirror-{}", journey),
            harness_user_message_id: format!("user-{}", run),
            harness_assistant_message_id: format!("assistant-{}", run),
        }
    }

    fn transition(
        expected_revision: u64,
        from: TurnPhase,
        to: TurnPhase,
        receipt: &str,
    ) -> TurnTransitionRequest {
        TurnTransitionRequest {
            expected_revision,
            expected_phase: from,
            next_phase: to,
            receipt_id: receipt.to_string(),
            terminal_outcome: if to == TurnPhase::TerminalDurable {
                Some(TurnTerminalOutcome::Completed)
            } else {
                None
            },
            terminal_evidence: if to == TurnPhase::TerminalDurable {
                Some(TurnTerminalEvidence {
                    legacy_stdout: String::new(),
                    legacy_stderr: String::new(),
                    legacy_stdout_truncated: false,
                    legacy_stderr_truncated: false,
                    captured_at: "2026-09-01T20:00:01.000Z".to_string(),
                    pi_execution: Some(TurnPiExecutionEvidence {
                        user_entry_id: "pi-user".to_string(),
                        assistant_entry_id: "pi-assistant".to_string(),
                        leaf_entry_id: "pi-assistant".to_string(),
                        entry_count: 2,
                        assistant_text: "answer".to_string(),
                        assistant_text_truncated: false,
                        started_at: "2026-09-01T20:00:00.000Z".to_string(),
                        committed_at: "2026-09-01T20:00:01.000Z".to_string(),
                    }),
                })
            } else {
                None
            },
            cancellation_intent: None,
            recovery_disposition: None,
        }
    }

    #[test]
    fn interruption_requires_an_inactive_current_or_prior_generation() {
        let path = root("inactive-policy");
        let record = admit_turn(&path, authority("run-a", "journey-a"), None).unwrap();
        assert!(can_interrupt_inactive_turn(&record, 2, false));
        assert!(can_interrupt_inactive_turn(&record, 1, false));
        assert!(!can_interrupt_inactive_turn(&record, 0, false));
        assert!(!can_interrupt_inactive_turn(&record, 2, true));
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn exact_admission_and_transitions_are_durable_and_idempotent() {
        let root = root("idempotent");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        let admitted = admit_turn(
            &path,
            auth.clone(),
            Some("2026-09-01T20:00:00.000Z".to_string()),
        )
        .unwrap();
        assert_eq!(admitted.phase, TurnPhase::Admitted);
        assert_eq!(admit_turn(&path, auth.clone(), None).unwrap(), admitted);
        let running = transition_turn(
            &path,
            &auth,
            transition(
                1,
                TurnPhase::Admitted,
                TurnPhase::Running,
                "receipt-running",
            ),
        )
        .unwrap();
        assert_eq!(running.revision, 2);
        let duplicate = transition_turn(
            &path,
            &auth,
            transition(
                1,
                TurnPhase::Admitted,
                TurnPhase::Running,
                "receipt-running",
            ),
        )
        .unwrap();
        assert_eq!(duplicate, running);
        let terminal_request = transition(
            2,
            TurnPhase::Running,
            TurnPhase::TerminalDurable,
            "receipt-terminal",
        );
        let durable = transition_turn(&path, &auth, terminal_request.clone()).unwrap();
        assert_eq!(
            durable.terminal_outcome,
            Some(TurnTerminalOutcome::Completed)
        );
        assert_eq!(
            durable.terminal_evidence.as_ref().unwrap().pi_execution.as_ref().unwrap().assistant_text,
            "answer"
        );
        let serialized = fs::read_to_string(&path).unwrap();
        assert!(!serialized.contains("\"stdout\""));
        assert!(!serialized.contains("\"stderr\""));
        assert!(serialized.contains("\"assistantText\": \"answer\""));
        let mut missing_execution = transition(
            2,
            TurnPhase::Running,
            TurnPhase::TerminalDurable,
            "receipt-missing-execution",
        );
        missing_execution.terminal_evidence.as_mut().unwrap().pi_execution = None;
        assert_eq!(
            transition_turn(&path, &auth, missing_execution).unwrap_err(),
            "turn_journal_transition_invalid"
        );
        let mut divergent_terminal = terminal_request;
        divergent_terminal
            .terminal_evidence
            .as_mut()
            .unwrap()
            .pi_execution
            .as_mut()
            .unwrap()
            .assistant_text = "different".to_string();
        assert_eq!(
            transition_turn(&path, &auth, divergent_terminal).unwrap_err(),
            "turn_journal_receipt_conflict"
        );
        assert_eq!(read_turn_journal(&path).unwrap().records[0], durable);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn stale_divergent_and_cross_authority_mutations_fail_closed() {
        let root = root("authority");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        admit_turn(&path, auth.clone(), None).unwrap();
        assert_eq!(
            admit_turn(&path, authority("run-2", "journey-a"), None).unwrap_err(),
            "turn_journal_journey_occupied"
        );
        assert_eq!(
            transition_turn(
                &path,
                &auth,
                transition(2, TurnPhase::Admitted, TurnPhase::Running, "receipt-stale")
            )
            .unwrap_err(),
            "turn_journal_transition_stale"
        );
        let mut wrong = auth.clone();
        wrong.generation = 2;
        assert_eq!(
            transition_turn(
                &path,
                &wrong,
                transition(1, TurnPhase::Admitted, TurnPhase::Running, "receipt-wrong")
            )
            .unwrap_err(),
            "turn_journal_authority_conflict"
        );
        let running = transition_turn(
            &path,
            &auth,
            transition(1, TurnPhase::Admitted, TurnPhase::Running, "receipt-shared"),
        )
        .unwrap();
        let mut divergent =
            transition(1, TurnPhase::Admitted, TurnPhase::Running, "receipt-shared");
        divergent.next_phase = TurnPhase::Interrupted;
        assert_eq!(
            transition_turn(&path, &auth, divergent).unwrap_err(),
            "turn_journal_receipt_conflict"
        );
        assert_eq!(read_turn_journal(&path).unwrap().records[0], running);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn cancellation_intent_is_durable_idempotent_and_orthogonal_to_terminal_outcome() {
        let root = root("cancellation");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        admit_turn(&path, auth.clone(), None).unwrap();
        let running = transition_turn(&path, &auth, transition(1, TurnPhase::Admitted, TurnPhase::Running, "running")).unwrap();
        let cancellation = TurnTransitionRequest {
            expected_revision: running.revision,
            expected_phase: TurnPhase::Running,
            next_phase: TurnPhase::Running,
            receipt_id: "cancel-run-1".to_string(),
            terminal_outcome: None,
            terminal_evidence: None,
            cancellation_intent: Some(TurnCancellationIntent::Requested),
            recovery_disposition: Some(TurnRecoveryDisposition::ResumeExecution),
        };
        let requested = transition_turn(&path, &auth, cancellation.clone()).unwrap();
        assert_eq!(requested.cancellation_intent, TurnCancellationIntent::Requested);
        assert_eq!(transition_turn(&path, &auth, cancellation).unwrap(), requested);
        let terminal = transition_turn(&path, &auth, transition(requested.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal")).unwrap();
        assert_eq!(terminal.cancellation_intent, TurnCancellationIntent::Requested);
        assert_eq!(terminal.terminal_outcome, Some(TurnTerminalOutcome::Completed));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn restart_reads_expose_one_safe_operation_at_each_durable_frontier() {
        let root = root("restart-frontiers");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        let admitted = admit_turn(&path, auth.clone(), None).unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap().records[0].recovery_disposition,
            TurnRecoveryDisposition::ResumeExecution
        );
        let running = transition_turn(
            &path,
            &auth,
            transition(
                admitted.revision,
                TurnPhase::Admitted,
                TurnPhase::Running,
                "running",
            ),
        )
        .unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap().records[0].phase,
            TurnPhase::Running
        );
        let terminal = transition_turn(
            &path,
            &auth,
            transition(
                running.revision,
                TurnPhase::Running,
                TurnPhase::TerminalDurable,
                "terminal",
            ),
        )
        .unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap().records[0].recovery_disposition,
            TurnRecoveryDisposition::ResumeProjection
        );
        let projected = transition_turn(
            &path,
            &auth,
            transition(
                terminal.revision,
                TurnPhase::TerminalDurable,
                TurnPhase::Projected,
                "projected",
            ),
        )
        .unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap().records[0].recovery_disposition,
            TurnRecoveryDisposition::ResumeOutbox
        );
        let enqueued = transition_turn(
            &path,
            &auth,
            transition(
                projected.revision,
                TurnPhase::Projected,
                TurnPhase::OutboxEnqueued,
                "enqueued",
            ),
        )
        .unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap().records[0].recovery_disposition,
            TurnRecoveryDisposition::Complete
        );
        let settled = transition_turn(
            &path,
            &auth,
            transition(
                enqueued.revision,
                TurnPhase::OutboxEnqueued,
                TurnPhase::Settled,
                "settled",
            ),
        )
        .unwrap();
        assert_eq!(read_turn_journal(&path).unwrap().records[0], settled);

        let interrupted_auth = authority("run-2", "journey-a");
        let interrupted_admitted = admit_turn(&path, interrupted_auth.clone(), None).unwrap();
        let interrupted_running = transition_turn(
            &path,
            &interrupted_auth,
            transition(
                interrupted_admitted.revision,
                TurnPhase::Admitted,
                TurnPhase::Running,
                "running-2",
            ),
        )
        .unwrap();
        let interrupted = transition_turn(
            &path,
            &interrupted_auth,
            transition(
                interrupted_running.revision,
                TurnPhase::Running,
                TurnPhase::Interrupted,
                "interrupted",
            ),
        )
        .unwrap();
        assert_eq!(
            interrupted.recovery_disposition,
            TurnRecoveryDisposition::Interrupted
        );
        assert!(admit_turn(&path, authority("run-3", "journey-a"), None).is_ok());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn two_journey_journals_interleave_without_cross_mutation() {
        let root = root("two-journey-interleaving");
        let path_a = root.join("journey-a.json");
        let path_b = root.join("journey-b.json");
        let auth_a = authority("run-a1", "journey-a");
        let auth_b = authority("run-b1", "journey-b");

        let admitted_a = admit_turn(&path_a, auth_a.clone(), None).unwrap();
        let admitted_b = admit_turn(&path_b, auth_b.clone(), None).unwrap();
        let running_a = transition_turn(
            &path_a,
            &auth_a,
            transition(admitted_a.revision, TurnPhase::Admitted, TurnPhase::Running, "a-running"),
        ).unwrap();
        let running_b = transition_turn(
            &path_b,
            &auth_b,
            transition(admitted_b.revision, TurnPhase::Admitted, TurnPhase::Running, "b-running"),
        ).unwrap();
        assert_eq!(
            admit_turn(&path_a, authority("run-a2", "journey-a"), None).unwrap_err(),
            "turn_journal_journey_occupied",
        );

        let a_while_running = fs::read(&path_a).unwrap();
        let terminal_b = transition_turn(
            &path_b,
            &auth_b,
            transition(running_b.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "b-terminal"),
        ).unwrap();
        let projected_b = transition_turn(
            &path_b,
            &auth_b,
            transition(terminal_b.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "b-projected"),
        ).unwrap();
        let enqueued_b = transition_turn(
            &path_b,
            &auth_b,
            transition(projected_b.revision, TurnPhase::Projected, TurnPhase::OutboxEnqueued, "b-enqueued"),
        ).unwrap();
        transition_turn(
            &path_b,
            &auth_b,
            transition(enqueued_b.revision, TurnPhase::OutboxEnqueued, TurnPhase::Settled, "b-settled"),
        ).unwrap();
        assert_eq!(fs::read(&path_a).unwrap(), a_while_running);

        let b_after_settlement = fs::read(&path_b).unwrap();
        let cancelled_a = transition_turn(&path_a, &auth_a, TurnTransitionRequest {
            expected_revision: running_a.revision,
            expected_phase: TurnPhase::Running,
            next_phase: TurnPhase::Running,
            receipt_id: "a-cancel-requested".to_string(),
            terminal_outcome: None,
            terminal_evidence: None,
            cancellation_intent: Some(TurnCancellationIntent::Requested),
            recovery_disposition: Some(TurnRecoveryDisposition::ResumeExecution),
        }).unwrap();
        let mut terminal_a_request = transition(
            cancelled_a.revision,
            TurnPhase::Running,
            TurnPhase::TerminalDurable,
            "a-terminal-cancelled",
        );
        terminal_a_request.terminal_outcome = Some(TurnTerminalOutcome::Cancelled);
        let terminal_a = transition_turn(&path_a, &auth_a, terminal_a_request).unwrap();
        transition_turn(
            &path_a,
            &auth_a,
            transition(terminal_a.revision, TurnPhase::TerminalDurable, TurnPhase::Interrupted, "a-interrupted"),
        ).unwrap();
        assert_eq!(fs::read(&path_b).unwrap(), b_after_settlement);
        assert_eq!(
            read_turn_journal(&path_a).unwrap().records[0].terminal_outcome,
            Some(TurnTerminalOutcome::Cancelled),
        );
        assert_eq!(read_turn_journal(&path_b).unwrap().records[0].phase, TurnPhase::Settled);
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn refuses_symlinked_or_corrupt_journal_state() {
        use std::os::unix::fs::symlink;
        let root = root("symlink");
        fs::create_dir_all(&root).unwrap();
        let outside = root.join("outside.json");
        fs::write(&outside, "protected").unwrap();
        let path = root.join("turn-journal.json");
        symlink(&outside, &path).unwrap();
        assert_eq!(
            read_turn_journal(&path).unwrap_err(),
            "turn_journal_invalid"
        );
        assert_eq!(fs::read_to_string(outside).unwrap(), "protected");
        fs::remove_dir_all(root).unwrap();
    }
}
