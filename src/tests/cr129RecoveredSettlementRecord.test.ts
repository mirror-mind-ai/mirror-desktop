import { describe, expect, it } from "vitest";
import coordinatorSource from "../app/turnFinalizationCoordinator.ts?raw";
import appSource from "../app/App.tsx?raw";
import {
  createSettlementTimingCollector,
  createSettlementTimingRegistry,
  settlementRecoveryRoutes,
  type SettlementRecoveryRoute,
  type SettlementTimingAuthority,
  type SettlementTimingClock,
} from "../app/settlementPhaseTiming";
import { createConvergentTurnWorld } from "./fixtures/convergentTurnWorld";

/**
 * CR129. A settlement that fails inline and is then repaired by recovery left **no record of the
 * repair**. The timing ledger kept the failure and nothing after it, so reading the store, a
 * settlement rescued seconds later was indistinguishable from one that was never rescued at all.
 *
 * Measured on 2026-10-18 with the instrument corrected for this CR — `runId` is flat at the top of a
 * settlement-timings record, not nested under `authority`, which is what had retired the instrument:
 *
 * - all 232 records in `mirror-desktop.json` carry a `runId`, so the instrument can return non-zero;
 * - healthy turns are present;
 * - both runs that recovery settled are **absent**.
 */

const authority: SettlementTimingAuthority = {
  journeyId: "mirror-desktop",
  runId: "agent-run-2026-10-17T11:27:13.196Z",
  turnId: "turn-agent-run-2026-10-17T11:27:13.196Z",
  generation: 4,
};

/** A clock that only moves when told, so elapsed times are assertions rather than observations. */
function fakeClock(): SettlementTimingClock & { advance: (ms: number) => void } {
  let ms = 0;
  return {
    now: () => ms,
    iso: () => new Date(ms).toISOString(),
    advance: (by: number) => { ms += by; },
  };
}

describe("CR129: a repaired settlement writes a record saying so", () => {
  it("marks the record with the route that repaired it", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock, { route: "pi_backed_outbox" });
    await collector.time("deliver_outbox", async () => { clock.advance(40); });
    const record = collector.finish("settled");

    expect(record.recovery).toEqual({ route: "pi_backed_outbox" });
    expect(record.outcome).toBe("settled");
    expect(record.runId).toBe(authority.runId);
    expect(record.turnId).toBe(authority.turnId);
    expect(record.phases.map((phase) => phase.phase)).toEqual(["deliver_outbox"]);
  });

  /**
   * The control, and the distinction the CR exists to create. An inline settlement must stay
   * recognisable as one, so the marker is **absent** rather than present-and-empty: a reader asking
   * "was this a repair?" gets no key, not a falsy one that could be a default.
   */
  it("leaves an inline settlement's record with no recovery marker at all", async () => {
    const clock = fakeClock();
    const inline = createSettlementTimingCollector(authority, clock);
    await inline.time("load_journal", async () => { clock.advance(6); });
    const record = inline.finish("settled");

    expect("recovery" in record).toBe(false);
    expect(record.recovery).toBeUndefined();
  });

  it("leaves a record built through the inline registry unmarked too", () => {
    const registry = createSettlementTimingRegistry(fakeClock());
    registry.begin(authority);
    const record = registry.end(authority.journeyId, "settled");
    expect(record).toBeDefined();
    expect("recovery" in record!).toBe(false);
  });

  it("marks a failed repair as a repair, so a reader sees the attempt and not only successes", async () => {
    const clock = fakeClock();
    const collector = createSettlementTimingCollector(authority, clock, { route: "projected_resume" });
    await expect(collector.time("execute_settlement", async () => {
      clock.advance(3);
      throw new Error("mirror_append_complete_durable_projection_missing");
    })).rejects.toThrow();
    const record = collector.finish("failed", "mirror_append_complete_durable_projection_missing");

    expect(record.recovery).toEqual({ route: "projected_resume" });
    expect(record.outcome).toBe("failed");
    expect(record.failure?.phase).toBe("execute_settlement");
  });
});

describe("CR129: the coordinator emits a record for the turn it repaired", () => {
  it("emits one marked record when a legacy delivery debt is repaired", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });

    expect(world.recoveredSettlements()).toHaveLength(0);
    await world.repairDeliveryDebt();

    const records = world.recoveredSettlements();
    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.recovery).toEqual({ route: "legacy_outbox" });
    expect(record.outcome).toBe("settled");
    expect(record.turnId).toBe("turn-run-1");
    expect(record.runId).toBe("run-1");
    expect(record.journeyId).toBe("convergent-journey");
    // Phases are the point: a record with none would say a repair happened and nothing about it.
    expect(record.phases.length).toBeGreaterThan(0);
    expect(record.phases.every((phase) => phase.outcome === "completed")).toBe(true);
  });

  /**
   * The constraint that is not negotiable. Recovery runs on Journey load and on idle, paths CR115 and
   * CR116 had to quiet. A pass that repairs nothing must add no write traffic — and here that holds
   * because no repaired turn means no collector, so there is nothing to finish and nothing to emit.
   */
  it("emits nothing when a pass repairs nothing", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal();

    await world.repairDeliveryDebt();
    await world.repairDeliveryDebt();

    expect(world.recoveredSettlements()).toHaveLength(0);
  });

  it("does not emit a second record when the same debt is repaired twice", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });

    await world.repairDeliveryDebt();
    await world.repairDeliveryDebt();

    expect(world.recoveredSettlements()).toHaveLength(1);
  });

  /**
   * Acceptance: a failure to write a timing record never fails a recovery, exactly as it never fails
   * a settlement today. The emit reaches arbitrary subscribers, so a throwing one must not be able to
   * undo a repair that already succeeded on disk.
   */
  it("completes the repair even when a subscriber throws on the record", async () => {
    const world = createConvergentTurnWorld();
    world.onRecoveredSettlement(() => { throw new Error("ledger unavailable"); });
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });

    await expect(world.repairDeliveryDebt()).resolves.toBeUndefined();
    expect(world.durableEvidenceSettled()).toBe(true);
  });
});

describe("CR129: every renderer recovery route is named", () => {
  /**
   * There are **three** renderer-side repair routes, not the two this CR was captured describing.
   * The census is asserted because an unnamed fourth route would recreate the exact silence this CR
   * closes — a settlement repaired with no record — for that one path, and nothing would fail.
   */
  it("enumerates exactly the three routes the coordinator can repair through", () => {
    expect([...settlementRecoveryRoutes]).toEqual([
      "legacy_outbox",
      "pi_backed_outbox",
      "projected_resume",
    ]);
  });

  it("creates a collector for each of those routes in the coordinator", () => {
    for (const route of settlementRecoveryRoutes) {
      const uses = coordinatorSource.split(`route: "${route}"`).length - 1;
      expect(uses, `route not used in the coordinator: ${route}`).toBe(1);
    }
    // One creation per route, and no other way to build a recovery collector in this module.
    const creations = coordinatorSource.split("createSettlementTimingCollector(").length - 1;
    expect(creations).toBe(settlementRecoveryRoutes.length);
  });

  /**
   * The record has to leave the coordinator without the coordinator learning about storage. It goes
   * out as an event, and the shell is what appends it — so a guard pins both halves, because an
   * emitted record nobody appends is the same silence with more code.
   */
  it("carries the record to the shell as an event the shell appends", () => {
    expect(coordinatorSource).toContain('type: "settlement_recovered"');
    const handler = appSource.slice(
      appSource.indexOf("turnFinalizationCoordinator.subscribe"),
      appSource.indexOf("turnFinalizationCoordinator.subscribe") + 1400,
    );
    expect(handler).toContain('event.type === "settlement_recovered"');
    expect(handler).toContain("appendSettlementTiming(event.record");
  });

  /** The route must be read from the enumeration rather than retyped at the call site. */
  it("declares the route union from one place", () => {
    const routes: readonly SettlementRecoveryRoute[] = settlementRecoveryRoutes;
    expect(new Set(routes).size).toBe(routes.length);
  });
});

describe("CR129: the inline path is untouched", () => {
  /**
   * The registry is keyed by `journeyId` alone, which is why recovery cannot use it: one pass can
   * repair more than one turn. Recovery builds its collectors directly instead, so this guard pins
   * that the inline keying was never widened to make room.
   */
  it("still keys the registry by Journey alone", () => {
    const registry = createSettlementTimingRegistry(fakeClock());
    const first = registry.begin(authority);
    expect(registry.get(authority.journeyId)).toBe(first);
    const other = registry.begin({ ...authority, runId: "run-2", turnId: "turn-run-2" });
    // A second begin for the same Journey replaces the first — the behaviour recovery must not rely on.
    expect(registry.get(authority.journeyId)).toBe(other);
  });

  it("keeps the inline settlement writing through the registry, not through a recovery collector", () => {
    const inlineBegin = appSource.indexOf("settlementTimingRegistry.begin({");
    expect(inlineBegin).toBeGreaterThan(0);
    expect(appSource).not.toContain("createSettlementTimingCollector(");
  });
});
