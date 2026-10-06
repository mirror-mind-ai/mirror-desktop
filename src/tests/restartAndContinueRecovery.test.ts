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

  it("retired the matcher that could only see closed turns", () => {
    expect(tauriSource).not.toContain("fn match_unclaimed_pi_turn");
    expect(attribution).toContain("project_unclaimed_pi_requests(branch, turns, frontier, &claimed)");
  });

  it("still refuses when records and requests cannot pair one to one", () => {
    expect(attribution).toContain("if stale.len() != requests.len() || stale.is_empty()");
    expect(attribution).toContain("mirror_append_pi_recovery_ambiguous");
    expect(attribution).toContain("mirror_append_pi_recovery_frontier_mismatch");
  });

  it("interrupts only on positive evidence that the run is over", () => {
    // A later request on the same session is that evidence. A trailing open request is named,
    // because another instance sharing the data directory could still be running it.
    expect(attribution).toContain("None if index + 1 < requests.len() => Ok(StalePiAttribution::Interrupted)");
    expect(attribution).toContain('None => Err("mirror_append_pi_recovery_request_open".to_string())');
  });

  it("counts only user entries with visible text as requests, as the legacy projection does", () => {
    const requests = region("fn project_unclaimed_pi_requests<'a>(", "fn attribute_stale_pi_record<'a>(");
    expect(requests).toContain('entry.role.as_deref() == Some("user")');
    expect(requests).toContain("!entry.text.trim().is_empty()");
    expect(requests).toContain("index + 1 > frontier");
  });
});

describe("CR128: recovery takes the interruption the journal always permitted", () => {
  const recovery = region("fn recover_one_stale_journal_record(", "fn interrupt_stale_journal_record(");
  const interruption = region("fn interrupt_stale_journal_record(", "#[tauri::command]\nfn reconcile_pi_backed_mirror_delivery_debt(");

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
