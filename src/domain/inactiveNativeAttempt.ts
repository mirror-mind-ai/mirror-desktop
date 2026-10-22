type NativeAttemptInspection = {
  leafEntryId: string | null;
  incompleteUserEntryId: string | null;
  entries: Array<{
    entryId: string;
    role: string;
    visibleText: string;
    stopReason?: string | null;
    /** CR159: Pi records the provider's refusal on the assistant entry itself. */
    errorMessage?: string | null;
  }>;
};

export type InactiveNativeAttemptCandidate = {
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  userEntryId: string;
  leafEntryId: string;
  /**
   * CR159: the provider's own words, when the failed leaf is an assistant entry with
   * `stopReason: "error"` and an `errorMessage`. Absent otherwise — the key is not written, so a
   * reader can tell "no provider detail" from "an empty one".
   */
  providerFailure?: string;
};

type CandidateAuthority = Omit<InactiveNativeAttemptCandidate, "userEntryId" | "leafEntryId" | "providerFailure">;

/**
 * Bounded like CR054's journal detail: a provider message is a sentence or two, and anything far
 * beyond that is a payload the surface should not be asked to hold.
 */
export const PROVIDER_FAILURE_MAX_CHARS = 600;

function boundedProviderFailure(message: string | null | undefined): string | undefined {
  const trimmed = message?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > PROVIDER_FAILURE_MAX_CHARS ? `${trimmed.slice(0, PROVIDER_FAILURE_MAX_CHARS)}…` : trimmed;
}

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
  // CR159: a provider refusal arrives as a transcript assistant entry, not as a stream error
  // event, and after Pi's last retry that entry is the leaf. Field session of 2026-10-16: eight
  // such entries, one distinct message, and a surface that named none of them.
  const leafEntry = inspection.entries[leafIndex];
  const providerFailure = leafEntry && leafEntry.role === "assistant" && leafEntry.stopReason === "error"
    ? boundedProviderFailure(leafEntry.errorMessage)
    : undefined;
  return providerFailure === undefined
    ? { ...authority, userEntryId, leafEntryId }
    : { ...authority, userEntryId, leafEntryId, providerFailure };
}

/**
 * CR159 reopened: the refusal, read by the failure itself instead of waiting for a restore.
 *
 * Restore used to be the only reader, and it skips the transcript while the run is finalizing —
 * which is exactly when the lease release that triggers it happens. Field, 2026-10-22: three
 * refusals in a row and no reason shown, while this same derivation, fed the real session cut at
 * each failure, names every one.
 *
 * Returns a candidate only when it carries the provider's words, so a failure nobody explained
 * keeps the surface it has today. Never throws: after a failed turn, unreadable or untrustworthy
 * evidence may cost the Navigator the words, never the Conversation.
 */
export async function readProviderRefusalAfterLiveFailure(
  authority: CandidateAuthority,
  inspect: () => Promise<NativeAttemptInspection>,
): Promise<InactiveNativeAttemptCandidate | undefined> {
  try {
    const candidate = deriveInactiveNativeAttemptCandidate(authority, await inspect());
    return candidate?.providerFailure === undefined ? undefined : candidate;
  } catch {
    return undefined;
  }
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
