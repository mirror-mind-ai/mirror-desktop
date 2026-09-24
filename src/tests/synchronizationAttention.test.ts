import { describe, expect, it } from "vitest";
import {
  SYNCHRONIZATION_FAILURE_PERSISTENCE_MS,
  beginSynchronizationAttempt,
  deriveSynchronizationAttention,
  recordSynchronizationAttempt,
  type JourneySynchronizationLedger,
} from "../domain/synchronizationAttention";

const t0 = Date.parse("2026-09-24T12:00:00.000Z");
const at = (offsetMs: number) => new Date(t0 + offsetMs).toISOString();

function failedTwice(): JourneySynchronizationLedger {
  let ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "mirror_append_item_conflict", at: at(0) });
  ledger = recordSynchronizationAttempt(ledger, { kind: "failed", reason: "mirror_append_item_conflict", at: at(1_000) });
  return ledger;
}

describe("synchronization attention gate", () => {
  it("stays silent on a single failed attempt while durable debt is fresh", () => {
    const ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "mirror_append_item_conflict", at: at(0) });
    const attention = deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(500) });
    expect(attention).toMatchObject({ attention: false });
  });

  it("stays silent while a first attempt is in flight", () => {
    const ledger = beginSynchronizationAttempt(undefined);
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(0) })).toEqual({ attention: false });
  });

  it("surfaces attention after two consecutive failed attempts with durable debt", () => {
    const attention = deriveSynchronizationAttention({ durableDebt: true, ledger: failedTwice(), now: at(1_500) });
    expect(attention).toEqual({ attention: true, reason: "mirror_append_item_conflict" });
  });

  it("surfaces attention when one failure persists past the bounded window", () => {
    const ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "mirror_append_outbox_full", at: at(0) });
    expect(deriveSynchronizationAttention({
      durableDebt: true, ledger, now: at(SYNCHRONIZATION_FAILURE_PERSISTENCE_MS - 1),
    })).toMatchObject({ attention: false });
    expect(deriveSynchronizationAttention({
      durableDebt: true, ledger, now: at(SYNCHRONIZATION_FAILURE_PERSISTENCE_MS),
    })).toEqual({ attention: true, reason: "mirror_append_outbox_full" });
  });

  it("never surfaces attention without durable debt, even after repeated failures", () => {
    expect(deriveSynchronizationAttention({ durableDebt: false, ledger: failedTwice(), now: at(5_000) }))
      .toEqual({ attention: false });
  });

  it("clears every failure on success so a later single failure starts fresh", () => {
    let ledger = failedTwice();
    ledger = recordSynchronizationAttempt(ledger, { kind: "succeeded", at: at(2_000) });
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(2_500) })).toEqual({ attention: false });
    ledger = recordSynchronizationAttempt(ledger, { kind: "failed", reason: "later", at: at(3_000) });
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(3_500) })).toMatchObject({ attention: false });
  });

  it("treats a deferred attempt as neither failure nor success", () => {
    let ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "first", at: at(0) });
    ledger = recordSynchronizationAttempt(ledger, { kind: "deferred", at: at(1_000) });
    expect(ledger.consecutiveFailures).toBe(1);
    expect(ledger.firstFailureAt).toBe(at(0));
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(1_500) })).toMatchObject({ attention: false });
  });

  it("keeps attention visible while a retry is in flight after persistent failure", () => {
    const ledger = beginSynchronizationAttempt(failedTwice());
    expect(ledger.inFlight).toBe(true);
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(2_000) }))
      .toEqual({ attention: true, reason: "mirror_append_item_conflict" });
  });

  it("defers age-based attention while a retry of a single failure is in flight", () => {
    let ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "first", at: at(0) });
    ledger = beginSynchronizationAttempt(ledger);
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(60_000) }))
      .toEqual({ attention: false });
    ledger = recordSynchronizationAttempt(ledger, { kind: "succeeded", at: at(60_100) });
    expect(deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(60_200) }))
      .toEqual({ attention: false });
  });

  it("surfaces an evidence store read failure without derived debt", () => {
    let ledger = recordSynchronizationAttempt(undefined, {
      kind: "failed", reason: "mirror_append_outbox_unavailable", at: at(0), evidenceUnavailable: true,
    });
    ledger = recordSynchronizationAttempt(ledger, {
      kind: "failed", reason: "mirror_append_outbox_unavailable", at: at(1_000), evidenceUnavailable: true,
    });
    expect(deriveSynchronizationAttention({ durableDebt: false, ledger, now: at(1_500) }))
      .toEqual({ attention: true, reason: "mirror_append_outbox_unavailable" });
  });

  it("reports when a pending single failure will become attention so the caller can re-evaluate", () => {
    const ledger = recordSynchronizationAttempt(undefined, { kind: "failed", reason: "first", at: at(0) });
    const attention = deriveSynchronizationAttention({ durableDebt: true, ledger, now: at(2_000) });
    expect(attention).toEqual({ attention: false, reevaluateAt: at(SYNCHRONIZATION_FAILURE_PERSISTENCE_MS) });
  });
});
