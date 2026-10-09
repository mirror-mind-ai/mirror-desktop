import { describe, expect, it } from "vitest";
import { deriveJourneyWorkLocus } from "../app/journeyWorkLocus";
import { createUnknownPiInvocationOccupancy, type PiInvocationLeaseInspection, type PiInvocationOccupancyState } from "../app/piInvocationOccupancy";
import type { JourneyRunIdentity } from "../app/journeyRuntimeState";
import type { RunAuthority } from "../domain/runAuthority";

const ROOT_THREAD = "thread-root-mirror-desktop";
const CHILD_THREAD = "thread-child-conversation-1";

function lease(over: {
  journeyId?: string;
  threadId?: string;
  leasePhase?: PiInvocationLeaseInspection["leasePhase"];
  processCapacityState?: PiInvocationLeaseInspection["processCapacityState"];
  terminalState?: PiInvocationLeaseInspection["terminalState"];
} = {}): PiInvocationLeaseInspection {
  return {
    authority: {
      schemaVersion: "0.1.0",
      journeyId: over.journeyId ?? "mirror-desktop",
      runId: "run-1",
      turnId: "turn-1",
      threadId: over.threadId ?? CHILD_THREAD,
      generation: 2,
      piSessionId: "pi-session-1",
      mirrorConversationId: "mirror-conv-1",
      harnessUserMessageId: "harness-user-1",
      harnessAssistantMessageId: "harness-assistant-1",
    },
    leasePhase: over.leasePhase ?? "running",
    processCapacityState: over.processCapacityState ?? "running",
    cancellationState: "none",
    terminalState: over.terminalState ?? "open",
  };
}

function occupancy(entries: PiInvocationLeaseInspection[], status: PiInvocationOccupancyState["status"] = "known"): PiInvocationOccupancyState {
  return { status, requestId: 1, limit: 4, processCapacityInUse: entries.length, entries, diagnostic: null };
}

function liveIdentity(threadId: string): JourneyRunIdentity {
  return {
    kind: "live",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "mirror-desktop",
      runId: "run-1",
      turnId: "turn-1",
      threadId,
      generation: 2,
      piSessionId: "pi-session-1",
      mirrorConversationId: "mirror-conv-1",
      harnessUserMessageId: "harness-user-1",
      harnessAssistantMessageId: "harness-assistant-1",
    } as unknown as RunAuthority,
  };
}

const here = { journeyId: "mirror-desktop", journeyRootThreadId: ROOT_THREAD };

describe("CR134: whose work is running", () => {
  it("reports nothing when no source says work is running", () => {
    expect(deriveJourneyWorkLocus({ ...here, occupancy: createUnknownPiInvocationOccupancy() })).toBeUndefined();
    expect(deriveJourneyWorkLocus({ ...here, occupancy: occupancy([]) })).toBeUndefined();
  });

  it("attributes work on the Journey's root thread to the Journey's own workspace", () => {
    expect(deriveJourneyWorkLocus({ ...here, occupancy: occupancy([lease({ threadId: ROOT_THREAD })]) })).toMatchObject({
      phase: "running",
      locus: "here",
      owner: { threadId: ROOT_THREAD, generation: 2, mirrorConversationId: "mirror-conv-1" },
    });
  });

  it("attributes work on another thread to a conversation inside the Journey", () => {
    expect(deriveJourneyWorkLocus({ ...here, occupancy: occupancy([lease({ threadId: CHILD_THREAD })]) })).toMatchObject({
      phase: "running",
      locus: "inside",
      owner: { threadId: CHILD_THREAD },
    });
  });

  // The whole point of finding 3: the registry survives a relaunch and the runtime map does not.
  it("sees work that this window did not start, with no runtime entry at all", () => {
    const work = deriveJourneyWorkLocus({ ...here, occupancy: occupancy([lease({ threadId: CHILD_THREAD })]) });
    expect(work?.phase).toBe("running");
    expect(work?.locus).toBe("inside");
  });

  it("keeps showing work while an occupancy refresh is in flight", () => {
    expect(deriveJourneyWorkLocus({
      ...here,
      occupancy: occupancy([lease({ threadId: CHILD_THREAD })], "reconciling"),
    })?.phase).toBe("running");
  });

  it("reads a finalizing lease as finishing rather than as running or idle", () => {
    expect(deriveJourneyWorkLocus({
      ...here,
      occupancy: occupancy([lease({ leasePhase: "finalizing", processCapacityState: "released" })]),
    })).toMatchObject({ phase: "finalizing", locus: "inside" });
  });

  it("ignores a lease that is no longer open and one that belongs to another Journey", () => {
    expect(deriveJourneyWorkLocus({ ...here, occupancy: occupancy([lease({ terminalState: "completed" })]) })).toBeUndefined();
    expect(deriveJourneyWorkLocus({ ...here, occupancy: occupancy([lease({ journeyId: "other-journey" })]) })).toBeUndefined();
  });

  // An unresolved locus may not be reported as the Journey's own work.
  it("reports an unresolved locus as unknown rather than as here", () => {
    const work = deriveJourneyWorkLocus({
      journeyId: "mirror-desktop",
      occupancy: occupancy([lease({ threadId: CHILD_THREAD })]),
    });
    expect(work?.phase).toBe("running");
    expect(work?.locus).toBe("unknown");
    expect(work?.locus).not.toBe("here");
  });

  it("reports unknown when the only source carries no workspace coordinate", () => {
    const mock: JourneyRunIdentity = { kind: "mock", journeyId: "mirror-desktop", runId: "mock-1" };
    const work = deriveJourneyWorkLocus({
      ...here, occupancy: occupancy([]), runtimePhase: "running", runtimeIdentity: mock,
    });
    expect(work).toMatchObject({ phase: "running", locus: "unknown" });
    expect(work?.owner).toBeUndefined();

    expect(deriveJourneyWorkLocus({
      ...here, occupancy: occupancy([]), runtimePhase: "running",
    })).toMatchObject({ phase: "running", locus: "unknown" });
  });

  it("prefers this window's live authority and keeps the registry as the fallback", () => {
    expect(deriveJourneyWorkLocus({
      ...here,
      occupancy: occupancy([lease({ threadId: CHILD_THREAD })]),
      runtimePhase: "running",
      runtimeIdentity: liveIdentity(ROOT_THREAD),
    })).toMatchObject({ locus: "here", owner: { threadId: ROOT_THREAD } });
  });

  it("lets the live runtime phase win over the registry phase", () => {
    expect(deriveJourneyWorkLocus({
      ...here,
      occupancy: occupancy([lease({ threadId: CHILD_THREAD, leasePhase: "finalizing", processCapacityState: "released" })]),
      runtimePhase: "running",
      runtimeIdentity: liveIdentity(CHILD_THREAD),
    })?.phase).toBe("running");
  });
});
