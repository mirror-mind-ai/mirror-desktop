import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettlementAbandonmentNotice } from "../app/SettlementAbandonmentNotice";
import {
  ABANDON_SETTLEMENT_OFFER_AFTER_MS,
  SETTLEMENT_ABANDONMENT_REFUSALS,
  settlementAbandonmentOffer,
  settlementAbandonmentPresentation,
} from "../app/settlementAbandonment";

/**
 * CR155 slice 1 (RS025 Batch A): the refusal `settlementAbandonmentOffer` already computes is
 * named to the Navigator instead of drawn as silence.
 *
 * Field, 2026-10-16, production alpha.50: a turn's journal froze at `running`, occupancy was never
 * released, and the Navigator sat in front of "Finishing" for minutes with no sentence and no exit.
 * Every layer refused correctly. None said so. The guard that passed while covering that silence
 * asserted `html === ""` for `native_execution_active`; it is narrowed here to the claim that was
 * actually load-bearing — no exit is offered — and the naming is asserted beside it.
 */

const since = 1_000;
const pastThreshold = since + ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_400;
const base = {
  finishing: { source: "settlement" as const, since },
  nativeExecutionActive: false,
  occupancyKnown: true,
};

describe("CR155: the refusal is named once the wait is long enough to have earned an offer", () => {
  it("names native execution as the reason once past the threshold, and still offers no exit", () => {
    const presentation = settlementAbandonmentPresentation({ ...base, nativeExecutionActive: true, now: pastThreshold });
    expect(presentation.kind).toBe("refusal_named");
    if (presentation.kind !== "refusal_named") return;
    expect(presentation.reason).toBe("native_execution_active");
    expect(presentation.waitedMs).toBe(ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_400);
    expect(presentation.sentence).toContain("still records the agent as executing");
    // The decision itself is unchanged: the offer authority still refuses.
    expect(settlementAbandonmentOffer({ ...base, nativeExecutionActive: true, now: pastThreshold }))
      .toEqual({ offered: false, reason: "native_execution_active" });
  });

  it("names unknown occupancy as the reason once past the threshold", () => {
    const presentation = settlementAbandonmentPresentation({ ...base, occupancyKnown: false, now: pastThreshold });
    expect(presentation.kind).toBe("refusal_named");
    if (presentation.kind !== "refusal_named") return;
    expect(presentation.reason).toBe("occupancy_unknown");
    expect(presentation.sentence).toContain("cannot tell whether the agent is still executing");
  });

  /**
   * The negative case RS025 requires of every CR. A healthy turn finalizes with its native lease
   * briefly still active; naming the refusal there would put a sentence in front of every ordinary
   * turn. The naming waits exactly as long as the offer would have.
   */
  it("stays silent for a refusal before the threshold, so a healthy finishing turn acquires no sentence", () => {
    for (const input of [
      { ...base, nativeExecutionActive: true },
      { ...base, occupancyKnown: false },
    ]) {
      expect(settlementAbandonmentPresentation({ ...input, now: since + 3_000 })).toEqual({ kind: "silent", reason: expect.any(String) });
      expect(settlementAbandonmentPresentation({ ...input, now: since + ABANDON_SETTLEMENT_OFFER_AFTER_MS })).toEqual({ kind: "silent", reason: expect.any(String) });
    }
  });

  it("stays silent when the owner is not finalizing or no finishing start is known", () => {
    expect(settlementAbandonmentPresentation({ ...base, finishing: undefined, nativeExecutionActive: true, now: pastThreshold }))
      .toEqual({ kind: "silent", reason: "not_finishing" });
    expect(settlementAbandonmentPresentation({ ...base, finishing: { source: "settlement" as const, since: undefined }, nativeExecutionActive: true, now: pastThreshold }))
      .toEqual({ kind: "silent", reason: "native_execution_active" });
  });

  it("passes the offer through unchanged when it is made", () => {
    expect(settlementAbandonmentPresentation({ ...base, now: pastThreshold }))
      .toEqual({ kind: "offer", waitedMs: ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_400 });
  });

  /**
   * The allow-list that replaces the guard which passed while covering one element of silence. It
   * iterates the refusal union itself rather than the cases the author expected, so a fifth refusal
   * added later fails here until it is either named or deliberately listed as silent.
   */
  it("accounts for every refusal in the union past the threshold: named, or deliberately silent", () => {
    expect(SETTLEMENT_ABANDONMENT_REFUSALS.length).toBeGreaterThanOrEqual(4);
    // CR161: `not_finishing` stays silent because it can no longer be returned while the composer
    // says *Finishing* — the offer reads the composer's own derivation. Before CR161 it could, and
    // this very listing is what kept the 2026-10-17 occurrence silent. The exhaustive guard in
    // `cr161FinishingSources.test.ts` is what now makes this line true rather than assumed.
    const deliberatelySilent = new Set(["not_finishing", "too_soon"]);
    const inputFor = (reason: string) => {
      switch (reason) {
        case "not_finishing": return { ...base, finishing: undefined };
        case "occupancy_unknown": return { ...base, occupancyKnown: false };
        case "native_execution_active": return { ...base, nativeExecutionActive: true };
        case "too_soon": return { ...base, finishing: { source: "settlement" as const, since: undefined } };
        default: throw new Error(`no fixture for refusal ${reason}; add one or this guard is blind to it`);
      }
    };
    for (const reason of SETTLEMENT_ABANDONMENT_REFUSALS) {
      const offer = settlementAbandonmentOffer({ ...inputFor(reason), now: pastThreshold });
      expect(offer).toEqual({ offered: false, reason });
      const presentation = settlementAbandonmentPresentation({ ...inputFor(reason), now: pastThreshold });
      if (deliberatelySilent.has(reason)) {
        expect(presentation).toEqual({ kind: "silent", reason });
      } else {
        expect(presentation.kind).toBe("refusal_named");
      }
    }
  });
});

describe("CR155: the notice draws the named refusal", () => {
  it("names native execution after the threshold, with the wait, and without a button", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} nativeExecutionActive onStopWaiting={() => {}} now={pastThreshold} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("Still finishing after 62s");
    expect(html).toContain("still records the agent as executing");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Stop waiting");
  });

  it("names unknown occupancy after the threshold, without a button", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} occupancyKnown={false} onStopWaiting={() => {}} now={pastThreshold} />,
    );
    expect(html).toContain("cannot tell whether the agent is still executing");
    expect(html).not.toContain("<button");
  });

  it("draws nothing for a refusal before the threshold", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} nativeExecutionActive onStopWaiting={() => {}} now={since + 5_000} />,
    );
    expect(html).toBe("");
  });

  // Control: the native-execution sentence must not leak into the ordinary offer.
  it("keeps the offer exactly as CR132 made it when no refusal applies", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} onStopWaiting={() => {}} now={pastThreshold} />,
    );
    expect(html).toContain("Stop waiting");
    expect(html).not.toContain("still records the agent as executing");
    expect(html).not.toContain("cannot tell whether");
  });
});
