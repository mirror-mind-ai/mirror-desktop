import { describe, expect, it } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import {
  createInitialJourneyRuntimeState,
  journeyRuntimeReducer,
  selectJourneyRuntime,
  selectJourneyRuntimeEntries,
  selectJourneyRuntimeOwnerPhase,
  type JourneyRunIdentity,
  type JourneyRuntimeState,
} from "../app/journeyRuntimeState";
import { journeyWorkspace, runtimeWorkspaceKey, workspaceOfAuthority } from "../app/journeyWorkspaceKey";
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
