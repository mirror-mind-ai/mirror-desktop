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

pub const PROVIDER_FAILURE_MAX_BYTES: usize = 2_048;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TurnProviderFailureEvidence {
    pub message: String,
    pub truncated: bool,
}

// Retains a bounded copy of the child's stderr so a provider failure can name
// its cause after the renderer state is gone; never the whole stream. Only
// error-shaped lines qualify: Pi also prints startup warnings, and quoting one
// as the terminal cause would invent an explanation the evidence cannot carry.
#[derive(Clone, Debug, Default)]
pub struct ProviderStderrCapture {
    last_error_line: Option<(String, bool)>,
}

impl ProviderStderrCapture {
    pub fn observe(&mut self, line: &str) {
        let trimmed = line.trim();
        if trimmed.is_empty() || !error_shaped(trimmed) {
            return;
        }
        self.last_error_line = Some(bounded_provider_line(trimmed));
    }

    pub fn evidence(&self) -> Option<TurnProviderFailureEvidence> {
        let (message, truncated) = self.last_error_line.clone()?;
        Some(TurnProviderFailureEvidence { message, truncated })
    }
}

fn error_shaped(line: &str) -> bool {
    let lowered = line.to_ascii_lowercase();
    if lowered.starts_with("warning") {
        return false;
    }
    lowered.contains("error")
        || lowered.contains("failed")
        || lowered.contains("exceeded")
        || lowered.contains("usage limit")
        || lowered.contains("rate limit")
}

fn bounded_provider_line(line: &str) -> (String, bool) {
    if line.len() <= PROVIDER_FAILURE_MAX_BYTES {
        return (line.to_string(), false);
    }
    let boundary = (0..=PROVIDER_FAILURE_MAX_BYTES)
        .rev()
        .find(|index| line.is_char_boundary(*index))
        .unwrap_or(0);
    (line[..boundary].to_string(), true)
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_failure: Option<TurnProviderFailureEvidence>,
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

/// Which unfinished records a write may reclaim to make room.
///
/// This used to be a bare `bool`, justified by the premise that native admission held the Journey's
/// only Pi lease, so every pre-existing record was inactive in this process. CR139 gives a Journey a
/// share of three live workspaces and that premise stops being true: an unfinished record may belong
/// to a sibling that is streaming right now, and it is the one record still being written to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum UnfinishedPruning<'a> {
    /// No unfinished record may be reclaimed.
    Forbidden,
    /// Only unfinished records in this exact workspace may be reclaimed. Reclaiming a sibling's
    /// record would delete live state; refusing the arriving turn instead fails closed.
    SameWorkspaceOnly {
        journey_id: &'a str,
        thread_id: &'a str,
    },
}

fn can_prune_retained_record(record: &TurnJournalRecord, unfinished: UnfinishedPruning<'_>) -> bool {
    match record.phase {
        TurnPhase::Settled | TurnPhase::Interrupted | TurnPhase::OutboxEnqueued => true,
        TurnPhase::Projected | TurnPhase::TerminalDurable => {
            record.terminal_outcome != Some(TurnTerminalOutcome::Completed)
        }
        TurnPhase::Admitted | TurnPhase::Running => match unfinished {
            UnfinishedPruning::Forbidden => false,
            UnfinishedPruning::SameWorkspaceOnly { journey_id, thread_id } => {
                record.authority.journey_id == journey_id && record.authority.thread_id == thread_id
            }
        },
    }
}

fn compact_turn_journal_for_write(
    document: &mut TurnJournalDocument,
    protected_run_id: &str,
    unfinished: UnfinishedPruning<'_>,
) -> Result<(), String> {
    loop {
        let bytes = serde_json::to_vec_pretty(document)
            .map_err(|_| "turn_journal_invalid".to_string())?;
        if document.records.len() <= JOURNAL_MAX_RECORDS && bytes.len() <= JOURNAL_MAX_BYTES {
            return Ok(());
        }
        let candidate = document.records.iter().enumerate()
            .filter(|(_, record)| record.authority.run_id != protected_run_id)
            .filter(|(_, record)| can_prune_retained_record(record, unfinished))
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
    unfinished: UnfinishedPruning<'_>,
) -> Result<(), String> {
    document.saved_at = now();
    compact_turn_journal_for_write(document, protected_run_id, unfinished)?;
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
    let protected_journey_id = authority.journey_id.clone();
    let protected_thread_id = authority.thread_id.clone();
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
    // CR139: a Journey may now hold several live workspaces, so an unfinished record is no longer
    // proof of inactivity. Only this workspace's own unfinished records may be reclaimed; a sibling
    // that is streaming keeps its record and the arriving turn is refused with `turn_journal_full`
    // instead.
    write_turn_journal(path, &mut document, &protected_run_id, UnfinishedPruning::SameWorkspaceOnly {
        journey_id: &protected_journey_id,
        thread_id: &protected_thread_id,
    })?;
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
    let provider_failure_valid = evidence.provider_failure.as_ref().map_or(true, |failure| {
        !failure.message.trim().is_empty() && failure.message.len() <= PROVIDER_FAILURE_MAX_BYTES
    });
    provider_failure_valid
        && evidence.legacy_stdout.len() <= JOURNAL_MAX_TERMINAL_STREAM_BYTES
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
        (TurnPhase::TerminalDurable, TurnPhase::Projected | TurnPhase::OutboxEnqueued | TurnPhase::Interrupted) => {
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
    write_turn_journal(path, &mut document, &authority.run_id, UnfinishedPruning::Forbidden)?;
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
    #[test]
    fn provider_stderr_capture_keeps_the_last_error_line() {
        let mut capture = ProviderStderrCapture::default();
        capture.observe("Error: transient hiccup");
        capture.observe("Error: You have hit your ChatGPT usage limit (plus plan).");
        let evidence = capture.evidence().unwrap();
        assert_eq!(evidence.message, "Error: You have hit your ChatGPT usage limit (plus plan).");
        assert!(!evidence.truncated);
    }

    #[test]
    fn provider_stderr_capture_ignores_startup_noise() {
        let mut capture = ProviderStderrCapture::default();
        capture.observe("   ");
        capture.observe("Loading extensions");
        capture.observe("Warning: No models match pattern \"claude-bridge/claude-fable-5\"");
        assert!(capture.evidence().is_none());
        capture.observe("Error: quota exhausted");
        capture.observe("shutting down");
        assert_eq!(capture.evidence().unwrap().message, "Error: quota exhausted");
    }

    #[test]
    fn provider_stderr_capture_recognizes_limit_phrasings_and_bounds_them() {
        let mut capture = ProviderStderrCapture::default();
        capture.observe("Request failed: rate limit reached");
        assert_eq!(capture.evidence().unwrap().message, "Request failed: rate limit reached");
        capture.observe(&format!("Error: {}", "x".repeat(PROVIDER_FAILURE_MAX_BYTES)));
        let evidence = capture.evidence().unwrap();
        assert_eq!(evidence.message.len(), PROVIDER_FAILURE_MAX_BYTES);
        assert!(evidence.truncated);
        let mut multibyte = ProviderStderrCapture::default();
        multibyte.observe(&format!("Error: {}", "é".repeat(PROVIDER_FAILURE_MAX_BYTES)));
        assert!(multibyte.evidence().unwrap().message.len() <= PROVIDER_FAILURE_MAX_BYTES);
    }

    #[test]
    fn terminal_evidence_bounds_provider_failure() {
        let mut evidence = TurnTerminalEvidence {
            legacy_stdout: String::new(), legacy_stderr: String::new(),
            legacy_stdout_truncated: false, legacy_stderr_truncated: false,
            captured_at: "2026-09-21T10:00:00Z".to_string(),
            pi_execution: None,
            provider_failure: Some(TurnProviderFailureEvidence {
                message: "Error: quota".to_string(), truncated: false,
            }),
        };
        assert!(valid_terminal_evidence(&evidence));
        evidence.provider_failure = Some(TurnProviderFailureEvidence { message: "   ".to_string(), truncated: false });
        assert!(!valid_terminal_evidence(&evidence));
        evidence.provider_failure = Some(TurnProviderFailureEvidence {
            message: "x".repeat(PROVIDER_FAILURE_MAX_BYTES + 1), truncated: true,
        });
        assert!(!valid_terminal_evidence(&evidence));
    }

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

    /// CR139: `authority(run, journey)` puts every record in one workspace, `thread-{journey}`,
    /// so this reproduces exactly what the old `permit_unfinished_pruning = true` meant.
    fn same_workspace(journey: &'static str) -> UnfinishedPruning<'static> {
        UnfinishedPruning::SameWorkspaceOnly {
            journey_id: journey,
            thread_id: if journey == "journey-a" { "thread-journey-a" } else { "thread-unknown" },
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
                    provider_failure: None,
                })
            } else {
                None
            },
            cancellation_intent: None,
            recovery_disposition: None,
        }
    }

    /// CR139 characterisation. Two workspaces in one Journey differ by `thread_id` and by nothing
    /// else that the journal keys on, so these build the authority the registry will soon admit.
    fn workspace_authority(journey: &str, thread: &str, run: &str) -> TurnJournalAuthority {
        TurnJournalAuthority {
            schema_version: "0.1.0".to_string(),
            journey_id: journey.to_string(),
            run_id: run.to_string(),
            turn_id: format!("turn-{}", run),
            thread_id: thread.to_string(),
            generation: 1,
            pi_session_id: format!("pi-{}", thread),
            mirror_conversation_id: format!("mirror-{}", thread),
            harness_user_message_id: format!("user-{}", run),
            harness_assistant_message_id: format!("assistant-{}", run),
        }
    }

    /// Drives a record to `Projected` + `Completed`, which `can_prune_retained_record` refuses to
    /// prune. Used to fill the journal with records that cannot be reclaimed.
    fn settle_to_projected(path: &std::path::Path, auth: &TurnJournalAuthority, created_at: &str) {
        admit_turn(path, auth.clone(), Some(created_at.to_string())).unwrap();
        transition_turn(path, auth, transition(1, TurnPhase::Admitted, TurnPhase::Running, "r-run")).unwrap();
        transition_turn(path, auth, transition(2, TurnPhase::Running, TurnPhase::TerminalDurable, "r-term")).unwrap();
        transition_turn(path, auth, transition(3, TurnPhase::TerminalDurable, TurnPhase::Projected, "r-proj")).unwrap();
    }

    // CR139 item 1, run against unchanged code before the registry is re-keyed: the durable layer
    // resolves by full authority, so two workspaces in one Journey must journal, run and settle
    // independently with their own revisions, in interleaved order.
    #[test]
    fn two_workspaces_in_one_journey_journal_and_settle_independently() {
        let root = root("cr139-two-workspaces");
        let path = root.join("turn-journal.json");
        let left = workspace_authority("journey-a", "thread-root", "run-left");
        let right = workspace_authority("journey-a", "thread-conversation", "run-right");

        admit_turn(&path, left.clone(), Some("2026-10-10T10:00:00.000Z".to_string())).unwrap();
        admit_turn(&path, right.clone(), Some("2026-10-10T10:00:01.000Z".to_string())).unwrap();
        // Interleaved on purpose: the right workspace overtakes the left one mid-lifecycle.
        transition_turn(&path, &left, transition(1, TurnPhase::Admitted, TurnPhase::Running, "l-run")).unwrap();
        transition_turn(&path, &right, transition(1, TurnPhase::Admitted, TurnPhase::Running, "r-run")).unwrap();
        transition_turn(&path, &right, transition(2, TurnPhase::Running, TurnPhase::TerminalDurable, "r-term")).unwrap();
        let left_terminal = transition_turn(
            &path, &left, transition(2, TurnPhase::Running, TurnPhase::TerminalDurable, "l-term"),
        ).unwrap();
        let right_projected = transition_turn(
            &path, &right, transition(3, TurnPhase::TerminalDurable, TurnPhase::Projected, "r-proj"),
        ).unwrap();

        assert_eq!(left_terminal.revision, 3);
        assert_eq!(right_projected.revision, 4);
        let records = read_turn_journal(&path).unwrap().records;
        assert_eq!(records.len(), 2);
        let stored_left = records.iter().find(|r| r.authority.run_id == "run-left").unwrap();
        let stored_right = records.iter().find(|r| r.authority.run_id == "run-right").unwrap();
        assert_eq!(stored_left.authority.thread_id, "thread-root");
        assert_eq!(stored_right.authority.thread_id, "thread-conversation");
        assert_eq!(stored_left.phase, TurnPhase::TerminalDurable);
        assert_eq!(stored_right.phase, TurnPhase::Projected);
        assert_eq!(stored_left.revision, 3);
        assert_eq!(stored_right.revision, 4);
        // Neither record's receipt leaked into the other.
        assert_eq!(stored_left.last_receipt.as_ref().unwrap().receipt_id, "l-term");
        assert_eq!(stored_right.last_receipt.as_ref().unwrap().receipt_id, "r-proj");
        fs::remove_dir_all(root).unwrap();
    }

    // CR139: `admit_turn` writes with `permit_unfinished_pruning = true`, justified by the premise
    // that native admission holds the Journey's only lease, so every pre-existing record is
    // inactive. A per-Journey share of three makes that premise false, and a full journal then
    // reclaims a *live* sibling's record — the one record that is still being written to.
    #[test]
    fn admitting_a_workspace_refuses_rather_than_pruning_a_live_sibling() {
        let root = root("cr139-live-sibling");
        let path = root.join("turn-journal.json");
        // Fill the journal with records that cannot be reclaimed, leaving the live sibling as the
        // only prunable candidate.
        for index in 0..(JOURNAL_MAX_RECORDS - 1) {
            let auth = workspace_authority("journey-a", "thread-old", &format!("run-old-{index:03}"));
            settle_to_projected(&path, &auth, &format!("2026-10-01T10:{:02}:{:02}.000Z", index / 60, index % 60));
        }
        let live = workspace_authority("journey-a", "thread-live", "run-live");
        admit_turn(&path, live.clone(), Some("2026-10-10T10:00:00.000Z".to_string())).unwrap();
        transition_turn(&path, &live, transition(1, TurnPhase::Admitted, TurnPhase::Running, "live-run")).unwrap();
        assert_eq!(read_turn_journal(&path).unwrap().records.len(), JOURNAL_MAX_RECORDS);

        let arriving = workspace_authority("journey-a", "thread-arriving", "run-arriving");
        assert_eq!(
            admit_turn(&path, arriving, Some("2026-10-10T10:00:02.000Z".to_string())).unwrap_err(),
            "turn_journal_full",
            "the arriving turn must be refused, not admitted by reclaiming a live record",
        );

        let records = read_turn_journal(&path).unwrap().records;
        let live_record = records.iter().find(|r| r.authority.run_id == "run-live");
        assert!(
            live_record.is_some(),
            "a streaming sibling workspace's record was reclaimed to make room for an arriving turn",
        );
        assert_eq!(live_record.unwrap().phase, TurnPhase::Running);
        assert_eq!(records.len(), JOURNAL_MAX_RECORDS);

        // The same workspace's own unfinished record is still reclaimable, which is what the old
        // `permit_unfinished_pruning = true` was actually for. Verdict preserved at the new grain.
        let same_workspace = workspace_authority("journey-a", "thread-live", "run-live-successor");
        let admitted = admit_turn(&path, same_workspace, Some("2026-10-10T10:00:03.000Z".to_string()));
        assert!(admitted.is_ok(), "a workspace must still be able to reclaim its own unfinished record");
        let records = read_turn_journal(&path).unwrap().records;
        assert!(!records.iter().any(|r| r.authority.run_id == "run-live"));
        assert!(records.iter().any(|r| r.authority.run_id == "run-live-successor"));
        fs::remove_dir_all(root).unwrap();
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
        historical.terminal_outcome = Some(TurnTerminalOutcome::ProcessDied);
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

        compact_turn_journal_for_write(&mut journal, "run-current", UnfinishedPruning::Forbidden).unwrap();
        assert_eq!(journal.records.len(), 1);
        assert_eq!(journal.records[0].authority.run_id, "run-current");

        let mut oversized_protected = empty_document();
        oversized_protected.records.push(historical);
        assert_eq!(
            compact_turn_journal_for_write(
                &mut oversized_protected,
                "run-historical",
                UnfinishedPruning::Forbidden,
            ).unwrap_err(),
            "turn_journal_full",
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn independently_durable_completed_history_cannot_fill_the_journal() {
        let root = root("durable-delivery-retention");
        let path = root.join("turn-journal.json");
        let source = authority("source", "journey-a");
        let admitted = admit_turn(&path, source.clone(), None).unwrap();
        let running = transition_turn(
            &path,
            &source,
            transition(admitted.revision, TurnPhase::Admitted, TurnPhase::Running, "running-source"),
        ).unwrap();
        let terminal = transition_turn(
            &path,
            &source,
            transition(running.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal-source"),
        ).unwrap();
        let enqueued = transition_turn(
            &path,
            &source,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::OutboxEnqueued, "enqueued-source"),
        ).unwrap();
        let mut journal = empty_document();
        journal.records = (0..JOURNAL_MAX_RECORDS).map(|index| {
            let mut record = enqueued.clone();
            record.authority = authority(&format!("delivered-{index:03}"), "journey-a");
            record.created_at = format!("2026-09-01T20:{:02}:00.000Z", index % 60);
            record
        }).collect();
        let protected = TurnJournalRecord {
            authority: authority("run-current", "journey-a"),
            created_at: "2026-09-01T21:30:00.000Z".to_string(),
            updated_at: "2026-09-01T21:30:00.000Z".to_string(),
            ..admitted
        };
        journal.records.push(protected);

        compact_turn_journal_for_write(&mut journal, "run-current", same_workspace("journey-a")).unwrap();
        assert_eq!(journal.records.len(), JOURNAL_MAX_RECORDS);
        assert!(journal.records.iter().any(|record| record.authority.run_id == "run-current"));
        assert!(!journal.records.iter().any(|record| record.authority.run_id == "delivered-000"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn completed_pre_outbox_evidence_is_not_pruned_as_if_delivery_debt_were_durable() {
        let root = root("pre-outbox-retention");
        let path = root.join("turn-journal.json");
        let auth = authority("source", "journey-a");
        let admitted = admit_turn(&path, auth.clone(), None).unwrap();
        let running = transition_turn(
            &path,
            &auth,
            transition(admitted.revision, TurnPhase::Admitted, TurnPhase::Running, "running-source"),
        ).unwrap();
        let terminal = transition_turn(
            &path,
            &auth,
            transition(running.revision, TurnPhase::Running, TurnPhase::TerminalDurable, "terminal-source"),
        ).unwrap();
        let projected = transition_turn(
            &path,
            &auth,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::Projected, "projected-source"),
        ).unwrap();
        let mut journal = empty_document();
        journal.records = (0..=JOURNAL_MAX_RECORDS).map(|index| {
            let mut record = projected.clone();
            record.authority = authority(&format!("run-{index:03}"), "journey-a");
            record
        }).collect();

        assert_eq!(
            compact_turn_journal_for_write(&mut journal, "run-064", same_workspace("journey-a")).unwrap_err(),
            "turn_journal_full",
        );
        assert_eq!(journal.records.len(), JOURNAL_MAX_RECORDS + 1);
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
            compact_turn_journal_for_write(&mut journal, "run-000", UnfinishedPruning::Forbidden).unwrap_err(),
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
    fn independently_durable_delivery_debt_can_skip_the_projection_phase() {
        let root = root("direct-outbox-frontier");
        let path = root.join("turn-journal.json");
        let auth = authority("run-current", "journey-a");
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

        let enqueued = transition_turn(
            &path,
            &auth,
            transition(terminal.revision, TurnPhase::TerminalDurable, TurnPhase::OutboxEnqueued, "debt-durable"),
        ).unwrap();
        assert_eq!(enqueued.phase, TurnPhase::OutboxEnqueued);
        assert_eq!(enqueued.recovery_disposition, TurnRecoveryDisposition::Complete);
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
        write_turn_journal(&path, &mut document, &auth.run_id, UnfinishedPruning::Forbidden).unwrap();
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
