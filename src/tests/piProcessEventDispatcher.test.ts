import { describe, expect, it, vi } from "vitest";
import { createPiProcessEventDispatcher, type PiProcessEvent } from "../agent/piProcessEventDispatcher";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

function authority(runId = "run-1", journeyId = "journey-one") {
  const thread = readyThread(journeyId);
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return createRunAuthority(
    createDedicatedTurnAuthority(thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`),
    conversation.liveIdentity,
    thread.generations[0],
  );
}

/** CR141: two authorities in one Journey on different threads — the shape the field refused. */
function sibling(runId: string, threadId: string) {
  const thread = readyThread("journey-shared", threadId);
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

  it("routes two concurrent Journeys independently through one listener", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const first = authority("run-a1", "journey-a");
    const second = authority("run-b1", "journey-b");
    const receivedA = vi.fn();
    const receivedB = vi.fn();
    const routeA = await dispatcher.register(first, receivedA);
    const routeB = await dispatcher.register(second, receivedB);

    fixture.emit({ kind: "stdout", content: "B only", authority: second.eventAuthority });
    fixture.emit({ kind: "stderr", content: "A only", authority: first.eventAuthority });
    expect(receivedA).toHaveBeenCalledTimes(1);
    expect(receivedA).toHaveBeenCalledWith(expect.objectContaining({ content: "A only" }));
    expect(receivedB).toHaveBeenCalledTimes(1);
    expect(receivedB).toHaveBeenCalledWith(expect.objectContaining({ content: "B only" }));

    fixture.emit({ kind: "done", content: "A done", authority: first.eventAuthority });
    expect(routeA.isClosed()).toBe(true);
    expect(routeB.isClosed()).toBe(false);
    fixture.emit({ kind: "stdout", content: "B later", authority: second.eventAuthority });
    expect(receivedB).toHaveBeenCalledTimes(2);
    expect(fixture.listen).toHaveBeenCalledTimes(1);
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

  it("does not resurrect a terminal route from stale in-session occupancy", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const completed = authority("run-completed");
    const replacement = authority("run-replacement");
    const completedRoute = await dispatcher.register(completed, vi.fn());

    fixture.emit({ kind: "done", content: "done", authority: completed.eventAuthority });
    expect(completedRoute.isClosed()).toBe(true);

    const staleRecovery = await dispatcher.rehydrate(completed, vi.fn());
    expect(staleRecovery.isClosed()).toBe(true);
    await expect(dispatcher.register(completed, vi.fn())).rejects.toThrow("already closed");

    const replacementRoute = await dispatcher.register(replacement, vi.fn());
    expect(replacementRoute.isClosed()).toBe(false);
    expect(fixture.listen).toHaveBeenCalledTimes(1);
  });

  it("does not resurrect a route aborted before native invocation", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const rejected = authority("run-rejected");
    const route = await dispatcher.register(rejected, vi.fn());
    route.abortBeforeInvocation();

    expect(route.isClosed()).toBe(true);
    expect((await dispatcher.rehydrate(rejected, vi.fn())).isClosed()).toBe(true);
    expect((await dispatcher.register(authority("run-after-rejection"), vi.fn())).isClosed()).toBe(false);
  });

  it("allows genuine recovery after dispatcher disposal starts a new lifecycle", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const run = authority("run-restart-recovery");
    await dispatcher.register(run, vi.fn());
    fixture.emit({ kind: "done", content: "done", authority: run.eventAuthority });
    expect((await dispatcher.rehydrate(run, vi.fn())).isClosed()).toBe(true);

    await dispatcher.dispose();
    const recovered = await dispatcher.rehydrate(run, vi.fn());
    expect(recovered.isClosed()).toBe(false);
    expect(fixture.listen).toHaveBeenCalledTimes(2);
  });

  it("fails route registration when listener attachment fails", async () => {
    const dispatcher = createPiProcessEventDispatcher({
      listen: vi.fn(async () => { throw new Error("listen failed"); }),
    });
    await expect(dispatcher.register(authority(), vi.fn())).rejects.toThrow("listen failed");
  });
});

/**
 * CR141. The route map was keyed by `journeyId`, so a second workspace in one Journey threw
 * inside `register` — before `start_pi_invocation`, and after Send had been accepted. These cases
 * are the sibling twins of the two-Journey case above: same Journey, different threads.
 *
 * The five same-workspace cases above must keep passing unchanged. They are all same-thread
 * through the fixture, and needing to edit one of them would mean the key is wrong.
 */
describe("CR141: two workspaces in one Journey route independently", () => {
  it("delivers each workspace only its own events and closes them independently", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const first = sibling("run-a", "thread-one");
    const second = sibling("run-b", "thread-two");
    const receivedA = vi.fn();
    const receivedB = vi.fn();
    const routeA = await dispatcher.register(first, receivedA);
    const routeB = await dispatcher.register(second, receivedB);

    expect(first.journeyId).toBe(second.journeyId);
    fixture.emit({ kind: "stdout", content: "two only", authority: second.eventAuthority });
    fixture.emit({ kind: "stderr", content: "one only", authority: first.eventAuthority });
    expect(receivedA).toHaveBeenCalledTimes(1);
    expect(receivedA).toHaveBeenCalledWith(expect.objectContaining({ content: "one only" }));
    expect(receivedB).toHaveBeenCalledTimes(1);
    expect(receivedB).toHaveBeenCalledWith(expect.objectContaining({ content: "two only" }));

    fixture.emit({ kind: "done", content: "one done", authority: first.eventAuthority });
    expect(routeA.isClosed()).toBe(true);
    expect(routeB.isClosed()).toBe(false);
    fixture.emit({ kind: "stdout", content: "two later", authority: second.eventAuthority });
    expect(receivedB).toHaveBeenCalledTimes(2);
    expect(fixture.listen).toHaveBeenCalledTimes(1);
  });

  it("refuses a second route for the same workspace while admitting the sibling", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    await dispatcher.register(sibling("run-a", "thread-one"), vi.fn());

    // The backstop behind `same_workspace_occupied`, which admission refuses first with a
    // sentence. It names both coordinates, so it can no longer read as a Journey-wide lockout.
    await expect(dispatcher.register(sibling("run-a2", "thread-one"), vi.fn()))
      .rejects.toThrow("Pi process route already active for workspace journey-shared/thread-one.");
    expect((await dispatcher.register(sibling("run-b", "thread-two"), vi.fn())).isClosed()).toBe(false);
  });

  it("does not raise an authority mismatch when a sibling rehydrates", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    await dispatcher.register(sibling("run-a", "thread-one"), vi.fn());

    const recovered = vi.fn();
    const route = await dispatcher.rehydrate(sibling("run-b", "thread-two"), recovered);
    expect(route.isClosed()).toBe(false);
    fixture.emit({ kind: "stdout", content: "to the sibling", authority: sibling("run-b", "thread-two").eventAuthority });
    expect(recovered).toHaveBeenCalledTimes(1);
  });

  it("remembers closure per workspace, so a sibling cannot evict it", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    const closing = sibling("run-a", "thread-one");
    await dispatcher.register(closing, vi.fn());
    fixture.emit({ kind: "done", content: "done", authority: closing.eventAuthority });

    // CLOSED_ROUTE_LIMIT aside, the list used to replace by Journey. A sibling closing after this
    // one would have forgotten it, and the late rehydrate below would resurrect a terminal route.
    const later = sibling("run-b", "thread-two");
    await dispatcher.register(later, vi.fn());
    fixture.emit({ kind: "done", content: "done", authority: later.eventAuthority });

    expect((await dispatcher.rehydrate(closing, vi.fn())).isClosed()).toBe(true);
    await expect(dispatcher.register(closing, vi.fn())).rejects.toThrow("already closed for workspace");
  });

  it("quarantines by workspace and still quarantines an event with no authority", async () => {
    const fixture = listenerFixture();
    const dispatcher = createPiProcessEventDispatcher({ listen: fixture.listen });
    await dispatcher.register(sibling("run-a", "thread-one"), vi.fn());

    fixture.emit({ kind: "stdout", content: "orphan", authority: sibling("run-x", "thread-unrouted").eventAuthority });
    fixture.emit({ kind: "stdout", content: "no authority" });

    expect(dispatcher.quarantine()).toEqual([
      { journeyId: "journey-shared", threadId: "thread-unrouted", runId: "run-x", reason: "unknown_route" },
      { journeyId: undefined, threadId: undefined, runId: undefined, reason: "missing_authority" },
    ]);
  });
});
