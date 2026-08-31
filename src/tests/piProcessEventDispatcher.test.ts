import { describe, expect, it, vi } from "vitest";
import { createPiProcessEventDispatcher, type PiProcessEvent } from "../agent/piProcessEventDispatcher";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

function authority(runId = "run-1") {
  const thread = readyThread("journey-one");
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return createRunAuthority(
    createDedicatedTurnAuthority(thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`),
    conversation.liveIdentity,
    thread.generations[0],
  );
}

function listenerFixture() {
  let handler: ((event: { payload: PiProcessEvent }) => void) | undefined;
  const unlisten = vi.fn();
  const listen = vi.fn(async (_name: string, next: (event: { payload: PiProcessEvent }) => void) => {
    handler = next;
    return unlisten;
  });
  return {
    listen,
    unlisten,
    emit(event: PiProcessEvent) {
      handler?.({ payload: event });
    },
  };
}

describe("central Pi process event dispatcher", () => {
  it("mounts one listener for sequential routes and disposes exactly once", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const first = authority("run-1");
    const second = authority("run-2");

    await dispatcher.mount();
    await dispatcher.register(first, vi.fn());
    fixture.emit({ kind: "done", content: "done", authority: first.eventAuthority });
    await dispatcher.register(second, vi.fn());

    expect(fixture.listen).toHaveBeenCalledTimes(1);
    await dispatcher.dispose();
    await dispatcher.dispose();
    expect(fixture.unlisten).toHaveBeenCalledTimes(1);
  });

  it("keeps a route open through completed, error, cancelled and post-agent_end evidence until native done", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const run = authority();
    const received: PiProcessEvent[] = [];
    const route = await dispatcher.register(run, (event) => received.push(event));

    fixture.emit({ kind: "stdout", content: '{"type":"agent_end"}\n', authority: run.eventAuthority });
    fixture.emit({ kind: "error", content: "error", authority: run.eventAuthority });
    fixture.emit({ kind: "cancelled", content: "cancelled", authority: run.eventAuthority });
    fixture.emit({ kind: "stdout", content: '{"type":"context_usage"}\n', authority: run.eventAuthority });
    fixture.emit({ kind: "stdout", content: '{"type":"mirror_commit"}\n', authority: run.eventAuthority });

    expect(route.isClosed()).toBe(false);
    expect(received).toHaveLength(5);

    fixture.emit({ kind: "done", content: "done", authority: run.eventAuthority });
    expect(received.at(-1)?.kind).toBe("done");
    expect(route.isClosed()).toBe(true);
  });

  it("rejects stale done without closing a replacement route or delivering diagnostics", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const stale = authority("run-1");
    const current = authority("run-2");
    const received = vi.fn();
    const staleRoute = await dispatcher.register(stale, vi.fn());
    fixture.emit({ kind: "done", content: "done", authority: stale.eventAuthority });
    expect(staleRoute.isClosed()).toBe(true);
    const currentRoute = await dispatcher.register(current, received);

    fixture.emit({ kind: "stderr", content: "private stale diagnostic", authority: stale.eventAuthority });
    fixture.emit({ kind: "done", content: "stale done", authority: stale.eventAuthority });

    expect(received).not.toHaveBeenCalled();
    expect(currentRoute.isClosed()).toBe(false);
    expect(JSON.stringify(dispatcher.quarantine())).not.toContain("private stale diagnostic");
  });

  it("does not deliver after disposal and remounts without duplicate active listeners", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const run = authority();
    const received = vi.fn();
    await dispatcher.register(run, received);
    await dispatcher.dispose();
    fixture.emit({ kind: "started", content: "late", authority: run.eventAuthority });
    expect(received).not.toHaveBeenCalled();

    await dispatcher.mount();
    expect(fixture.listen).toHaveBeenCalledTimes(2);
  });

  it("remounts cleanly when disposal races the initial listener attachment", async () => {
    let resolveFirst: ((unlisten: () => void) => void) | undefined;
    const firstUnlisten = vi.fn();
    const secondUnlisten = vi.fn();
    const listen = vi.fn()
      .mockImplementationOnce(async () => new Promise<() => void>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(secondUnlisten);
    const dispatcher = createPiProcessEventDispatcher({ listen });

    const initialMount = dispatcher.mount();
    const disposal = dispatcher.dispose();
    const remount = dispatcher.mount();
    resolveFirst?.(firstUnlisten);
    await Promise.all([initialMount, disposal, remount]);

    expect(listen).toHaveBeenCalledTimes(2);
    expect(firstUnlisten).toHaveBeenCalledTimes(1);
    expect(secondUnlisten).not.toHaveBeenCalled();
    await dispatcher.dispose();
    expect(secondUnlisten).toHaveBeenCalledTimes(1);
  });

  it("rehydrates an exact inspected/persisted route without duplicate listener or delivery", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const run = authority();
    const staleHandler = vi.fn();
    const recoveredHandler = vi.fn();
    await dispatcher.rehydrate(run, staleHandler);
    await dispatcher.rehydrate(run, recoveredHandler);
    fixture.emit({ kind: "stdout", content: "recovered", authority: run.eventAuthority });
    expect(fixture.listen).toHaveBeenCalledTimes(1);
    expect(staleHandler).not.toHaveBeenCalled();
    expect(recoveredHandler).toHaveBeenCalledTimes(1);
    await expect(dispatcher.rehydrate(authority("run-2"), vi.fn()))
      .rejects.toThrow("authority mismatch");
  });

  it("fails route registration when listener attachment fails", async () => {
    const dispatcher = createPiProcessEventDispatcher({
      listen: vi.fn(async () => { throw new Error("listen failed"); }),
    });
    await expect(dispatcher.register(authority(), vi.fn())).rejects.toThrow("listen failed");
  });
});
