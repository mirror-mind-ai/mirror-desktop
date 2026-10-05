import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import {
  SETTLEMENT_FAILURE_REASON_MAX_CHARS,
  createSettlementTimingCollector,
  createSettlementTimingRegistry,
  timeFinalizationPorts,
  type SettlementTimingClock,
} from "../app/settlementPhaseTiming";
import type { TurnFinalizationPorts } from "../app/turnFinalizationCoordinator";

const authority = {
  journeyId: "livro-lideranca-soberana",
  runId: "agent-run-1",
  turnId: "turn-agent-run-1",
  generation: 1,
} as const;

function clock(): SettlementTimingClock {
  let ms = 0;
  return { now: () => (ms += 10), iso: () => new Date(1_760_000_000_000 + ms).toISOString() };
}

describe("CR121: a failed settlement names itself", () => {
  it("attributes a throw inside a phase to that phase", async () => {
    // CR123's shape: publish_segments throws, nested inside save_projection.
    const collector = createSettlementTimingCollector(authority, clock());
    await collector.time("load_journal", async () => undefined);
    await expect(collector.time("save_projection", () => collector.time(
      "publish_segments",
      () => Promise.reject(new Error("Conversation Segment completion receipt is unavailable.")),
    ))).rejects.toThrow("receipt is unavailable");

    const record = collector.finish("failed", "Conversation Segment completion receipt is unavailable.");
    expect(record.outcome).toBe("failed");
    expect(record.failure).toEqual({
      reason: "Conversation Segment completion receipt is unavailable.",
      phase: "publish_segments",
    });
    // the innermost failed phase is named, not the outer one that merely propagated it
    expect(record.phases.filter((phase) => phase.outcome === "failed").map((phase) => phase.phase))
      .toEqual(["save_projection", "publish_segments"]);
  });

  it("attributes a throw between phases to the last phase that completed", async () => {
    // CR122's shape: cleanup_lease completed, then createMirrorAppendOutboxItem threw before the
    // next port was reached. Every phase reports completed and the settlement still failed.
    const collector = createSettlementTimingCollector(authority, clock());
    await collector.time("load_active_evidence", async () => undefined);
    await collector.time("cleanup_lease", async () => undefined);

    const record = collector.finish("failed", "mirror_append_item_authority_invalid");
    expect(record.failure).toEqual({
      reason: "mirror_append_item_authority_invalid",
      afterPhase: "cleanup_lease",
    });
    expect(record.phases.every((phase) => phase.outcome === "completed")).toBe(true);
  });

  it("records no failure on a settled turn", async () => {
    const collector = createSettlementTimingCollector(authority, clock());
    await collector.time("load_journal", async () => undefined);
    const record = collector.finish("settled");
    expect(record.outcome).toBe("settled");
    expect("failure" in record).toBe(false);
  });

  it("omits the failure when a failed settlement has no reason to give", async () => {
    const collector = createSettlementTimingCollector(authority, clock());
    const record = collector.finish("failed");
    expect("failure" in record).toBe(false);
  });

  it("truncates an oversized reason visibly instead of dropping or refusing it", async () => {
    const collector = createSettlementTimingCollector(authority, clock());
    await collector.time("load_journal", async () => undefined);
    const long = "x".repeat(SETTLEMENT_FAILURE_REASON_MAX_CHARS + 500);
    const record = collector.finish("failed", long);
    expect(record.failure!.reason).toHaveLength(SETTLEMENT_FAILURE_REASON_MAX_CHARS);
    expect(record.failure!.reason.endsWith("…")).toBe(true);
    expect(record.failure!.reason.startsWith("xxx")).toBe(true);
  });

  it("carries the reason through the registry, which the app writes once", async () => {
    const registry = createSettlementTimingRegistry(clock());
    registry.begin(authority);
    await registry.time(authority.journeyId, "cleanup_lease", async () => undefined);
    const record = registry.end(authority.journeyId, "failed", "boom");
    expect(record!.failure).toEqual({ reason: "boom", afterPhase: "cleanup_lease" });
    // the collector is released, so a second settlement starts clean
    expect(registry.end(authority.journeyId, "failed", "boom")).toBeUndefined();
  });

  it("names the two settlement steps that are not ports", async () => {
    const registry = createSettlementTimingRegistry(clock());
    const collector = registry.begin(authority);
    const ports = timeFinalizationPorts({} as TurnFinalizationPorts, registry);
    expect(ports.timeStep).toBeDefined();

    // Both wrapped steps are synchronous: the point is attribution, not duration.
    const item = await ports.timeStep!(authority.journeyId, "create_outbox_item", () => "item");
    expect(item).toBe("item");
    await expect(ports.timeStep!(authority.journeyId, "notify_lease_released", () => {
      throw new Error("subscriber exploded");
    })).rejects.toThrow("subscriber exploded");

    const record = collector.finish("failed", "subscriber exploded");
    expect(record.phases.map((phase) => phase.phase))
      .toEqual(["create_outbox_item", "notify_lease_released"]);
    expect(record.failure).toEqual({ reason: "subscriber exploded", phase: "notify_lease_released" });
  });

  it("runs an untimed step unchanged when no collector owns the Journey", async () => {
    const registry = createSettlementTimingRegistry(clock());
    const ports = timeFinalizationPorts({} as TurnFinalizationPorts, registry);
    await expect(ports.timeStep!("unknown-journey", "create_outbox_item", () => "still runs"))
      .resolves.toBe("still runs");
  });

  it("keeps the app passing the error it caught into the record", () => {
    // Guard against the exact regression this CR exists to undo: the application already held the
    // error and discarded it, which cost two full investigations to recover by hand.
    expect(appSource).toContain("settlementTimingRegistry.end(ownerJourneyId, settlementOutcome, settlementFailureReason)");
    expect(appSource).toContain("settlementFailureReason =");
  });
});
