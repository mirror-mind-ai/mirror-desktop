import { describe, expect, it } from "vitest";
import tauriSource from "../../src-tauri/src/main.rs?raw";

// CR126 lives entirely inside native commands, so the rule is proved by Rust tests and the wiring is
// proved here. CR118 shipped a correct domain rule with the wrong native ordering, which is why this
// file exists at all.
const region = (from: string, to: string) => {
  const start = tauriSource.indexOf(from);
  const end = tauriSource.indexOf(to, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return tauriSource.slice(start, end);
};

describe("CR126: the terminal evidence describes a run", () => {
  const evidence = region("fn terminal_pi_execution_evidence(", "fn classify_pi_process_terminal(");

  it("projects the run after the baseline instead of popping the last turn", () => {
    expect(evidence).toContain("project_pi_run_from_branch(&branch, baseline_leaf_entry_id)");
    // The old line is what made a correction the turn's request.
    expect(evidence).not.toContain("project_complete_pi_transcript(&content).ok()?.pop()");
  });

  it("keeps the guard that refuses a run which produced nothing new", () => {
    expect(evidence).toContain("baseline_leaf_entry_id == Some(turn.assistant_entry_id.as_str())");
  });
});

describe("CR126: the run is bounded by the invocation, not by a user entry", () => {
  const run = region("fn project_pi_run_from_branch(", "/// CR126: the turn spanning a pair");

  it("takes the first qualifying user entry after the baseline as the request", () => {
    expect(run).toContain("let user_index = branch.get(start..)?.iter().position(is_user)");
  });

  it("closes on the last reply the agent completed", () => {
    expect(run).toContain("rposition(closes)");
  });

  it("falls back to the previous behaviour when the baseline is not on the branch", () => {
    // A compaction can rewrite the history a baseline referred to. Spanning from the session start
    // would attribute the whole conversation to one turn.
    expect(run).toContain("None => return branch.iter().rposition(is_user)");
  });

  it("states that it is only defined at terminal time", () => {
    // The end of the run is the last completed reply, which is only the run's own reply because the
    // branch ends there when the process terminates. A later caller would span every run that
    // followed, so the precondition is written down rather than assumed.
    // The doc sits above the signature, so it is outside `run`.
    const doc = region("/// CR126: the run that follows a baseline leaf", "fn project_pi_run_from_branch(");
    expect(doc).toContain("**Defined at terminal time.**");
  });

  it("is reached only from the process-terminal path", () => {
    // Three call sites, all inside the terminal handling, plus none anywhere else.
    const callers = tauriSource.split("project_pi_run_from_branch").length - 1;
    // the definition, the doc reference in terminal_pi_execution_evidence, and nothing more
    expect(callers).toBe(2);
    expect(region("fn terminal_pi_execution_evidence(", "fn classify_pi_process_terminal("))
      .toContain("project_pi_run_from_branch");
  });

  it("interprets no text and needs nothing new across the boundary", () => {
    // The two directions the capture was weighing, both avoided: no steering claim is read here and
    // no envelope or length heuristic decides what a correction is.
    expect(run).not.toContain("steering");
    expect(run).not.toContain("Mirror Desktop Journey authority");
    expect(run).not.toContain("piUserEntryId");
  });
});

describe("CR126: evidence recorded before this change stays findable", () => {
  it("re-derives the turn a stored pair spans when building a Mirror append", () => {
    const site = region("fn create_pi_backed_mirror_append_item(", "fn read_mirror_append_outbox(");
    expect(site).toContain("project_pi_turn_spanning(&branch, &evidence.user_entry_id");
    // Scoped to the transcript list this site used to build. `turns.iter().find` also appears in
    // this file for an unrelated search over a projection's reconciliation turns by turnId.
    expect(site).not.toContain("project_complete_pi_transcript");
  });

  it("re-derives it again when validating an already-enqueued outbox item", () => {
    const site = region("fn validate_outbox_generation_authority(", "fn validate_outbox_acknowledgement(");
    expect(site).toContain("project_pi_turn_spanning(");
    expect(site).not.toContain("project_complete_pi_transcript");
  });

  it("spans a pair without consulting any precomputed turn list", () => {
    const spanning = region("fn project_pi_turn_spanning(", "fn latest_pi_leaf_entry_id(");
    expect(spanning).toContain("branch.iter().position(|entry| entry.id == user_entry_id)");
    expect(spanning).not.toContain("project_complete_pi_transcript");
  });
});

describe("CR126: what was deliberately left alone", () => {
  it("leaves the recovery matcher on the old segmentation", () => {
    // Recovery spans whole sessions and has no baseline, so run boundaries are not derivable there.
    // Its pre-existing ambiguity for a corrected run is recorded as debt, not fixed here.
    // CR128 changed what recovery pairs against (requests, not closed turns) but kept it on the
    // legacy segmentation: the turns it attributes are still the whole-session projection.
    const site = region("fn recover_one_stale_journal_record(", "fn interrupt_stale_journal_record(");
    expect(site).toContain("project_complete_pi_transcript_from_branch(&branch)");
    expect(site).toContain("attribute_stale_pi_record(record, records, &branch, &turns)");
    expect(site).not.toContain("project_pi_run_from_branch(");
  });

  it("leaves the shared projection and its two surfaces untouched", () => {
    expect(tauriSource).toContain("fn project_complete_pi_transcript_from_branch(");
    expect(tauriSource).toContain("turns: project_complete_pi_transcript_from_branch(&branch),");
  });

  it("stops routing the pre-run baseline through the evidence projection", () => {
    // `None` means "this session has no earlier run" to the run projection, and "tell me where the
    // last one ended" to the baseline. One function cannot mean both.
    expect(tauriSource).toContain("let baseline_leaf_entry_id = latest_pi_leaf_entry_id(&run_authority);");
    expect(tauriSource).not.toContain("terminal_pi_execution_evidence(&run_authority, None)\n        .map(");
  });
});
