import { describe, expect, it } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import {
  createInitialJourneyRuntimeState,
  hasActiveOrFinalizingJourneyRuntime,
  journeyRuntimeReducer,
  selectJourneyRuntime,
  type JourneyRunIdentity,
} from "../app/journeyRuntimeState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

function identity(journeyId: string, runId = `run-${journeyId}`): JourneyRunIdentity {
  const thread = readyThread(journeyId);
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

function register(state = createInitialJourneyRuntimeState(), owner = identity("journey-a")) {
  return journeyRuntimeReducer(state, {
    type: "register",
    identity: owner,
    run: startAgentRun({ content: "hello", mode: owner.kind === "live" ? "live" : "mock", now: new Date("2026-01-01T00:00:00Z") }),
    assistantMessageId: "assistant-a",
  });
}

describe("Journey-keyed frontend runtime state", () => {
  it("routes stream presentation to the captured Journey independently of selection", () => {
    const owner = identity("journey-a");
    let state = register(createInitialJourneyRuntimeState(), owner);
    state = journeyRuntimeReducer(state, { type: "stream_started", identity: owner });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "message_delta", content: "A" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "warning", message: "warning-a" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "diagnostic", message: "diagnostic-a" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "context_usage", usage: { tokens: 10, contextWindow: 100, percent: 10 } } });

    expect(selectJourneyRuntime(state, "journey-a")).toMatchObject({
      isStreaming: true,
      warnings: ["warning-a"],
      diagnostics: ["diagnostic-a"],
      streamedAssistantContent: "A",
      runtimeProjection: { contextUsage: { tokens: 10, contextWindow: 100, percent: 10 } },
    });
    expect(selectJourneyRuntime(state, "journey-b")).toMatchObject({ isStreaming: false, warnings: [], diagnostics: [] });
    expect(hasActiveOrFinalizingJourneyRuntime(state)).toBe(true);
  });

  it("rejects stale events and keeps quarantine separate from current diagnostics", () => {
    const first = identity("journey-a", "run-a1");
    const replacement = identity("journey-a", "run-a2");
    let state = register(createInitialJourneyRuntimeState(), first);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: first, event: { type: "done" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: first });
    state = register(state, replacement);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: first, event: { type: "diagnostic", message: "private stale output" } });

    expect(selectJourneyRuntime(state, "journey-a").identity).toEqual(replacement);
    expect(selectJourneyRuntime(state, "journey-a").diagnostics).toEqual([]);
    expect(state.quarantine).toEqual([expect.objectContaining({ journeyId: "journey-a", runId: "run-a1", reason: "authority_mismatch" })]);
    expect(JSON.stringify(state.quarantine)).not.toContain("private stale output");
  });

  it("rejects divergent Journey authority without touching the current Journey", () => {
    const current = identity("journey-a");
    if (current.kind !== "live") throw new Error("expected live identity");
    const stale: JourneyRunIdentity = {
      kind: "live",
      authority: { ...current.authority, journeyId: "journey-b" },
    };
    let state = register(createInitialJourneyRuntimeState(), current);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: stale, event: { type: "diagnostic", message: "stale" } });
    expect(selectJourneyRuntime(state, "journey-a").diagnostics).toEqual([]);
    expect(state.quarantine.at(-1)).toMatchObject({ journeyId: "journey-b", reason: "unknown_run" });
  });

  it.each([
    ["runId", "stale-run"],
    ["turnId", "stale-turn"],
    ["threadId", "stale-thread"],
    ["generation", 99],
    ["piSessionId", "stale-session"],
    ["mirrorConversationId", "stale-mirror"],
    ["harnessUserMessageId", "stale-user"],
    ["harnessAssistantMessageId", "stale-assistant"],
  ] as const)("rejects divergent %s authority", (field, value) => {
    const current = identity("journey-a");
    if (current.kind !== "live") throw new Error("expected live identity");
    const stale: JourneyRunIdentity = {
      kind: "live",
      authority: { ...current.authority, [field]: value },
    };
    let state = register(createInitialJourneyRuntimeState(), current);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: stale, event: { type: "warning", message: "stale" } });
    expect(selectJourneyRuntime(state, "journey-a").warnings).toEqual([]);
    expect(state.quarantine.at(-1)?.reason).toBe("authority_mismatch");
  });

  it("bounds quarantine metadata without retaining rejected payloads", () => {
    const current = identity("journey-a");
    let state = register(createInitialJourneyRuntimeState(), current);
    for (let index = 0; index < 25; index += 1) {
      const stale = identity("journey-a", `stale-${index}`);
      state = journeyRuntimeReducer(state, {
        type: "stream_event",
        identity: stale,
        event: { type: "diagnostic", message: `secret-${index}` },
      });
    }
    expect(state.quarantine).toHaveLength(20);
    expect(JSON.stringify(state.quarantine)).not.toContain("secret-");
  });

  it("rejects replacement while any Journey is active or finalizing", () => {
    const first = identity("journey-a", "run-a1");
    const second = identity("journey-b", "run-b1");
    let state = register(createInitialJourneyRuntimeState(), first);
    const whileActive = register(state, second);
    expect(whileActive.entries["journey-b"]).toBeUndefined();

    state = journeyRuntimeReducer(state, { type: "stream_event", identity: first, event: { type: "done" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: first });
    state = journeyRuntimeReducer(state, { type: "finalization_started", identity: first });
    const whileFinalizing = register(state, second);
    expect(whileFinalizing.entries["journey-b"]).toBeUndefined();
  });

  it("requires authority-matching cleanup and preserves active or finalizing entries", () => {
    const first = identity("journey-a", "run-a1");
    const replacement = identity("journey-a", "run-a2");
    let state = register(createInitialJourneyRuntimeState(), first);
    expect(journeyRuntimeReducer(state, { type: "cleanup", identity: first })).toBe(state);

    state = journeyRuntimeReducer(state, { type: "stream_event", identity: first, event: { type: "done" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: first });
    state = register(state, replacement);
    const afterStaleCleanup = journeyRuntimeReducer(state, { type: "cleanup", identity: first });
    expect(afterStaleCleanup.entries["journey-a"]?.identity).toEqual(replacement);
  });

  it("keeps cancellation requested while the native route remains streaming", () => {
    const owner = identity("journey-a");
    let state = register(createInitialJourneyRuntimeState(), owner);
    state = journeyRuntimeReducer(state, { type: "cancel_requested", identity: owner, message: "Pi invocation cancelled." });
    expect(selectJourneyRuntime(state, "journey-a")).toMatchObject({
      isStreaming: true,
      agentRun: { status: "cancelled" },
      runtimeProjection: { status: "cancelled" },
      warnings: [],
    });
    expect(hasActiveOrFinalizingJourneyRuntime(state)).toBe(true);
  });

  it("keeps mock identity keyed without live authority", () => {
    const mock: JourneyRunIdentity = { kind: "mock", journeyId: "journey-mock", runId: "mock-1" };
    const state = register(createInitialJourneyRuntimeState(), mock);
    expect(selectJourneyRuntime(state, "journey-mock").identity).toEqual(mock);
  });
});
