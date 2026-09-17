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

fn retention_priority(phase: TurnPhase) -> u8 {
    match phase {
        TurnPhase::Settled => 0,
        TurnPhase::Interrupted => 1,
        TurnPhase::OutboxEnqueued => 2,
        TurnPhase::Projected => 3,
        TurnPhase::TerminalDurable => 4,
        TurnPhase::Admitted | TurnPhase::Running => 5,
    }
}

fn compact_turn_journal_for_write(
    document: &mut TurnJournalDocument,
    protected_run_id: &str,
    permit_unfinished_pruning: bool,
) -> Result<(), String> {
    loop {
        let bytes = serde_json::to_vec_pretty(document)
            .map_err(|_| "turn_journal_invalid".to_string())?;
        if document.records.len() <= JOURNAL_MAX_RECORDS && bytes.len() <= JOURNAL_MAX_BYTES {
            return Ok(());
        }
        let candidate = document.records.iter().enumerate()
            .filter(|(_, record)| record.authority.run_id != protected_run_id)
            .filter(|(_, record)| {
                permit_unfinished_pruning
                    || !matches!(record.phase, TurnPhase::Admitted | TurnPhase::Running)
            })
            .min_by_key(|(_, record)| (
                retention_priority(record.phase),
                record.created_at.as_str(),
                record.authority.run_id.as_str(),
            ))
            .map(|(index, _)| index)
            .ok_or_else(|| "turn_journal_full".to_string())?;
        document.records.remove(candidate);
    }
}

fn write_turn_journal(
    path: &Path,
    document: &mut TurnJournalDocument,
    protected_run_id: &str,
    permit_unfinished_pruning: bool,
) -> Result<(), String> {
    document.saved_at = now();
    compact_turn_journal_for_write(document, protected_run_id, permit_unfinished_pruning)?;
    let bytes =
        serde_json::to_vec_pretty(document).map_err(|_| "turn_journal_invalid".to_string())?;
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

fn has_current_completion_evidence(record: &TurnJournalRecord) -> bool {
    let Some(execution) = record
        .terminal_evidence
        .as_ref()
        .and_then(|evidence| evidence.pi_execution.as_ref())
    else {
        return false;
    };
    let parsed = (
        chrono::DateTime::parse_from_rfc3339(&record.created_at),
        chrono::DateTime::parse_from_rfc3339(&execution.started_at),
        chrono::DateTime::parse_from_rfc3339(&execution.committed_at),
    );
    matches!(parsed, (Ok(created), Ok(started), Ok(committed))
        if started >= created
            && committed >= started
            && !execution.assistant_text.is_empty()
            && !execution.assistant_text_truncated)
}

fn is_successor_eligible(record: &TurnJournalRecord) -> bool {
    matches!(
        record.phase,
        TurnPhase::OutboxEnqueued | TurnPhase::Settled | TurnPhase::Interrupted
    ) || (record.phase == TurnPhase::Projected
        && record.terminal_outcome == Some(TurnTerminalOutcome::Completed)
        && has_current_completion_evidence(record))
}

/// Appends lifecycle authority after the native registry has reserved exact execution.
/// Historical journal records are evidence, not process-occupancy authority.
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
    let protected_run_id = authority.run_id.clone();
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
    // Native admission reserves the only Journey lease before this call, proving
    // every pre-existing journal record is inactive in this process.
    write_turn_journal(path, &mut document, &protected_run_id, true)?;
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
    transition_turn_with_policy(path, authority, request, false)
}

pub fn interrupt_inactive_turn(
    path: &Path,
    authority: &TurnJournalAuthority,
    request: TurnTransitionRequest,
    active_generation: u64,
    journey_has_retained_lease: bool,
) -> Result<TurnJournalRecord, String> {
    let record = read_turn_journal(path)?
        .records
        .into_iter()
        .find(|record| record.authority == *authority)
        .ok_or_else(|| "turn_journal_record_missing".to_string())?;
    if record.revision != request.expected_revision {
        return Err("turn_journal_inactive_revision_stale".to_string());
    }
    if !can_interrupt_inactive_turn(&record, active_generation, journey_has_retained_lease) {
        return Err("turn_journal_inactive_interruption_unsafe".to_string());
    }
    transition_turn_with_policy(path, authority, request, true)
}

fn transition_turn_with_policy(
    path: &Path,
    authority: &TurnJournalAuthority,
    request: TurnTransitionRequest,
    permit_ineligible_projected_interruption: bool,
) -> Result<TurnJournalRecord, String> {
    validate_authority(authority)?;
    let requests_projected_interruption = request.expected_phase == TurnPhase::Projected
        && request.next_phase == TurnPhase::Interrupted
        && request.terminal_outcome.is_none()
        && request.terminal_evidence.is_none()
        && request.cancellation_intent.is_none();
    if request.receipt_id.is_empty()
        || request.receipt_id.len() > JOURNAL_MAX_RECEIPT_LENGTH
        || !valid_identifier(&request.receipt_id)
        || (!valid_transition(
            request.expected_phase,
            request.next_phase,
            request.terminal_outcome,
            request.terminal_evidence.as_ref(),
            request.cancellation_intent,
        ) && !(permit_ineligible_projected_interruption && requests_projected_interruption))
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
    if requests_projected_interruption
        && (!permit_ineligible_projected_interruption || is_successor_eligible(record))
    {
        return Err("turn_journal_transition_invalid".to_string());
    }
    if request.next_phase == TurnPhase::TerminalDurable
        && request.terminal_outcome == Some(TurnTerminalOutcome::Completed)
    {
        let mut candidate = record.clone();
        candidate.terminal_evidence = request.terminal_evidence.clone();
        if !has_current_completion_evidence(&candidate) {
            return Err("turn_journal_transition_invalid".to_string());
        }
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
    write_turn_journal(path, &mut document, &authority.run_id, false)?;
    Ok(result)
}

pub fn can_interrupt_inactive_turn(
    record: &TurnJournalRecord,
    active_generation: u64,
    journey_has_retained_lease: bool,
) -> bool {
    !journey_has_retained_lease
        && record.authority.generation <= active_generation
        && (matches!(record.phase, TurnPhase::Admitted | TurnPhase::Running | TurnPhase::TerminalDurable)
            || (record.phase == TurnPhase::Projected && !is_successor_eligible(record)))
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
                        started_at: "2099-09-01T20:00:00.000Z".to_string(),
                        committed_at: "2099-09-01T20:00:01.000Z".to_string(),
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
        assert!(admit_turn(&path, authority("run-2", "journey-a"), None).is_ok());
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
    fn bounded_historical_retention_never_blocks_a_reserved_successor() {
        let root = root("bounded-historical-retention");
        let path = root.join("turn-journal.json");
        for index in 0..=JOURNAL_MAX_RECORDS {
            admit_turn(
                &path,
                authority(&format!("run-{index:03}"), "journey-a"),
                Some(format!("2026-09-17T10:00:00.{index:09}Z")),
            ).unwrap();
        }

        let journal = read_turn_journal(&path).unwrap();
        assert_eq!(journal.records.len(), JOURNAL_MAX_RECORDS);
        assert!(!journal.records.iter().any(|record| record.authority.run_id == "run-000"));
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-064"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn bounded_retention_prefers_settled_history_and_protects_the_new_run() {
        let root = root("deterministic-retention");
        let path = root.join("turn-journal.json");
        for index in 0..JOURNAL_MAX_RECORDS {
            admit_turn(
                &path,
                authority(&format!("run-{index:03}"), "journey-a"),
                Some(format!("2026-09-17T10:00:00.{index:09}Z")),
            ).unwrap();
        }
        let settled_authority = authority("run-010", "journey-a");
        let running = transition_turn(
            &path,
            &settled_authority,
            transition(1, TurnPhase::Admitted, TurnPhase::Running, "running-010"),
        ).unwrap();
        let terminal = transition_turn(
            &path,
            &settled_authority,
            transition(running.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal-010"),
        ).unwrap();
        let projected = transition_turn(
            &path,
            &settled_authority,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "projected-010"),
        ).unwrap();
        let enqueued = transition_turn(
            &path,
            &settled_authority,
            transition(projected.revision, TurnPhase::Projected, TurnPhase::OutboxEnqueued, "enqueued-010"),
        ).unwrap();
        transition_turn(
            &path,
            &settled_authority,
            transition(enqueued.revision, TurnPhase::OutboxEnqueued, TurnPhase::Settled, "settled-010"),
        ).unwrap();

        admit_turn(
            &path,
            authority("run-064", "journey-a"),
            Some("2026-09-17T10:00:01.000000000Z".to_string()),
        ).unwrap();
        let journal = read_turn_journal(&path).unwrap();
        assert!(!journal.records.iter().any(|record| record.authority.run_id == "run-010"));
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-000"));
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-064"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn byte_retention_prunes_history_but_fails_closed_for_one_oversized_protected_run() {
        let root = root("byte-retention");
        let path = root.join("turn-journal.json");
        let protected = admit_turn(&path, authority("run-current", "journey-a"), None).unwrap();
        let mut historical = protected.clone();
        historical.authority = authority("run-historical", "journey-a");
        historical.phase = TurnPhase::TerminalDurable;
        historical.terminal_outcome = Some(TurnTerminalOutcome::Completed);
        historical.terminal_evidence = transition(
            2,
            TurnPhase::Running,
            TurnPhase::TerminalDurable,
            "historical-terminal",
        ).terminal_evidence;
        historical.terminal_evidence.as_mut().unwrap().pi_execution
            .as_mut().unwrap().assistant_text = "x".repeat(JOURNAL_MAX_BYTES);
        let mut journal = empty_document();
        journal.records = vec![historical.clone(), protected];

        compact_turn_journal_for_write(&mut journal, "run-current", false).unwrap();
        assert_eq!(journal.records.len(), 1);
        assert_eq!(journal.records[0].authority.run_id, "run-current");

        let mut oversized_protected = empty_document();
        oversized_protected.records.push(historical);
        assert_eq!(
            compact_turn_journal_for_write(
                &mut oversized_protected,
                "run-historical",
                false,
            ).unwrap_err(),
            "turn_journal_full",
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn transition_retention_never_prunes_another_unfinished_run_without_occupancy_proof() {
        let root = root("protected-unfinished-retention");
        let path = root.join("turn-journal.json");
        for index in 0..JOURNAL_MAX_RECORDS {
            admit_turn(
                &path,
                authority(&format!("run-{index:03}"), "journey-a"),
                Some(format!("2026-09-17T10:00:00.{index:09}Z")),
            ).unwrap();
        }
        let mut journal = read_turn_journal(&path).unwrap();
        let mut extra = journal.records[0].clone();
        extra.authority = authority("run-064", "journey-a");
        journal.records.push(extra);

        assert_eq!(
            compact_turn_journal_for_write(&mut journal, "run-000", false).unwrap_err(),
            "turn_journal_full",
        );
        assert_eq!(journal.records.len(), JOURNAL_MAX_RECORDS + 1);
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-000"));
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-064"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn historical_journal_lifecycle_never_owns_successor_admission() {
        let root = root("native-owned-successor-admission");
        let path = root.join("turn-journal.json");
        let first = authority("run-1", "journey-a");
        admit_turn(&path, first.clone(), None).unwrap();
        transition_turn(
            &path,
            &first,
            transition(1, TurnPhase::Admitted, TurnPhase::Running, "running"),
        ).unwrap();

        let successor = admit_turn(&path, authority("run-2", "journey-a"), None).unwrap();
        assert_eq!(successor.authority.run_id, "run-2");
        assert_eq!(read_turn_journal(&path).unwrap().records.len(), 2);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn completed_projected_turn_allows_a_successor_before_mirror_synchronization() {
        let root = root("projected-successor");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        let admitted = admit_turn(&path, auth.clone(), None).unwrap();
        let running = transition_turn(
            &path,
            &auth,
            transition(admitted.revision, TurnPhase::Admitted, TurnPhase::Running, "running"),
        ).unwrap();
        let terminal = transition_turn(
            &path,
            &auth,
            transition(running.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal"),
        ).unwrap();
        let projected = transition_turn(
            &path,
            &auth,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "projected"),
        ).unwrap();
        assert!(!can_interrupt_inactive_turn(&projected, 1, false));
        assert_eq!(
            transition_turn(
                &path,
                &auth,
                transition(projected.revision, TurnPhase::Projected, TurnPhase::Interrupted, "invalid-interruption"),
            ).unwrap_err(),
            "turn_journal_transition_invalid",
        );

        assert!(admit_turn(&path, authority("run-2", "journey-a"), None).is_ok());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn stale_completed_projection_can_be_preserved_and_interrupted_without_losing_evidence() {
        let root = root("stale-completed-projected");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        let admitted = admit_turn(&path, auth.clone(), None).unwrap();
        let running = transition_turn(
            &path,
            &auth,
            transition(admitted.revision, TurnPhase::Admitted, TurnPhase::Running, "running"),
        ).unwrap();
        let terminal = transition_turn(
            &path,
            &auth,
            transition(running.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal"),
        ).unwrap();
        transition_turn(
            &path,
            &auth,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "projected"),
        ).unwrap();

        let mut document = read_turn_journal(&path).unwrap();
        document.records[0]
            .terminal_evidence
            .as_mut()
            .unwrap()
            .pi_execution
            .as_mut()
            .unwrap()
            .assistant_text_truncated = true;
        write_turn_journal(&path, &mut document, &auth.run_id, false).unwrap();
        let stale = read_turn_journal(&path).unwrap().records.remove(0);
        assert!(!is_successor_eligible(&stale));
        assert!(admit_turn(&path, authority("run-2", "journey-a"), None).is_ok());
        assert!(can_interrupt_inactive_turn(&stale, 1, false));
        assert_eq!(
            transition_turn(
                &path,
                &auth,
                transition(stale.revision, TurnPhase::Projected, TurnPhase::Interrupted, "generic-interruption"),
            ).unwrap_err(),
            "turn_journal_transition_invalid",
        );

        let interrupted = interrupt_inactive_turn(
            &path,
            &auth,
            transition(stale.revision, TurnPhase::Projected, TurnPhase::Interrupted, "preserved-stale-projection"),
            1,
            false,
        ).unwrap();
        assert_eq!(interrupted.phase, TurnPhase::Interrupted);
        assert_eq!(interrupted.terminal_outcome, stale.terminal_outcome);
        assert_eq!(interrupted.terminal_evidence, stale.terminal_evidence);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_projected_turn_preserves_recovery_evidence_without_blocking_a_successor() {
        let root = root("failed-projected-successor");
        let path = root.join("turn-journal.json");
        let auth = authority("run-1", "journey-a");
        let admitted = admit_turn(&path, auth.clone(), None).unwrap();
        let running = transition_turn(
            &path,
            &auth,
            transition(admitted.revision, TurnPhase::Admitted, TurnPhase::Running, "running"),
        ).unwrap();
        let mut failed = transition(
            running.revision,
            TurnPhase::Running,
            TurnPhase::TerminalDurable,
            "failed",
        );
        failed.terminal_outcome = Some(TurnTerminalOutcome::ProcessDied);
        let terminal = transition_turn(&path, &auth, failed).unwrap();
        let projected = transition_turn(
            &path,
            &auth,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "projected"),
        ).unwrap();

        assert!(admit_turn(&path, authority("run-2", "journey-a"), None).is_ok());
        assert!(can_interrupt_inactive_turn(&projected, 1, false));
        assert!(!can_interrupt_inactive_turn(&projected, 1, true));
        assert_eq!(
            interrupt_inactive_turn(
                &path,
                &auth,
                transition(projected.revision, TurnPhase::Projected, TurnPhase::Interrupted, "retained-lease"),
                1,
                true,
            ).unwrap_err(),
            "turn_journal_inactive_interruption_unsafe",
        );
        let interrupted = interrupt_inactive_turn(
            &path,
            &auth,
            transition(projected.revision, TurnPhase::Projected, TurnPhase::Interrupted, "preserved-interruption"),
            1,
            false,
        ).unwrap();
        assert_eq!(interrupted.phase, TurnPhase::Interrupted);
        assert_eq!(interrupted.terminal_outcome, projected.terminal_outcome);
        assert_eq!(interrupted.terminal_evidence, projected.terminal_evidence);
        assert!(admit_turn(&path, authority("run-2", "journey-a"), None).is_ok());
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
        assert!(admit_turn(&path_a, authority("run-a2", "journey-a"), None).is_ok());

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
