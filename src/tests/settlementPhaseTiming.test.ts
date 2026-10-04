import { describe, expect, it, vi } from "vitest";
import {
  FINISHING_PHASE_VISIBLE_AFTER_MS,
  createSettlementTimingCollector,
  createSettlementTimingRegistry,
  describeSettlementPhase,
  timeFinalizationPorts,
  visibleFinishingPhase,
} from "../app/settlementPhaseTiming";
import type { TurnFinalizationPorts } from "../app/turnFinalizationCoordinator";

// CR119: Finishing lasted up to thirty minutes in production and nothing recorded which step took
// the time. Four candidate causes were eliminated with the data that existed; the remaining
// variance cannot be attributed without per-phase timing. These tests pin the accumulator that
// provides it, the once-only write that keeps it off the per-event persistence path CR116 fixed,
// and the surface rule that lets a long wait name its phase without touching a fast one.

const authority = { journeyId: "mirror-desktop", runId: "agent-run-1", turnId: "turn-1", generation: 4 };

function fakeClock(start = 1_000) {
  let now = start;
  return {
    now: () => now,
    iso: () => new Date(now).toISOString(),
    advance: (ms: number) => { now += ms; },
  };
}

describe("settlement phase timing collector", () => {
  it("records elapsed time per named phase and the total, in memory, without any write", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock);

    await collector.time("load_active_evidence", async () => { clock.advance(40); return "a"; });
    await collector.time("save_durable_projection", async () => { clock.advance(2_500); return "b"; });
    clock.advance(10);
    const record = collector.finish("settled");

    expect(record.schemaVersion).toBe("0.1.0");
    expect(record.journeyId).toBe("mirror-desktop");
    expect(record.runId).toBe("agent-run-1");
    expect(record.outcome).toBe("settled");
    expect(record.phases.map((phase) => [phase.phase, phase.elapsedMs, phase.outcome])).toEqual([
      ["load_active_evidence", 40, "completed"],
      ["save_durable_projection", 2_500, "completed"],
    ]);
    expect(record.totalMs).toBe(2_550);
    expect(record.startedAt).toBe(new Date(1_000).toISOString());
    expect(record.finishedAt).toBe(new Date(3_550).toISOString());
  });

  it("the top-level phases account for the whole window; nested phases are recorded at depth", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock);

    await collector.time("save_projection", async () => {
      await collector.time("save_durable_projection", async () => { clock.advance(300); });
      await collector.time("publish_segments", async () => { clock.advance(700); });
    });
    await collector.time("deliver_outbox", async () => { clock.advance(500); });
    const record = collector.finish("settled");

    expect(record.phases.map((phase) => [phase.phase, phase.depth, phase.elapsedMs])).toEqual([
      ["save_projection", 0, 1_000],
      ["save_durable_projection", 1, 300],
      ["publish_segments", 1, 700],
      ["deliver_outbox", 0, 500],
    ]);
    const topLevel = record.phases.filter((phase) => phase.depth === 0);
    expect(topLevel.reduce((sum, phase) => sum + phase.elapsedMs, 0)).toBe(record.totalMs);
  });

  it("a phase that throws is recorded as failed with its elapsed time, and the error still propagates", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock);

    await expect(collector.time("deliver_outbox", async () => {
      clock.advance(90_000);
      throw new Error("mirror_unreachable");
    })).rejects.toThrow("mirror_unreachable");
    const record = collector.finish("failed");

    expect(record.phases).toEqual([expect.objectContaining({
      phase: "deliver_outbox", elapsedMs: 90_000, outcome: "failed", depth: 0,
    })]);
    expect(record.outcome).toBe("failed");
  });

  it("exposes the phase currently running and clears it when the phase ends", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock);
    const seen: Array<string | undefined> = [];
    collector.subscribe((phase) => seen.push(phase));

    expect(collector.currentPhase()).toBeUndefined();
    await collector.time("save_projection", async () => {
      expect(collector.currentPhase()).toBe("save_projection");
      await collector.time("publish_segments", async () => {
        // The innermost phase is the one a reader should see named.
        expect(collector.currentPhase()).toBe("publish_segments");
      });
      expect(collector.currentPhase()).toBe("save_projection");
    });
    expect(collector.currentPhase()).toBeUndefined();
    expect(seen).toEqual(["save_projection", "publish_segments", "save_projection", undefined]);
  });
});

describe("settlement timing registry", () => {
  it("keys one collector per Journey, because finalization is serialized per Journey", () => {
    const registry = createSettlementTimingRegistry(fakeClock());
    const first = registry.begin(authority);
    expect(registry.get("mirror-desktop")).toBe(first);
    expect(registry.get("other")).toBeUndefined();

    const record = registry.end("mirror-desktop", "settled");
    expect(record?.runId).toBe("agent-run-1");
    expect(registry.get("mirror-desktop")).toBeUndefined();
  });

  it("ending a Journey with no collector is a no-op rather than a throw", () => {
    const registry = createSettlementTimingRegistry(fakeClock());
    expect(registry.end("mirror-desktop", "settled")).toBeUndefined();
  });

  it("times a phase against whichever collector owns the Journey, and runs the work untimed when none does", async () => {
    const clock = fakeClock();
    const registry = createSettlementTimingRegistry(clock);
    const untimed = await registry.time("mirror-desktop", "save_durable_projection", async () => 7);
    expect(untimed).toBe(7);

    registry.begin(authority);
    await registry.time("mirror-desktop", "save_durable_projection", async () => { clock.advance(25); });
    const record = registry.end("mirror-desktop", "settled");
    expect(record?.phases).toEqual([expect.objectContaining({ phase: "save_durable_projection", elapsedMs: 25 })]);
  });
});

describe("timed finalization ports", () => {
  it("wraps every port with its own name as the phase and leaves results and errors untouched", async () => {
    const clock = fakeClock();
    const registry = createSettlementTimingRegistry(clock);
    registry.begin(authority);
    const settlementAuthority = {
      schemaVersion: "0.1.0" as const,
      journeyId: "mirror-desktop", runId: "agent-run-1", turnId: "turn-1", generation: 4,
      threadId: "nautilus-thread-mirror-desktop", piSessionId: "s", piSessionFile: "f",
      mirrorConversationId: "c", harnessUserMessageId: "u", harnessAssistantMessageId: "a",
      runAuthority: {} as never,
    };
    const ports = {
      loadJournal: vi.fn(async () => { clock.advance(5); return { records: [] }; }),
      advanceJournal: vi.fn(async () => { clock.advance(6); }),
      enqueueOutboxItem: vi.fn(async () => { clock.advance(7); }),
      deliverOutboxItem: vi.fn(async () => { clock.advance(8_000); throw new Error("mirror_unreachable"); }),
      acknowledgeOutboxItem: vi.fn(async () => {}),
      loadPersistedProjection: vi.fn(async () => undefined),
      savePostFrontierProjection: vi.fn(async () => {}),
      loadActiveEvidence: vi.fn(async () => { clock.advance(9); return { activeGeneration: 4, currentRunId: "r", currentTurnId: "t" }; }),
      saveProjection: vi.fn(async () => { clock.advance(10); }),
      cleanupLease: vi.fn(async () => {}),
    } as unknown as TurnFinalizationPorts;

    const timed = timeFinalizationPorts(ports, registry);
    expect(await timed.loadJournal("mirror-desktop")).toEqual({ records: [] });
    await timed.loadActiveEvidence(settlementAuthority);
    await timed.saveProjection({} as never, settlementAuthority);
    await expect(timed.deliverOutboxItem("item", settlementAuthority)).rejects.toThrow("mirror_unreachable");

    const record = registry.end("mirror-desktop", "failed");
    expect(record?.phases.map((phase) => [phase.phase, phase.elapsedMs, phase.outcome])).toEqual([
      ["load_journal", 5, "completed"],
      ["load_active_evidence", 9, "completed"],
      ["save_projection", 10, "completed"],
      ["deliver_outbox_item", 8_000, "failed"],
    ]);
    expect(ports.loadJournal).toHaveBeenCalledWith("mirror-desktop");
  });
});

describe("naming the phase on the surface", () => {
  it("stays silent until a wait has visibly begun, so a fast turn looks exactly as it does today", () => {
    expect(visibleFinishingPhase({ phase: "publish_segments", since: 1_000, now: 1_000 + FINISHING_PHASE_VISIBLE_AFTER_MS - 1 }))
      .toBeUndefined();
    expect(visibleFinishingPhase({ phase: "publish_segments", since: 1_000, now: 1_000 + FINISHING_PHASE_VISIBLE_AFTER_MS }))
      .toBe("publishing chapters");
    expect(visibleFinishingPhase({ phase: undefined, since: 1_000, now: 99_000 })).toBeUndefined();
  });

  it("describes every phase the settlement path names in words a reader can act on", () => {
    expect(describeSettlementPhase("load_active_evidence")).toBe("checking the Journey");
    expect(describeSettlementPhase("save_durable_projection")).toBe("saving the conversation");
    expect(describeSettlementPhase("refresh_segments")).toBe("reading the session");
    expect(describeSettlementPhase("publish_segments")).toBe("publishing chapters");
    expect(describeSettlementPhase("deliver_outbox_item")).toBe("sending to Mirror");
    expect(describeSettlementPhase("advance_journal")).toBe("recording the turn");
    // An unknown label is still shown, never hidden: the point is to stop being mute.
    expect(describeSettlementPhase("something_new")).toBe("something new");
  });
});
