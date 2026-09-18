type NativeAttemptInspection = {
  leafEntryId: string | null;
  incompleteUserEntryId: string | null;
  entries: Array<{ entryId: string; role: string; visibleText: string }>;
};

export type InactiveNativeAttemptCandidate = {
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  userEntryId: string;
};

type CandidateAuthority = Omit<InactiveNativeAttemptCandidate, "userEntryId">;

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
  const entry = inspection.entries.find((item) => item.entryId === userEntryId);
  if (inspection.leafEntryId !== userEntryId
    || !entry
    || entry.role !== "user"
    || !entry.visibleText.trim()) {
    throw new Error("inactive_native_attempt_evidence_invalid");
  }
  return { ...authority, userEntryId };
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
