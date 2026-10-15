
/**
 * CR138: a workspace is a Journey plus the thread that work runs on. The Journey remains the
 * durable container; the workspace is the grain at which a run is admitted, refused and reported.
 *
 * `threadId` is `null` only for a mock run, whose identity carries no thread at all. A mock and a
 * live run never share a session, so the Journey-only key cannot collide with a workspace key.
 */
export type JourneyWorkspace = {
  readonly journeyId: string;
  readonly threadId: string | null;
};

/**
 * The separator is `|`, which is outside the identifier pattern the native inspection validates
 * against, so no `journeyId` or `threadId` can contain it and no two distinct workspaces can
 * produce the same key.
 */
export function runtimeWorkspaceKey(workspace: JourneyWorkspace): string {
  return `${workspace.journeyId}|${workspace.threadId ?? ""}`;
}

export function journeyWorkspace(journeyId: string, threadId: string | null): JourneyWorkspace {
  return { journeyId, threadId };
}

/**
 * Structural on purpose: `RunAuthority`, `PiInvocationAuthorityInspection` and
 * `JourneySettlementAuthority` are three different records that all carry the two coordinates a
 * workspace is made of, and none of them should have to know about this module.
 */
export function workspaceOfAuthority(
  authority: { readonly journeyId: string; readonly threadId: string },
): JourneyWorkspace {
  return { journeyId: authority.journeyId, threadId: authority.threadId };
}

export function sameJourneyWorkspace(left: JourneyWorkspace, right: JourneyWorkspace): boolean {
  return left.journeyId === right.journeyId && left.threadId === right.threadId;
}

/**
 * CR141 Stage B retired `PI_EVENT_TRANSPORT_GRAIN` on 2026-10-10. Its decision is kept here as
 * prose, because the constant's history is the most expensive thing this Story learned.
 *
 * CR138 declared it as `NATIVE_ADMISSION_GRAIN` to pin an intermediate state while the Rust
 * registry still held one run per Journey. CR139 re-keyed the registry. CR140 flipped the constant
 * to `"workspace"` **and removed it in the same step** — and the field refuted that in one attempt:
 * a sibling was admitted by the renderer and by the registry, then threw inside
 * `piProcessEventDispatcher.register`, because the dispatcher's `routes` map was keyed by
 * `journeyId`. With the constant gone there was nothing to revert but a reconstruction.
 *
 * So the binding constraint was never admission. CR141 keyed the event route by workspace, flipped
 * the constant **and left it standing**, and only removed it once the field produced the claim:
 * `turn-journal` records for `mirror-desktop` on three distinct threads with intersecting
 * `piExecution` windows, measured 2026-10-10 at 23:11 — two overlapping for 13.8 s and all three
 * for 5.5 s.
 *
 * The rule the sequence paid for: **pin an intermediate state with a constant, flip it as one
 * visible decision, and retire it on evidence rather than on the argument that it ought to be
 * unreachable.** Removing it a step early cost this Story one field attempt and one regression.
 */
