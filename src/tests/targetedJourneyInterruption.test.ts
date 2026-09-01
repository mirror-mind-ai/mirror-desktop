import { describe, expect, it, vi } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import { cancelExactJourneyRun } from "../app/journeyCancellation";
import {
  captureJourneyRunTerminal,
  type JourneyRunTerminal,
} from "../app/journeyRunTerminal";
import {
  createInitialJourneyRuntimeState,
  journeyRuntimeReducer,
  type JourneyRunIdentity,
} from "../app/journeyRuntimeState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function liveIdentity(journeyId: string, runId: string): JourneyRunIdentity {
  const thread = readyThread(journeyId);
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return {
    kind: "live",
    authority: createRunAuthority(
      createDedicatedTurnAuthority(
        thread,
        runId,
        `turn-${runId}`,
        `user-${runId}`,
        `assistant-${runId}`,
      ),
      conversation.liveIdentity,
      thread.generations[0],
    ),
  };
}

function register(state: ReturnType<typeof createInitialJourneyRuntimeState>, identity: JourneyRunIdentity) {
  if (identity.kind !== "live") throw new Error("expected live identity");
  const base = createDedicatedJourneyConversation({
    thread: readyThread(identity.authority.journeyId),
    initialMessages: [],
  });
  const projection = stageCorrelatedTurn(
    base,
    identity.authority.correlation,
    {
      id: identity.authority.harnessUserMessageId,
      role: "user",
      content: identity.authority.runId,
      createdAt: "2026-09-01T12:00:00.000Z",
    },
    {
      id: identity.authority.harnessAssistantMessageId,
      role: "assistant",
      content: "",
      createdAt: "2026-09-01T12:00:01.000Z",
    },
  );
  return journeyRuntimeReducer(state, {
    type: "register",
    identity,
    run: startAgentRun({
      content: identity.authority.runId,
      mode: "live",
      now: new Date("2026-09-01T12:00:00.000Z"),
    }),
    assistantMessageId: identity.authority.harnessAssistantMessageId,
    conversationSnapshot: projection,
  });
}

describe("targeted concurrent Journey interruption", () => {
  it("captures exact cancellation authority before navigation changes", async () => {
    const a = liveIdentity("journey-a", "run-a1");
    const b = liveIdentity("journey-b", "run-b1");
    const entered = deferred();
    const release = deferred();
    const calls: Array<[string, string]> = [];
    let selected = a;

    const cancellation = cancelExactJourneyRun(selected, {
      cancelInvocation: async (journeyId, runId) => {
        calls.push([journeyId, runId]);
        entered.resolve();
        await release.promise;
      },
    });
    await entered.promise;
    selected = b;
    release.resolve();
    await cancellation;

    expect(selected).toBe(b);
    expect(calls).toEqual([["journey-a", "run-a1"]]);
  });

  it("rejects mock cancellation without invoking native control", async () => {
    const cancelInvocation = vi.fn();
    await expect(cancelExactJourneyRun(
      { kind: "mock", journeyId: "journey-a", runId: "mock-a1" },
      { cancelInvocation },
    )).rejects.toThrow("Only live Pi invocations have native cancellation authority.");
    expect(cancelInvocation).not.toHaveBeenCalled();
  });

  it.each([
    [["cancelled", "failed", "completed"], "cancelled"],
    [["failed", "cancelled", "completed"], "failed"],
    [["completed", "cancelled", "failed"], "completed"],
  ] as Array<[JourneyRunTerminal[], JourneyRunTerminal]>) (
    "keeps the first terminal from %j",
    (signals, expected) => {
      const result = signals.reduce<JourneyRunTerminal | undefined>(
        (current, signal) => captureJourneyRunTerminal(current, signal),
        undefined,
      );
      expect(result).toBe(expected);
    },
  );

  it("keeps the sibling runtime byte-identical through cancellation and failure signals", () => {
    const a = liveIdentity("journey-a", "run-a1");
    const b = liveIdentity("journey-b", "run-b1");
    let state = register(createInitialJourneyRuntimeState(), a);
    state = register(state, b);
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: b,
      event: { type: "message_delta", content: "B remains alive" },
    });
    const bBefore = JSON.stringify(state.entries["journey-b"]);

    state = journeyRuntimeReducer(state, {
      type: "cancel_requested",
      identity: a,
      message: "Pi invocation cancelled.",
    });
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: a,
      event: { type: "cancelled", message: "Pi invocation cancelled." },
    });
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: a,
      event: { type: "error", message: "late process callback" },
    });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: a });

    expect(state.entries["journey-a"]?.agentRun.status).toBe("cancelled");
    expect(state.entries["journey-a"]?.runtimeProjection.status).toBe("cancelled");
    expect(JSON.stringify(state.entries["journey-b"])).toBe(bBefore);
  });
});
