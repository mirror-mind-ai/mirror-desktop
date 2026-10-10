
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
 * The grain at which concurrent work is actually possible, which is **not** the grain at which it
 * is admitted.
 *
 * CR138 declared this as `NATIVE_ADMISSION_GRAIN` to pin an intermediate state while the Rust
 * registry still held one run per Journey. CR139 re-keyed the registry, CR140 flipped the constant
 * to `"workspace"` and removed it — and the field refuted that in one attempt. A second turn in the
 * same Journey was admitted by the renderer and by the registry, and then **threw** inside
 * `piProcessEventDispatcher.register`: *"Pi process route already active for Journey
 * mirror-desktop."* The dispatcher's `routes` map is keyed by `journeyId`, including in `deliver`,
 * where an arriving event finds its route by Journey alone.
 *
 * So the binding constraint was never admission. CR140 restored this constant under a name that
 * says what actually limits concurrency, because a refusal that names the registry would now be
 * false. While it reads `"journey"` the renderer refuses a sibling workspace *before* Send, with a
 * sentence, rather than letting the send proceed into a raw transport exception — which is strictly
 * worse than the behaviour CR140 set out to improve.
 *
 * **CR141 keys the event route by workspace and flips this.** A guard asserts the current value,
 * so flipping it stays a visible one-line decision rather than a side effect.
 */
export const PI_EVENT_TRANSPORT_GRAIN: "journey" | "workspace" = "journey";
