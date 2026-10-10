
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

/*
 * CR138 declared `NATIVE_ADMISSION_GRAIN` here to pin an intermediate state: the renderer carried
 * two workspaces while the Rust registry still admitted one run per Journey, and the constant made
 * advancing that a visible one-line decision instead of a side effect. CR139 re-keyed the registry
 * and CR140 flipped and then **removed** the constant, because with the native grain at the
 * workspace the `"journey"` branch and its `same_journey_occupied` reason became unreachable, and
 * an unreachable refusal is debt rather than safety. The decision is kept here as a record; the
 * switch is not, so nothing can be silently flipped back to a grain the registry no longer uses.
 */
