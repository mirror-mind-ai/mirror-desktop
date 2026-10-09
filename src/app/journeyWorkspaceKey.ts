
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
 * CR138 is renderer-only preparedness. The native registry still indexes by `journey_id` and still
 * refuses a second same-Journey reservation, so while this constant reads `"journey"` the
 * renderer's own admission must keep refusing a sibling workspace exactly as it does today —
 * otherwise the Navigator would lose a specific refusal sentence and receive the raw native error
 * instead, a legibility regression inside a change that must alter nothing in the field.
 *
 * CR139 flips this to `"workspace"` in the same change that re-keys the Rust registry. A guard
 * asserts the current value, so flipping it is a visible decision rather than a side effect.
 */
export const NATIVE_ADMISSION_GRAIN: "journey" | "workspace" = "journey";
