/**
 * CR166: the guards that hold post-terminal recovery off, named.
 *
 * The guards themselves are unchanged (CR116, CR138, CR115): recovery must not touch a Journey's
 * durable bookkeeping while work in it is live, and must not run twice at once. What changed is
 * that each one now says so. On 2026-11-01 *Recover this turn* was pressed and the action returned
 * on one of them without a trace, so an exit was offered that did nothing and no record could tell
 * which guard it was.
 */

export type PostTerminalRecoveryRefusal =
  | "recovery_in_flight"
  | "occupancy_unknown"
  | "native_execution_active"
  | "renderer_streaming";

export type PostTerminalRecoveryOutcome =
  | { readonly kind: "refused"; readonly reason: PostTerminalRecoveryRefusal }
  | { readonly kind: "converged" }
  | { readonly kind: "failed"; readonly message: string };

/** The first guard that holds, in the order the guards always ran; nothing when recovery may run. */
export function postTerminalRecoveryRefusal(input: {
  readonly inFlight: boolean;
  readonly occupancyKnown: boolean;
  readonly nativeExecutionActive: boolean;
  readonly rendererStreaming: boolean;
}): PostTerminalRecoveryRefusal | undefined {
  if (input.inFlight) return "recovery_in_flight";
  if (!input.occupancyKnown) return "occupancy_unknown";
  if (input.nativeExecutionActive) return "native_execution_active";
  if (input.rendererStreaming) return "renderer_streaming";
  return undefined;
}

const REFUSAL_SENTENCES: Record<PostTerminalRecoveryRefusal, string> = {
  recovery_in_flight: "Recovery did not run: another recovery of this Journey is still in progress. Try again when it ends.",
  occupancy_unknown: "Recovery did not run: the application could not yet read which agent runs are live. Try again in a moment.",
  native_execution_active: "Recovery did not run: an agent process is still running in this Journey, and recovering now could overwrite its work.",
  renderer_streaming: "Recovery did not run: this window still believes the agent is answering in this Journey, although the agent's session says the turn finished.",
};

/**
 * What the exit says after it was pressed. `turnStillOpen` is read from the journal after the
 * attempt; a convergence that left the turn's record open did run, and says that instead of
 * nothing.
 */
export function describePostTerminalRecoveryOutcome(
  outcome: PostTerminalRecoveryOutcome,
  turnStillOpen: boolean,
): string | undefined {
  if (outcome.kind === "refused") return REFUSAL_SENTENCES[outcome.reason];
  if (outcome.kind === "failed") return `Recovery ran and failed: ${outcome.message}`;
  return turnStillOpen
    ? "Recovery ran, but this turn's record is still open: its answer could not be matched to it. The reason is recorded in mirror-append-recovery-skips.jsonl."
    : undefined;
}
