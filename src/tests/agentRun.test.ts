import { describe, expect, it } from "vitest";
import {
  cancelAgentRun,
  canRetryAgentRun,
  completeAgentRun,
  failAgentRun,
  reduceAgentRunFromStreamEvent,
  startAgentRun,
} from "../agent/agentRun";

describe("agent run state", () => {
  it("starts a running live request", () => {
    const run = startAgentRun({ content: "Hello", mode: "live", now: new Date("2026-08-22T10:00:00.000Z") });

    expect(run).toEqual({
      id: "agent-run-2026-08-22T10:00:00.000Z",
      status: "running",
      startedAt: "2026-08-22T10:00:00.000Z",
      lastRequest: { content: "Hello", mode: "live" },
    });
  });

  it("marks completion and failure", () => {
    const run = startAgentRun({ content: "Hello", mode: "live", now: new Date("2026-08-22T10:00:00.000Z") });

    expect(completeAgentRun(run, new Date("2026-08-22T10:01:00.000Z"))).toMatchObject({
      status: "completed",
      completedAt: "2026-08-22T10:01:00.000Z",
    });
    expect(failAgentRun(run, "boom", new Date("2026-08-22T10:01:00.000Z"))).toMatchObject({
      status: "failed",
      completedAt: "2026-08-22T10:01:00.000Z",
      error: "boom",
    });
  });

  it("allows retry only after failure or cancellation", () => {
    const running = startAgentRun({ content: "Hello", mode: "live", now: new Date("2026-08-22T10:00:00.000Z") });

    expect(canRetryAgentRun(running)).toBe(false);
    expect(canRetryAgentRun(cancelAgentRun(running))).toBe(true);
    expect(canRetryAgentRun(failAgentRun(running, "boom"))).toBe(true);
  });

  it("settles from structured stream events at agent completion before wrapper cleanup", () => {
    const running = startAgentRun({ content: "Hello", mode: "live", now: new Date("2026-08-22T10:00:00.000Z") });

    const completed = reduceAgentRunFromStreamEvent(running, { type: "run_status", status: "completed" });
    expect(completed.status).toBe("completed");
    expect(reduceAgentRunFromStreamEvent(completed, { type: "done" })).toBe(completed);

    const cancelled = reduceAgentRunFromStreamEvent(running, { type: "cancelled", message: "cancelled" });
    expect(cancelled.status).toBe("cancelled");
    expect(reduceAgentRunFromStreamEvent(cancelled, { type: "run_status", status: "completed" })).toBe(cancelled);

    const failed = reduceAgentRunFromStreamEvent(running, { type: "error", message: "boom" });
    expect(failed).toMatchObject({ status: "failed", error: "boom" });
    expect(reduceAgentRunFromStreamEvent(failed, { type: "done" })).toBe(failed);
  });

  it("keeps the first terminal outcome immutable across duplicate and late transitions", () => {
    const running = startAgentRun({ content: "Hello", mode: "live", now: new Date("2026-08-22T10:00:00.000Z") });
    const cancelled = cancelAgentRun(running, new Date("2026-08-22T10:00:10.000Z"));
    const failed = failAgentRun(running, "boom", new Date("2026-08-22T10:00:10.000Z"));

    expect(completeAgentRun(cancelled, new Date("2026-08-22T10:00:20.000Z"))).toBe(cancelled);
    expect(failAgentRun(cancelled, "late failure", new Date("2026-08-22T10:00:20.000Z"))).toBe(cancelled);
    expect(cancelAgentRun(cancelled, new Date("2026-08-22T10:00:20.000Z"))).toBe(cancelled);
    expect(completeAgentRun(failed, new Date("2026-08-22T10:00:20.000Z"))).toBe(failed);
    expect(cancelAgentRun(failed, new Date("2026-08-22T10:00:20.000Z"))).toBe(failed);
  });
});
