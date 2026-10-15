import { describe, expect, it } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import {
  createInitialJourneyRuntimeState,
  isJourneyRuntimeActiveOrFinalizing,
  journeyRuntimeReducer,
  selectJourneyRuntime,
  selectJourneyRuntimeEntries,
  selectJourneyRuntimeOwnerPhase,
  type JourneyRunIdentity,
  type JourneyRuntimeState,
} from "../app/journeyRuntimeState";
import { journeyWorkspace, runtimeWorkspaceKey, workspaceOfAuthority } from "../domain/journeyWorkspaceKey";
import { deriveJourneyNavigationPresentation } from "../app/journeyNavigationCoordinator";
import runtimeStateSource from "../app/journeyRuntimeState.ts?raw";
import occupancySource from "../app/piInvocationOccupancy.ts?raw";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { createJourneyActivationReceipt } from "../domain/journeyThreadProvisioning";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

/**
 * A thread in a named Journey with an explicit thread id, so two workspaces can exist inside one
 * Journey. The shared `readyThread` fixture derives its thread id from the Journey id, which is
 * exactly the one-workspace-per-Journey assumption CR138 removes.
 */
function workspaceThread(journeyId: string, threadSuffix: string): NautilusJourneyThread {
  const threadId = `thread-${journeyId}-${threadSuffix}`;
  const piSessionId = `pi-${journeyId}-${threadSuffix}`;
  const mirrorConversationId = `mirror-${journeyId}-${threadSuffix}`;
  return {
    schemaVersion: "1.0.0",
    threadId,
    journeyId,
    createdAt: "2026-08-26T10:00:00.000Z",
    activeGeneration: 1,
    generations: [{
      generation: 1,
      status: "ready",
      piSessionId,
      piSessionFile: `/tmp/${piSessionId}.jsonl`,
      mirrorConversationId,
      createdAt: "2026-08-26T10:00:00.000Z",
      activatedAt: "2026-08-26T10:00:01.000Z",
      activationReceipt: createJourneyActivationReceipt({
        journeyId, threadId, generation: 1, piSessionId, mirrorConversationId,
        activatedAt: "2026-08-26T10:00:01.000Z",
      }),
    }],
  };
}

function liveIdentity(journeyId: string, threadSuffix: string, runId: string): JourneyRunIdentity {
  const thread = workspaceThread(journeyId, threadSuffix);
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return {
    kind: "live",
    authority: createRunAuthority(
      createDedicatedTurnAuthority(thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`),
      conversation.liveIdentity,
      thread.generations[0],
    ),
  };
}

function register(state: JourneyRuntimeState, owner: JourneyRunIdentity): JourneyRuntimeState {
  return journeyRuntimeReducer(state, {
    type: "register",
    identity: owner,
    run: startAgentRun({ content: "hello", mode: "live", now: new Date("2026-01-01T00:00:00Z") }),
    assistantMessageId: `assistant-${owner.kind === "live" ? owner.authority.runId : owner.runId}`,
  });
}

/** Cleanup and reset refuse while a run is active or finalizing, which is their contract. */
function settle(state: JourneyRuntimeState, owner: JourneyRunIdentity): JourneyRuntimeState {
  let next = journeyRuntimeReducer(state, {
    type: "stream_event", identity: owner, event: { type: "run_status", status: "completed" },
  });
  next = journeyRuntimeReducer(next, { type: "stream_finished", identity: owner });
  return journeyRuntimeReducer(next, { type: "finalization_finished", identity: owner });
}

const rootOwner = liveIdentity("mirror-desktop", "root", "run-root");
const childOwner = liveIdentity("mirror-desktop", "child", "run-child");

describe("CR138: the runtime state is keyed by workspace", () => {
  it("admits a second run in one Journey when its thread differs", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    expect(Object.keys(state.entries)).toHaveLength(2);
    expect(state.quarantine).toHaveLength(0);
    if (rootOwner.kind !== "live" || childOwner.kind !== "live") throw new Error("fixture");
    expect(selectJourneyRuntime(state, workspaceOfAuthority(rootOwner.authority)).identity).toEqual(rootOwner);
    expect(selectJourneyRuntime(state, workspaceOfAuthority(childOwner.authority)).identity).toEqual(childOwner);
  });

  it("refuses a second run on the same workspace and names the workspace", () => {
    if (rootOwner.kind !== "live") throw new Error("fixture");
    const sameWorkspace = liveIdentity("mirror-desktop", "root", "run-root-2");
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, sameWorkspace);
    expect(Object.keys(state.entries)).toHaveLength(1);
    expect(selectJourneyRuntime(state, workspaceOfAuthority(rootOwner.authority)).identity).toEqual(rootOwner);
    expect(state.quarantine.at(-1)).toMatchObject({
      journeyId: "mirror-desktop",
      runId: "run-root-2",
      reason: "same_workspace_occupied",
    });
  });

  it("keys a mock run to its Journey alone, without colliding with a live workspace", () => {
    const mock: JourneyRunIdentity = { kind: "mock", journeyId: "mirror-desktop", runId: "run-mock" };
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, mock);
    expect(Object.keys(state.entries)).toHaveLength(2);
    expect(state.quarantine).toHaveLength(0);
    expect(selectJourneyRuntime(state, journeyWorkspace("mirror-desktop", null)).identity).toEqual(mock);
  });

  /**
   * CR138 left the Journey fallback provisional and said CR140 would decide it. CR140 measured
   * instead of reading: `selectJourney` (`App.tsx:4462`) passes `threadId: null` because the
   * target Journey's thread is not resolved when a Journey is selected, and the selected workspace
   * carries null before its catalog loads. The fallback has real callers, so it stays — bounded by
   * the rule below.
   */
  it("answers for the Journey when one workspace is live and the caller has no thread", () => {
    const state = register(createInitialJourneyRuntimeState(), childOwner);
    expect(selectJourneyRuntime(state, journeyWorkspace("mirror-desktop", null)).identity)
      .toEqual(childOwner);
  });

  it("declines to guess when two workspaces are live, rather than showing a sibling's stream", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: childOwner,
      event: { type: "message_delta", content: "child says" },
    });

    const ambiguous = selectJourneyRuntime(state, journeyWorkspace("mirror-desktop", null));
    expect(ambiguous.identity).toBeUndefined();
    // The decisive part: an empty surface, never a sibling's content on a surface that did not
    // ask for it. Both entries are still intact and addressable by their own keys.
    expect(ambiguous.streamedAssistantContent).toBe("");
    expect(Object.keys(state.entries)).toHaveLength(2);
  });

  it("keeps the exact key winning over the fallback whenever the caller knows its thread", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    if (rootOwner.kind !== "live" || childOwner.kind !== "live") throw new Error("fixture");
    expect(selectJourneyRuntime(state, workspaceOfAuthority(rootOwner.authority)).identity).toEqual(rootOwner);
    expect(selectJourneyRuntime(state, workspaceOfAuthority(childOwner.authority)).identity).toEqual(childOwner);
  });

  it("routes a stream event to its own workspace and leaves the sibling untouched", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: childOwner,
      event: { type: "message_delta", content: "child says" },
    });
    if (rootOwner.kind !== "live" || childOwner.kind !== "live") throw new Error("fixture");
    expect(selectJourneyRuntime(state, workspaceOfAuthority(childOwner.authority)).streamedAssistantContent)
      .toContain("child says");
    expect(selectJourneyRuntime(state, workspaceOfAuthority(rootOwner.authority)).streamedAssistantContent)
      .toBe("");
  });

  it("cleans up one workspace without removing its sibling", () => {
    if (rootOwner.kind !== "live" || childOwner.kind !== "live") throw new Error("fixture");
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = settle(state, childOwner);
    state = journeyRuntimeReducer(state, { type: "cleanup", identity: childOwner });
    expect(Object.keys(state.entries)).toEqual([runtimeWorkspaceKey(workspaceOfAuthority(rootOwner.authority))]);
  });

  it("resets and patches the addressed workspace only", () => {
    if (rootOwner.kind !== "live" || childOwner.kind !== "live") throw new Error("fixture");
    const rootWorkspace = workspaceOfAuthority(rootOwner.authority);
    const childWorkspace = workspaceOfAuthority(childOwner.authority);
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = journeyRuntimeReducer(state, {
      type: "append_warning",
      workspace: childWorkspace,
      message: "child warning",
    });
    expect(selectJourneyRuntime(state, childWorkspace).warnings).toEqual(["child warning"]);
    expect(selectJourneyRuntime(state, rootWorkspace).warnings).toEqual([]);

    state = settle(state, childOwner);
    state = journeyRuntimeReducer(state, { type: "reset", workspace: childWorkspace });
    expect(Object.keys(state.entries)).toEqual([runtimeWorkspaceKey(rootWorkspace)]);
  });
});

describe("CR138: the Journey remains answerable as an aggregate", () => {
  it("reports a Journey phase while any workspace in it is live", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    expect(selectJourneyRuntimeOwnerPhase(state, "mirror-desktop")).toMatchObject({ phase: "running" });
    expect(selectJourneyRuntimeOwnerPhase(state, "atlas")).toBeUndefined();
  });

  it("prefers a finalizing workspace when reporting the Journey phase", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = journeyRuntimeReducer(state, { type: "finalization_started", identity: childOwner });
    const phase = selectJourneyRuntimeOwnerPhase(state, "mirror-desktop");
    expect(phase?.phase).toBe("finalizing");
    expect(phase?.identity).toEqual(childOwner);
  });

  it("enumerates every workspace entry belonging to one Journey", () => {
    let state = register(createInitialJourneyRuntimeState(), rootOwner);
    state = register(state, childOwner);
    state = register(state, liveIdentity("atlas", "root", "run-atlas"));
    expect(selectJourneyRuntimeEntries(state, "mirror-desktop")).toHaveLength(2);
    expect(selectJourneyRuntimeEntries(state, "atlas")).toHaveLength(1);
  });
});

/**
 * CR144. RS024's Desired Outcome was unreachable from the Navigator's hands, and the field found
 * it one run after the field had reported success.
 *
 * `selectJourneyRuntime` fell back to the Journey whenever its exact key missed — including when
 * the caller knew its thread and that thread simply had not run yet in this session. A conversation
 * that has never run is precisely the one a Navigator opens to start a second turn, so it was
 * handed the live sibling's entry, `sendBlocked` read true, and Send never enabled.
 *
 * The first field run passed because its calibration turn happened to run in the same conversation
 * the second turn used, leaving an entry under that key so the fallback never ran. The ordering was
 * written for timing and satisfied a precondition nobody had named.
 *
 * None of the 1,963 tests in the suite failed when this was fixed, because the CR140 case that
 * bounds the fallback — "keeps the exact key winning whenever the caller knows its thread" — uses
 * two threads that both have entries. It tested the half that cannot misfire.
 */
describe("CR144: a conversation that has not run yet answers for itself", () => {
  it("gives a known thread with no entry an empty runtime, not its live sibling's", () => {
    const state = register(createInitialJourneyRuntimeState(), rootOwner);
    const quiet = selectJourneyRuntime(state, journeyWorkspace("mirror-desktop", "thread-mirror-desktop-child"));

    expect(quiet.workspace.threadId).toBe("thread-mirror-desktop-child");
    expect(quiet.identity).toBeUndefined();
    expect(isJourneyRuntimeActiveOrFinalizing(quiet)).toBe(false);
    // The sibling is untouched and still addressable by its own key.
    if (rootOwner.kind !== "live") throw new Error("fixture");
    expect(selectJourneyRuntime(state, workspaceOfAuthority(rootOwner.authority)).identity).toEqual(rootOwner);
  });

  /**
   * The Navigator's own report, as a test: with one turn running, selecting the other conversation
   * must not report that conversation as busy. This is the predicate `conversationAvailability`
   * reads as `sameConversationExecutionActive`, which is what disabled Send.
   */
  it("does not block Send on a sibling conversation while another runs", () => {
    const state = register(createInitialJourneyRuntimeState(), rootOwner);
    const presentation = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "mirror-desktop",
      selectedThreadId: "thread-mirror-desktop-child",
    });

    expect(presentation.sendBlocked).toBe(false);
    expect(presentation.selectedRuntime.workspace.threadId).toBe("thread-mirror-desktop-child");
  });

  it("still blocks Send on the conversation that is actually running", () => {
    const state = register(createInitialJourneyRuntimeState(), rootOwner);
    if (rootOwner.kind !== "live") throw new Error("fixture");
    const presentation = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "mirror-desktop",
      selectedThreadId: rootOwner.authority.threadId,
    });

    expect(presentation.sendBlocked).toBe(true);
  });

  /** CR140's measured callers pass `null`, and they keep exactly the answer they had. */
  it("keeps answering for the Journey when the caller genuinely has no thread", () => {
    const state = register(createInitialJourneyRuntimeState(), childOwner);
    expect(selectJourneyRuntime(state, journeyWorkspace("mirror-desktop", null)).identity).toEqual(childOwner);
  });

  /**
   * CR141 drew this line in `selectWorkspaceNativeLease` and `selectJourneyRuntime` was left
   * behind, which is how two functions answering the same question came to disagree. The guard
   * pins the agreement rather than the prose, so drifting apart again fails here.
   */
  it("keeps both workspace selectors falling back only on an unresolved thread", () => {
    const strip = (source: string) => source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const runtime = strip(runtimeStateSource).slice(
      strip(runtimeStateSource).indexOf("export function selectJourneyRuntime("),
      strip(runtimeStateSource).indexOf("export function selectJourneyRuntimeEntries"),
    );
    const lease = strip(occupancySource).slice(
      strip(occupancySource).indexOf("export function selectWorkspaceNativeLease"),
      strip(occupancySource).indexOf("export function hasActiveNativeExecutionInJourney"),
    );
    expect(runtime).toContain("workspace.threadId !== null");
    expect(lease).toContain("workspace.threadId !== null");
  });
});
