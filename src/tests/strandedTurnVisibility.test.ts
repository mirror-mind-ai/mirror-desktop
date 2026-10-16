import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import {
  deriveStrandedTurn,
  describeStrandedTurn,
  STRANDED_SETTLEMENT_GRACE_MS,
  STRANDED_TURN_POLL_MS,
  newestJournalRecordForThread,
  type BelievedRun,
  type PiSessionLeaf,
} from "../app/strandedTurn";
import type { TurnJournalRecord, TurnPhase } from "../app/turnJournal";

const NOW = Date.parse("2026-10-10T18:40:00.000Z");

function record(phase: TurnPhase, overrides: {
  updatedAt?: string;
  runId?: string;
  threadId?: string;
  generation?: number;
  outcome?: TurnJournalRecord["terminalOutcome"];
} = {}): TurnJournalRecord {
  return {
    schemaVersion: "0.1.0",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "mirror-desktop",
      runId: overrides.runId ?? "run-stuck",
      turnId: "turn-stuck",
      threadId: overrides.threadId ?? "thread-A",
      generation: overrides.generation ?? 1,
      piSessionId: "pi",
      mirrorConversationId: "mc",
      harnessUserMessageId: "u",
      harnessAssistantMessageId: "a",
    },
    phase,
    terminalOutcome: overrides.outcome ?? (phase === "terminal_durable" ? "completed" : null),
    terminalEvidence: null,
    revision: 3,
    createdAt: "2026-10-10T17:38:10.509Z",
    updatedAt: overrides.updatedAt ?? "2026-10-10T17:38:42.472Z",
  } as unknown as TurnJournalRecord;
}

const believedRun: BelievedRun = {
  journeyId: "mirror-desktop", threadId: "thread-A", generation: 1, runId: "run-stuck",
};

function derive(input: {
  records?: TurnJournalRecord[];
  run?: BelievedRun;
  streaming?: boolean;
  now?: number;
  piLeaf?: PiSessionLeaf | null;
}) {
  return deriveStrandedTurn({
    piLeaf: input.piLeaf,
    journalRecords: input.records ?? [],
    // `in` rather than `=== undefined`: the absent case and the deliberately-undefined case are
    // different questions, and conflating them made this helper answer the wrong one.
    believedRun: "run" in input ? input.run : believedRun,
    believedStreaming: input.streaming ?? true,
    now: input.now ?? NOW,
  });
}

/**
 * CR142. The observed instance: the journal held `terminal_durable` with a complete answer for
 * seventy minutes while the surface said "Working…". Four surfaces could have reported it and all
 * four were suppressed by the renderer's own belief — and nothing ever re-evaluated that belief,
 * because every path that would is downstream of the event that went missing.
 */
describe("CR142: the journal is asked whether the turn already finished", () => {
  it("reports a turn the journal finished while the renderer still streams", () => {
    const result = derive({ records: [record("terminal_durable")] });
    // CR160 added `shape`; CR142's shape is the terminal journal.
    expect(result).toEqual({ stranded: true, record: expect.objectContaining({ phase: "terminal_durable" }), shape: "journal_terminal" });
  });

  /**
   * The false positive that matters most. A genuinely long turn reads `running`, so the two
   * sources agree and nothing is claimed. Telling a Navigator that a working turn is stranded
   * would be worse than the defect this CR repairs.
   */
  it("says nothing about a long turn the journal agrees is still running", () => {
    expect(derive({ records: [record("running")] })).toEqual({ stranded: false, reason: "journal_agrees" });
    expect(derive({ records: [record("admitted")] })).toEqual({ stranded: false, reason: "journal_agrees" });
  });

  /** CR115's idle post-terminal loop cannot reopen through this predicate. */
  it("says nothing at all when no turn is believed to be streaming", () => {
    expect(derive({ records: [record("terminal_durable")], streaming: false }))
      .toEqual({ stranded: false, reason: "not_streaming" });
    expect(derive({ records: [record("settled")], streaming: false }))
      .toEqual({ stranded: false, reason: "not_streaming" });
  });

  /**
   * The legitimate window this CR's plan did not originally account for: the native side writes
   * `terminal_durable` and *then* emits `done`, so both facts are briefly true at once. Without
   * the grace the predicate would call a healthy settlement a defect.
   */
  it("waits out the window in which a healthy settlement is still in flight", () => {
    const justNow = new Date(NOW - 2_000).toISOString();
    expect(derive({ records: [record("terminal_durable", { updatedAt: justNow })] }))
      .toEqual({ stranded: false, reason: "settling" });

    const pastGrace = new Date(NOW - STRANDED_SETTLEMENT_GRACE_MS - 1).toISOString();
    expect(derive({ records: [record("terminal_durable", { updatedAt: pastGrace })] }).stranded).toBe(true);
  });

  it("treats an unreadable timestamp as in flight rather than as stranded", () => {
    expect(derive({ records: [record("terminal_durable", { updatedAt: "not a date" })] }))
      .toEqual({ stranded: false, reason: "settling" });
  });

  it("never strands this turn on a sibling workspace's terminal record", () => {
    expect(derive({ records: [record("terminal_durable", { threadId: "thread-B", runId: "run-other" })] }))
      .toEqual({ stranded: false, reason: "no_record" });
  });

  it("never strands this turn on a previous generation or a previous run", () => {
    expect(derive({ records: [record("terminal_durable", { generation: 0 })] }))
      .toEqual({ stranded: false, reason: "no_record" });
    expect(derive({ records: [record("terminal_durable", { runId: "run-previous" })] }))
      .toEqual({ stranded: false, reason: "no_record" });
  });

  it("says nothing when the renderer streams without a live run authority", () => {
    expect(derive({ records: [record("terminal_durable")], run: undefined }))
      .toEqual({ stranded: false, reason: "no_believed_run" });
  });

  it("reads the newest record when a run has several", () => {
    const old = record("running", { updatedAt: "2026-10-10T17:38:20.000Z" });
    const now = record("terminal_durable", { updatedAt: "2026-10-10T17:38:42.472Z" });
    expect(derive({ records: [old, now] }).stranded).toBe(true);
    expect(derive({ records: [now, old] })).toEqual({ stranded: false, reason: "journal_agrees" });
  });

  /** The turn was never lost. The sentence must not imply that it was. */
  it("says the answer is saved rather than that something went missing", () => {
    const notice = describeStrandedTurn(record("terminal_durable"));
    expect(notice.sentence).toContain("the answer is saved");
    expect(notice.sentence).toContain("Nothing is lost");
    expect(notice.sentence.toLowerCase()).not.toContain("lost the");
    expect(describeStrandedTurn(record("terminal_durable", { outcome: "process_died" })).sentence)
      .toContain("The agent stopped this turn");
  });
});

describe("CR142: the poll cannot reopen the loop CR115 closed", () => {
  function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  /**
   * CR115's loop reconciled native occupancy on every pass, which walked the Send button through
   * a blocking state and re-rendered the tree between keystrokes. This read must be gated on a
   * believed-streaming turn and must touch occupancy not at all.
   */
  it("starts the journal poll only while a turn is believed to be streaming", () => {
    const stripped = withoutComments(appSource);
    const effect = stripped.slice(
      // CR160 widened this window: the poll gained the leaf read, which sits between the gate and the interval.
      stripped.indexOf("const interval = window.setInterval(poll, STRANDED_TURN_POLL_MS)") - 2600,
      stripped.indexOf("const interval = window.setInterval(poll, STRANDED_TURN_POLL_MS)") + 200,
    );
    expect(effect).toContain("if (!isStreaming");
    expect(effect).toContain("loadTurnJournal(ownerJourneyId)");
    expect(effect).not.toContain("reconcilePiInvocationOccupancy");
    expect(effect).not.toContain("listMirrorOutbox");
  });

  it("keeps the interval a named constant rather than a literal at the call site", () => {
    expect(withoutComments(appSource)).toContain("window.setInterval(poll, STRANDED_TURN_POLL_MS)");
    expect(STRANDED_TURN_POLL_MS).toBeGreaterThan(STRANDED_SETTLEMENT_GRACE_MS);
  });

  /**
   * The affordance, not the braver heuristic. The recovery already exists and a restart runs it
   * automatically; here the Navigator presses it, as they do in the two places it already appears.
   */
  it("offers the existing recovery rather than running it unasked", () => {
    const stripped = withoutComments(appSource);
    const notice = stripped.slice(
      stripped.indexOf("{strandedTurnNotice ? ("),
      stripped.indexOf("{showBlockingTurnRecoveryNotice ? ("),
    );
    expect(notice).toContain("recoverPostTerminalPersistence(selectedJourney)");
    expect(notice).toContain("Recover this turn");
    // CR142's third recorded defect: the answered prompt must not be left in the Composer.
    expect(notice).toContain("updateComposerDraft");
    expect(notice).toContain("conversationDraftKey");
  });
});

/**
 * CR160, RS025 Batch B. Field, 2026-10-16: the answer arrived at 13:01:49 and the journal record
 * froze at `running` 47 ms after admission, forever. Using the journal alone this is "a long turn's
 * case" and the predicate was right to say so. The session leaf is the durable fact that tells the
 * two apart, and it is read from the file's tail only while the journal still says running.
 */
describe("CR160: the journal never heard the turn finish", () => {
  const admittedAt = "2026-10-10T17:38:10.509Z"; // the fixture record's createdAt
  const finishedAt = "2026-10-10T17:40:00.000Z";
  function leaf(overrides: Partial<PiSessionLeaf> = {}): PiSessionLeaf {
    return { entryId: "a-1", entryType: "message", role: "assistant", stopReason: "stop", timestamp: finishedAt, ...overrides };
  }

  it("strands a running record whose session leaf is a terminal assistant committed after admission", () => {
    const stuck = record("running");
    const result = derive({ records: [stuck], piLeaf: leaf() });
    expect(result).toEqual({ stranded: true, record: stuck, shape: "journal_never_heard" });
    expect(derive({ records: [stuck], piLeaf: leaf({ stopReason: "length" }) }).stranded).toBe(true);
    expect(derive({ records: [record("admitted")], piLeaf: leaf() }).stranded).toBe(true);
  });

  it("waits out the grace after the leaf, as it does after a terminal journal", () => {
    const justFinished = Date.parse(finishedAt) + STRANDED_SETTLEMENT_GRACE_MS - 1;
    expect(derive({ records: [record("running")], piLeaf: leaf(), now: justFinished }))
      .toEqual({ stranded: false, reason: "settling" });
    expect(derive({ records: [record("running")], piLeaf: leaf(), now: justFinished + 1 }).stranded).toBe(true);
  });

  /**
   * The negative case RS025 requires. Every leaf a healthy long turn can have while it works must
   * leave the verdict exactly where CR142 put it, however long the turn has run.
   */
  it("says nothing about a long turn whose leaf is still work in progress", () => {
    const working: PiSessionLeaf[] = [
      leaf({ stopReason: "toolUse" }),
      leaf({ stopReason: null }),
      leaf({ role: "user", stopReason: null }),
      leaf({ role: "toolResult", stopReason: null }),
      leaf({ entryType: "context_edit", role: null, stopReason: null }),
      leaf({ entryType: "compaction", role: null, stopReason: null }),
      leaf({ stopReason: "error" }),
    ];
    for (const piLeaf of working) {
      expect(derive({ records: [record("running")], piLeaf, now: NOW + 3_600_000 }))
        .toEqual({ stranded: false, reason: "journal_agrees" });
    }
    expect(derive({ records: [record("running")], piLeaf: null })).toEqual({ stranded: false, reason: "journal_agrees" });
    expect(derive({ records: [record("running")] })).toEqual({ stranded: false, reason: "journal_agrees" });
  });

  it("does not mistake the previous turn's answer for this one", () => {
    const beforeAdmission = "2026-10-10T17:38:00.000Z";
    expect(Date.parse(beforeAdmission)).toBeLessThan(Date.parse(admittedAt));
    expect(derive({ records: [record("running")], piLeaf: leaf({ timestamp: beforeAdmission }) }))
      .toEqual({ stranded: false, reason: "journal_agrees" });
    expect(derive({ records: [record("running")], piLeaf: leaf({ timestamp: null }) }))
      .toEqual({ stranded: false, reason: "journal_agrees" });
  });

  it("keeps CR142's shape for a terminal journal, and the leaf cannot change it", () => {
    const finished = record("terminal_durable");
    expect(derive({ records: [finished] })).toEqual({ stranded: true, record: finished, shape: "journal_terminal" });
    expect(derive({ records: [finished], piLeaf: leaf({ stopReason: "toolUse" }) }).stranded).toBe(true);
  });

  it("names the shape: the record never heard, the answer is in the session, nothing is lost", () => {
    const sentence = describeStrandedTurn(record("running"), "journal_never_heard").sentence;
    expect(sentence).toContain("never heard");
    expect(sentence).toContain("in its session");
    expect(sentence).toContain("Nothing is lost");
    expect(sentence).toContain("Recovering brings the answer back");
    // The default shape is CR142's, unchanged for every existing caller.
    expect(describeStrandedTurn(record("terminal_durable"))).toEqual(describeStrandedTurn(record("terminal_durable"), "journal_terminal"));
  });

  it("picks the newest record of the thread the poll is watching", () => {
    const older = { ...record("settled", { runId: "run-old" }), createdAt: "2026-10-10T17:00:00.000Z" } as TurnJournalRecord;
    const newest = { ...record("running", { runId: "run-new" }), createdAt: "2026-10-10T17:38:10.509Z" } as TurnJournalRecord;
    const elsewhere = { ...record("running", { runId: "run-b", threadId: "thread-B" }), createdAt: "2026-10-10T18:00:00.000Z" } as TurnJournalRecord;
    expect(newestJournalRecordForThread([older, elsewhere, newest], "thread-A")).toBe(newest);
    expect(newestJournalRecordForThread([elsewhere], "thread-A")).toBeUndefined();
  });

  /**
   * The poll reads the leaf only in the branch where the journal still says running, and the
   * derivation and the sentence both receive the shape. Asserted on the exact wiring, because the
   * cost argument depends on the gate and the honesty argument depends on the shape reaching the
   * sentence.
   */
  it("reads the leaf only while the journal says running, and hands the shape to the sentence", () => {
    const stripped = appSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const at = stripped.indexOf("const interval = window.setInterval(poll, STRANDED_TURN_POLL_MS)");
    const effect = stripped.slice(at - 2600, at + 200);
    expect(effect).toContain("newestJournalRecordForThread(journal.records, thread.thread.threadId)");
    expect(effect).toContain('newest.phase === "admitted" || newest.phase === "running"');
    expect(effect).toContain("inspectPiSessionLeaf(");
    expect(effect).not.toContain("inspectDedicatedPiTranscript(");
    expect(effect).not.toContain("reconcilePiInvocationOccupancy");
    expect(stripped).toContain("piLeaf: strandedPiLeaf,");
    expect(stripped).toContain("describeStrandedTurn(strandedTurn.record, strandedTurn.shape)");
    expect((stripped.match(/describeStrandedTurn\(/g) ?? []).length).toBe(1);
  });
});
