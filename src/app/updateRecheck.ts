import type { SelfUpdateCheckResult, SelfUpdateProgress } from "./selfUpdateStorage";

/**
 * CR191: the app is used continuously and rarely closed, so the update channel is asked again
 * while it stays open: on a slow clock, and when the person comes back to the window after a while
 * (the Mac waking in the morning is the usual case, and a sleeping Mac fires no timer).
 */
export const UPDATE_RECHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const UPDATE_RECHECK_ON_RETURN_AFTER_MS = 60 * 60 * 1000;
/** How often the clock is looked at; the decision is always made on elapsed time. */
const UPDATE_RECHECK_TICK_MS = 5 * 60 * 1000;

export type UpdateChipState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: SelfUpdateCheckResult & { status: "available" } }
  | { status: "installing"; update: SelfUpdateCheckResult & { status: "available" }; progress?: SelfUpdateProgress }
  | { status: "error"; message: string };

/** Listens for the window coming back: focus, or the document becoming visible again. */
export function subscribeToWindowReturn(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;
  const onVisibility = () => { if (document.visibilityState === "visible") listener(); };
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Starts the later checks. The check made at load counts as the first, so the clock starts now.
 * One check runs at a time, and a failed one (offline, channel down) is silent: the next moment
 * simply asks again.
 */
export function startUpdateRechecks({
  recheck,
  now = Date.now,
  onReturn = subscribeToWindowReturn,
}: {
  recheck: () => Promise<unknown>;
  now?: () => number;
  onReturn?: (listener: () => void) => () => void;
}): () => void {
  let lastAskedAt = now();
  let inFlight = false;
  let stopped = false;

  function askIfDue(after: number) {
    if (stopped || inFlight || now() - lastAskedAt < after) return;
    inFlight = true;
    lastAskedAt = now();
    void recheck().catch(() => undefined).finally(() => { inFlight = false; });
  }

  const timer = setInterval(() => askIfDue(UPDATE_RECHECK_INTERVAL_MS), UPDATE_RECHECK_TICK_MS);
  const unsubscribe = onReturn(() => askIfDue(UPDATE_RECHECK_ON_RETURN_AFTER_MS));
  return () => {
    stopped = true;
    clearInterval(timer);
    unsubscribe();
  };
}

/**
 * What a later check does to the chip. It never interrupts an installation or a message the person
 * is reading, keeps an update already shown when the channel later says current, and moves a shown
 * notice to a newer version.
 */
export function stateAfterRecheck(state: UpdateChipState, result: SelfUpdateCheckResult): UpdateChipState {
  if (state.status === "installing" || state.status === "error") return state;
  if (result.status !== "available") return state.status === "available" ? state : { status: "idle" };
  if (state.status === "available" && state.update.version === result.version) return state;
  return { status: "available", update: result };
}
