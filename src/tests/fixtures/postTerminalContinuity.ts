import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  type PiInvocationAuthorityInspection,
  type PiInvocationLeaseInspection,
  type PiInvocationOccupancyState,
  type PiInvocationRegistryInspection,
} from "../../app/piInvocationOccupancy";
import { createJourneyConversation } from "../../domain/journeyConversation";
import type { PiConversationSurfaceInspection } from "../../domain/piBackedConversationSurface";

export const POST_TERMINAL_OUTCOMES = [
  "completed",
  "cancelled",
  "provider_failed",
  "process_died",
] as const;

export const POST_TERMINAL_FRONTIERS = [
  "projection",
  "journal",
  "segment",
  "outbox",
  "mirror",
  "acknowledgement",
  "presentation",
] as const;

export type PostTerminalOutcome = typeof POST_TERMINAL_OUTCOMES[number];
export type PostTerminalFrontier = typeof POST_TERMINAL_FRONTIERS[number];

export function rehearsalAuthority(
  journeyId: string,
  runId: string,
): PiInvocationAuthorityInspection {
  return {
    schemaVersion: "0.1.0",
    journeyId,
    runId,
    turnId: `turn-${runId}`,
    threadId: `thread-${journeyId}`,
    generation: 1,
    piSessionId: `pi-${journeyId}`,
    mirrorConversationId: `mirror-${journeyId}`,
    harnessUserMessageId: `user-${runId}`,
    harnessAssistantMessageId: `assistant-${runId}`,
  };
}

export function terminalLease(
  authority: PiInvocationAuthorityInspection,
  outcome: PostTerminalOutcome,
): PiInvocationLeaseInspection {
  return {
    authority,
    leasePhase: "finalizing",
    processCapacityState: "released",
    cancellationState: outcome === "cancelled" ? "requested" : "none",
    terminalState: outcome === "cancelled"
      ? "cancelled"
      : outcome === "completed"
        ? "completed"
        : "process_died",
  };
}

export function activeLease(authority: PiInvocationAuthorityInspection): PiInvocationLeaseInspection {
  return {
    authority,
    leasePhase: "running",
    processCapacityState: "running",
    cancellationState: "none",
    terminalState: "open",
  };
}

export function knownOccupancy(
  entries: PiInvocationLeaseInspection[],
  limit: 1 | 2 | 4 = 4,
): PiInvocationOccupancyState {
  const inspection: PiInvocationRegistryInspection = {
    schemaVersion: "0.1.0",
    limit,
    processCapacityInUse: entries.filter((entry) => entry.processCapacityState !== "released").length,
    entries,
  };
  return applyPiInvocationInspection(
    beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1),
    1,
    inspection,
  );
}

export function piBackedRehearsalFixture() {
  const metadata = createJourneyConversation({
    journeyId: "journey-a",
    initialMessages: [
      { id: "ghost-user", role: "user", content: "stale", createdAt: "2026-09-20T10:00:00.000Z" },
      { id: "ghost-assistant", role: "assistant", content: "stale", createdAt: "2026-09-20T10:00:01.000Z" },
    ],
    now: new Date("2026-09-20T10:00:00.000Z"),
  });
  const inspection: PiConversationSurfaceInspection = {
    schemaVersion: "0.1.0",
    entries: [
      { entryId: "a-user", role: "user", visibleText: "Fixture A", timestamp: "2026-09-20T10:01:00.000Z" },
      { entryId: "a-assistant", role: "assistant", visibleText: "Fixture A complete", timestamp: "2026-09-20T10:01:01.000Z" },
      { entryId: "b-user", role: "user", visibleText: "Fixture B", timestamp: "2026-09-20T10:02:00.000Z" },
      { entryId: "b-assistant", role: "assistant", visibleText: "Fixture B complete", timestamp: "2026-09-20T10:02:01.000Z" },
    ],
  };
  return { metadata, inspection };
}

export function frontierSurfacesMirrorDebt(frontier: PostTerminalFrontier): boolean {
  return frontier === "outbox" || frontier === "mirror" || frontier === "acknowledgement";
}
