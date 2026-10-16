import { describe, expect, it } from "vitest";
import tauriSource from "../../src-tauri/src/main.rs?raw";

// CR128 lives inside the native recovery path, so the rule is proved by Rust tests and the wiring
// is proved here. The failure it fixes was never a wrong rule: the matcher was correct about what it
// could see, and what it could see (closed turns) could not describe a run that died before closing.
const region = (from: string, to: string) => {
  const start = tauriSource.indexOf(from);
  const end = tauriSource.indexOf(to, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return tauriSource.slice(start, end);
};

const occurrences = (needle: string) => tauriSource.split(needle).length - 1;

describe("CR128: stale records are paired against requests, not closed turns", () => {
  const attribution = region("fn attribute_stale_pi_record<'a>(", "fn recover_one_stale_journal_record(");

  // CR160 narrowed these four guards. They had pinned the *mechanics* of CR128's rule — one
  // high-water `frontier` and a one-to-one count of stale records against requests — and those
  // mechanics are what refused the field record twelve times in two weeks. What CR128 actually
  // established survives and is asserted below: requests are what records pair against, not closed
  // turns; a record is interrupted only on positive evidence the run is over; a trailing open request
  // is named rather than judged; and only a user entry with visible text is a request.

  it("retired the matcher that could only see closed turns, and the frontier that swallowed requests", () => {
    expect(tauriSource).not.toContain("fn match_unclaimed_pi_turn");
    expect(tauriSource).not.toContain("fn project_unclaimed_pi_requests");
    expect(attribution).not.toContain("frontier\n");
    expect(attribution).not.toContain("entry_count).max()");
    // Per-turn claims, which were already on disk, replace the high-water mark.
    expect(attribution).toContain("evidence.user_entry_id.as_str()");
    expect(attribution).toContain("claimed_user_ids.contains(entry.id.as_str())");
  });

  it("attributes inside the record's own admission window and refuses only genuine ambiguity", () => {
    expect(attribution).toContain("let admitted_at = parse(&record.created_at)?;");
    expect(attribution).toContain("asked_at < admitted_at || next_admitted_at.is_some_and(|next| asked_at >= next)");
    expect(attribution).toContain('_ => Err("mirror_append_pi_recovery_ambiguous".to_string())');
    expect(attribution).toContain("mirror_append_pi_recovery_frontier_mismatch");
    // The count rule is gone: there is no comparison of two lengths anywhere in the function.
    expect(attribution).not.toContain(".len() != ");
  });

  it("interrupts only on positive evidence that the run is over", () => {
    // A later admission on the same thread is that evidence. A trailing open request is named,
    // because another instance sharing the data directory could still be running it; a record with
    // no request and no later admission is named too, as its own fact.
    expect(attribution).toContain("None if next_admitted_at.is_some() => Ok(StalePiAttribution::Interrupted)");
    expect(attribution).toContain("[] if next_admitted_at.is_some() => Ok(StalePiAttribution::Interrupted)");
    expect(attribution).toContain('None => Err("mirror_append_pi_recovery_request_open".to_string())');
    expect(attribution).toContain('[] => Err("mirror_append_pi_recovery_request_missing".to_string())');
  });

  it("counts only user entries with visible text as requests, as the legacy projection does", () => {
    expect(attribution).toContain('entry.role.as_deref() != Some("user")');
    expect(attribution).toContain("entry.text.trim().is_empty()");
  });
});

describe("CR128: recovery takes the interruption the journal always permitted", () => {
  const recovery = region("fn recover_one_stale_journal_record(", "fn interrupt_stale_journal_record(");
  // CR149 moved the command to `#[tauri::command(async)]`; the region ends at the function, not at
  // its attribute, so the attribute may change again without this guard reading it as a regression.
  const interruption = region("fn interrupt_stale_journal_record(", "fn reconcile_pi_backed_mirror_delivery_debt(");

  it("branches on the attribution instead of demanding a closed turn", () => {
    expect(recovery).toContain("attribute_stale_pi_record(record, records, &branch, &turns)?");
    expect(recovery).toContain("StalePiAttribution::Closed(turn) => turn,");
    expect(recovery).toContain("StalePiAttribution::Interrupted => return interrupt_stale_journal_record(app, record),");
  });

  it("interrupts with no outcome and no evidence, which is the only shape the journal accepts", () => {
    expect(interruption).toContain("next_phase: TurnPhase::Interrupted,");
    expect(interruption).toContain("terminal_outcome: None,");
    expect(interruption).toContain("terminal_evidence: None,");
    expect(interruption).toContain("recovery_disposition: Some(TurnRecoveryDisposition::Interrupted),");
  });

  it("re-reads the record under the journal lock before transitioning it", () => {
    expect(interruption).toContain("with_turn_journal_lock(app, &authority");
    expect(interruption).toContain("matches!(current.phase, TurnPhase::Admitted | TurnPhase::Running)");
    expect(interruption).toContain("mirror_append_pi_recovery_record_stale");
  });

  it("is reached only from the stale-record recovery path", () => {
    // Definition plus the single call inside recover_one_stale_journal_record.
    expect(occurrences("interrupt_stale_journal_record(")).toBe(2);
  });
});
