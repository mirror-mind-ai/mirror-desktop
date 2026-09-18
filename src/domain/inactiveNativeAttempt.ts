type NativeAttemptInspection = {
  leafEntryId: string | null;
  incompleteUserEntryId: string | null;
  entries: Array<{ entryId: string; role: string; visibleText: string; stopReason?: string | null }>;
};

export type InactiveNativeAttemptCandidate = {
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  userEntryId: string;
  leafEntryId: string;
};

type CandidateAuthority = Omit<InactiveNativeAttemptCandidate, "userEntryId" | "leafEntryId">;

type InactiveNativeAttemptPresentationInput = CandidateAuthority & {
  candidate?: InactiveNativeAttemptCandidate;
  occupancyKnown: boolean;
  exactNativeLeaseActive: boolean;
  selectedRuntimeBusy: boolean;
  isStreaming: boolean;
};

export function deriveInactiveNativeAttemptCandidate(
  authority: CandidateAuthority,
  inspection: NativeAttemptInspection,
): InactiveNativeAttemptCandidate | undefined {
  const userEntryId = inspection.incompleteUserEntryId;
  if (!userEntryId) return undefined;
  const leafEntryId = inspection.leafEntryId;
  const userIndex = inspection.entries.findIndex((item) => item.entryId === userEntryId);
  const leafIndex = inspection.entries.findIndex((item) => item.entryId === leafEntryId);
  const userEntry = inspection.entries[userIndex];
  const completedAfterUser = inspection.entries.slice(userIndex + 1).some((item) => (
    item.role === "assistant" && (item.stopReason === "stop" || item.stopReason === "length")
  ));
  if (!leafEntryId
    || userIndex < 0
    || !userEntry
    || userEntry.role !== "user"
    || !userEntry.visibleText.trim()
    || (leafIndex >= 0 && leafIndex < userIndex)
    || completedAfterUser) {
    throw new Error("inactive_native_attempt_evidence_invalid");
  }
  return { ...authority, userEntryId, leafEntryId };
}

export function shouldPresentInactiveNativeAttempt({
  candidate,
  journeyId,
  threadId,
  generation,
  piSessionId,
  occupancyKnown,
  exactNativeLeaseActive,
  selectedRuntimeBusy,
  isStreaming,
}: InactiveNativeAttemptPresentationInput): boolean {
  return Boolean(candidate
    && candidate.journeyId === journeyId
    && candidate.threadId === threadId
    && candidate.generation === generation
    && candidate.piSessionId === piSessionId
    && occupancyKnown
    && !exactNativeLeaseActive
    && !selectedRuntimeBusy
    && !isStreaming);
}
