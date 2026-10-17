import { describe, expect, it } from "vitest";
import {
  deriveComposerFinishing,
  deriveComposerTurnStatus,
  type ComposerFinishing,
} from "../app/composerTurnStatus";
import {
  ABANDON_SETTLEMENT_OFFER_AFTER_MS,
  settlementAbandonmentOffer,
  settlementAbandonmentPresentation,
} from "../app/settlementAbandonment";
import {
  believedRunFromJournal,
  deriveStrandedTurn,
  STRANDED_SETTLEMENT_GRACE_MS,
  type PiSessionLeaf,
} from "../app/strandedTurn";
import type { TurnJournalRecord, TurnPhase } from "../app/turnJournal";
import appSource from "../app/App.tsx?raw";

/**
 * CR161. Field, 2026-10-17, production alpha.52: the composer said *Finishing*, the journal had
 * frozen at `running` before settlement began, and the two notices built for exactly this moment
 * were both silent. `Finishing` has two sources — the settlement flag and the reconciliation block —
 * and every exit was attached to the first. This occurrence took the second.
 *
 * These are the field values. The answer committed at 11:32:05.653Z; the app was force-quit about
 * 85 seconds later with nothing on screen.
 */
const ADMITTED_AT = "2026-10-17T11:27:13.196Z";
const PROVIDER_COMMITTED_AT = "2026-10-17T11:32:05.653Z";
const FORCE_QUIT_AT = Date.parse("2026-10-17T11:33:30.000Z");

function record(phase: TurnPhase): TurnJournalRecord {
  return {
    schemaVersion: "0.1.0",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "mirror-desktop",
      runId: "agent-run-2026-10-17T11:27:13.196Z",
      turnId: "turn-1127",
      threadId: "nautilus-thread-mirror-desktop",
      generation: 4,
      piSessionId: "nautilus-mirror-desktop-g4",
      mirrorConversationId: "mc",
      harnessUserMessageId: "u",
      harnessAssistantMessageId: "a",
    },
    phase,
    terminalOutcome: null,
    terminalEvidence: null,
    revision: 2,
    createdAt: ADMITTED_AT,
    updatedAt: ADMITTED_AT,
  } as unknown as TurnJournalRecord;
}

const answerLeaf: PiSessionLeaf = {
  entryId: "59cb6c92", entryType: "message", role: "assistant", stopReason: "stop", timestamp: PROVIDER_COMMITTED_AT,
};

/** The renderer's inputs as the field state produced them: not streaming, not finalizing, reconciliation blocked. */
const fieldStatusInput = {
  agentRunStatus: "completed" as const,
  runBelongsToSelectedJourney: true,
  isStreaming: false,
  isFinalizingTurn: false,
  reconciliationBlocksInvocation: true,
  mirrorRepairPending: false,
};

describe("CR161: one derived Finishing, whichever source put it on screen", () => {
  it("names the reconciliation source and dates it from the provider's own commit", () => {
    const status = deriveComposerTurnStatus(fieldStatusInput);
    expect(status).toBe("finishing");
    expect(deriveComposerFinishing({
      status, isFinalizingTurn: false, settlementSince: undefined, providerCommittedAt: PROVIDER_COMMITTED_AT,
    })).toEqual({ source: "reconciliation", since: Date.parse(PROVIDER_COMMITTED_AT) });
  });

  it("names the settlement source and dates it from the settlement's own clock", () => {
    expect(deriveComposerFinishing({
      status: "finishing", isFinalizingTurn: true, settlementSince: 1_000, providerCommittedAt: PROVIDER_COMMITTED_AT,
    })).toEqual({ source: "settlement", since: 1_000 });
  });

  /** CR115's negative case, stated at the root: an idle composer derives no finishing and so starts nothing. */
  it("derives nothing when the composer is not finishing, whatever else is true", () => {
    for (const status of ["working", undefined] as const) {
      expect(deriveComposerFinishing({
        status, isFinalizingTurn: true, settlementSince: 1_000, providerCommittedAt: PROVIDER_COMMITTED_AT,
      })).toBeUndefined();
    }
  });

  it("leaves the start unknown rather than inventing one when the provider commit has no date", () => {
    expect(deriveComposerFinishing({ status: "finishing", isFinalizingTurn: false, providerCommittedAt: undefined }))
      .toEqual({ source: "reconciliation", since: undefined });
    expect(deriveComposerFinishing({ status: "finishing", isFinalizingTurn: false, providerCommittedAt: "not a date" }))
      .toEqual({ source: "reconciliation", since: undefined });
  });
});

describe("CR161: the exits read the same Finishing the composer draws", () => {
  const reconciliation: ComposerFinishing = { source: "reconciliation", since: Date.parse(PROVIDER_COMMITTED_AT) };
  const settlement: ComposerFinishing = { source: "settlement", since: Date.parse(PROVIDER_COMMITTED_AT) };
  const pastThreshold = Date.parse(PROVIDER_COMMITTED_AT) + ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_000;

  it("offers the same exit from either source once the threshold passes and no lease is live", () => {
    for (const finishing of [reconciliation, settlement]) {
      const offer = settlementAbandonmentOffer({ finishing, nativeExecutionActive: false, occupancyKnown: true, now: pastThreshold });
      expect(offer).toEqual({ offered: true, waitedMs: ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_000 });
    }
  });

  it("names the same refusal from either source while the lease is live", () => {
    for (const finishing of [reconciliation, settlement]) {
      const presentation = settlementAbandonmentPresentation({ finishing, nativeExecutionActive: true, occupancyKnown: true, now: pastThreshold });
      expect(presentation.kind).toBe("refusal_named");
      if (presentation.kind === "refusal_named") expect(presentation.reason).toBe("native_execution_active");
    }
  });

  /**
   * The guard this occurrence proves was missing. `not_finishing` was listed as deliberately silent
   * on the assumption that it means no finishing is on screen. Enumerating every input the composer
   * can receive, the offer must never say `not_finishing` while the composer says `finishing`, and
   * must say exactly that whenever the composer does not.
   */
  it("cannot say not_finishing while the composer says Finishing, and always does otherwise", () => {
    const bools = [false, true] as const;
    const statuses = ["completed", "running", "failed", "cancelled", "idle"] as const;
    let finishingCases = 0;
    let otherCases = 0;
    for (const agentRunStatus of statuses) for (const runBelongsToSelectedJourney of bools) for (const isStreaming of bools)
      for (const isFinalizingTurn of bools) for (const reconciliationBlocksInvocation of bools) for (const mirrorRepairPending of bools) {
        const status = deriveComposerTurnStatus({
          agentRunStatus, runBelongsToSelectedJourney, isStreaming, isFinalizingTurn, reconciliationBlocksInvocation, mirrorRepairPending,
        });
        const finishing = deriveComposerFinishing({ status, isFinalizingTurn, settlementSince: 1, providerCommittedAt: PROVIDER_COMMITTED_AT });
        const offer = settlementAbandonmentOffer({ finishing, nativeExecutionActive: false, occupancyKnown: true, now: pastThreshold });
        if (status === "finishing") {
          finishingCases += 1;
          expect(offer).not.toEqual(expect.objectContaining({ reason: "not_finishing" }));
        } else {
          otherCases += 1;
          expect(offer).toEqual({ offered: false, reason: "not_finishing" });
        }
      }
    expect(finishingCases).toBeGreaterThan(0);
    expect(otherCases).toBeGreaterThan(0);
  });
});

describe("CR161: the stranded predicate runs while the composer is finishing, not only while it streams", () => {
  const believedRun = believedRunFromJournal([record("running")], {
    journeyId: "mirror-desktop", threadId: "nautilus-thread-mirror-desktop", generation: 4,
  });

  it("recovers the believed run from the journal when the runtime entry is already gone", () => {
    expect(believedRun).toEqual({
      journeyId: "mirror-desktop", threadId: "nautilus-thread-mirror-desktop", generation: 4, runId: "agent-run-2026-10-17T11:27:13.196Z",
    });
    expect(believedRunFromJournal([record("settled")], {
      journeyId: "mirror-desktop", threadId: "nautilus-thread-mirror-desktop", generation: 4,
    })).toBeUndefined();
    expect(believedRunFromJournal([record("running")], {
      journeyId: "mirror-desktop", threadId: "another-thread", generation: 4,
    })).toBeUndefined();
  });

  /** The field case, end to end: the notice that was silent on 2026-10-17 is drawn. */
  it("notices the frozen record from the finishing state, well before the force-quit", () => {
    const result = deriveStrandedTurn({
      journalRecords: [record("running")],
      believedRun,
      believedStreaming: false,
      believedFinishing: true,
      now: Date.parse(PROVIDER_COMMITTED_AT) + STRANDED_SETTLEMENT_GRACE_MS + 1,
      piLeaf: answerLeaf,
    });
    expect(result).toEqual({ stranded: true, record: record("running"), shape: "journal_never_heard" });
    expect(Date.parse(PROVIDER_COMMITTED_AT) + STRANDED_SETTLEMENT_GRACE_MS + 1).toBeLessThan(FORCE_QUIT_AT);
  });

  /** CR115's negative case at the predicate: neither streaming nor finishing starts nothing, even with a terminal leaf. */
  it("says not_live when the renderer claims neither a streaming nor a finishing turn", () => {
    expect(deriveStrandedTurn({
      journalRecords: [record("running")], believedRun, believedStreaming: false, believedFinishing: false,
      now: FORCE_QUIT_AT, piLeaf: answerLeaf,
    })).toEqual({ stranded: false, reason: "not_live" });
  });

  /** A healthy long turn in the finishing state is still a long turn: a non-terminal leaf says nothing. */
  it("stays quiet in the finishing state while the leaf is not a finished answer", () => {
    expect(deriveStrandedTurn({
      journalRecords: [record("running")], believedRun, believedStreaming: false, believedFinishing: true,
      now: FORCE_QUIT_AT, piLeaf: { ...answerLeaf, entryType: "toolUse", role: null, stopReason: null },
    })).toEqual({ stranded: false, reason: "journal_agrees" });
  });
});

describe("CR161: the App wires one Finishing into every exit", () => {
  const withoutComments = (source: string) => source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const app = withoutComments(appSource);

  it("derives the composer's finishing once and hands it to the offer and the predicate", () => {
    expect(app).toContain("const composerFinishing = deriveComposerFinishing(");
    expect(app).toContain("finishing: composerFinishing,");
    expect(app).toContain("believedFinishing: composerFinishing !== undefined,");
    expect(app).not.toContain("ownerPhase: selectedJourneyRuntimePhase?.phase");
  });

  it("gates the journal poll on streaming or finishing, and on nothing else", () => {
    const start = app.indexOf("const interval = window.setInterval(poll, STRANDED_TURN_POLL_MS)");
    expect(start).toBeGreaterThan(0);
    const effect = app.slice(start - 2600, start + 200);
    expect(effect).toContain("if ((!isStreaming && !composerFinishingActive)");
    expect(effect).not.toContain("reconcilePiInvocationOccupancy");
  });

  /** An offered exit must act. The act used to bail on a missing runtime identity, which the reconciliation source has none of. */
  it("lets the act proceed without a runtime identity, which the reconciliation source does not have", () => {
    const start = app.indexOf("async function abandonSettlementWait()");
    const act = app.slice(start, start + 1200);
    expect(act).not.toContain("|| !abandoning) return");
    expect(act).toContain("if (abandoning) dispatchJourneyRuntime({ type: \"finalization_finished\"");
  });
});
