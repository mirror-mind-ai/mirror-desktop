import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettlementAbandonmentNotice } from "../app/SettlementAbandonmentNotice";
import { ABANDON_SETTLEMENT_OFFER_AFTER_MS } from "../app/settlementAbandonment";
import appSource from "../app/App.tsx?raw";
import noticeSource from "../app/SettlementAbandonmentNotice.tsx?raw";
import abandonmentSource from "../app/settlementAbandonment.ts?raw";

// CR149: the clock that decides CR132's offer lives where its output is drawn. These tests bound
// two things: that the notice still says exactly what CR132 made it say, and that the App root no
// longer advances state once per second while the Navigator is typing.

const since = 1_000;
const base = {
  ownerPhase: "finalizing" as const,
  nativeExecutionActive: false,
  occupancyKnown: true,
  finishingSince: since,
  onStopWaiting: () => {},
};

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("CR149: the notice that offers to stop waiting", () => {
  it("renders nothing before the threshold", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} now={since + ABANDON_SETTLEMENT_OFFER_AFTER_MS} />,
    );
    expect(html).toBe("");
  });

  it("names the wait in seconds once the threshold is passed", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} now={since + ABANDON_SETTLEMENT_OFFER_AFTER_MS + 2_400} />,
    );
    expect(html).toContain("Still finishing after 62s");
    expect(html).toContain("Stop waiting");
    expect(html).toContain("Your answer is saved.");
  });

  it("counts a longer wait from the same start", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} now={since + 125_000} />,
    );
    expect(html).toContain("Still finishing after 125s");
  });

  /**
   * The load-bearing refusal of CR132. If this component ever answered it itself instead of asking
   * `settlementAbandonmentOffer`, an exit could appear while Pi may really be executing — which is
   * what CR115 and CR116 exist to prevent.
   */
  // CR155 narrowed this guard. It asserted `html === ""`, which was two claims in one: no exit is
  // offered (load-bearing, kept) and nothing is said (the silence the field reported on 2026-10-16).
  // Only the first survives; the naming is covered in `settlementAbandonmentRefusalNaming.test.tsx`.
  it("offers no exit while native execution is active, however long the wait", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} nativeExecutionActive now={since + 600_000} />,
    );
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Stop waiting");
  });

  it("offers no exit when occupancy is unknown", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} occupancyKnown={false} now={since + 600_000} />,
    );
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Stop waiting");
  });

  it("renders nothing when the owner is not finalizing", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} ownerPhase="running" now={since + 600_000} />,
    );
    expect(html).toBe("");
  });

  it("renders nothing when no finishing start is known", () => {
    const html = renderToStaticMarkup(
      <SettlementAbandonmentNotice {...base} finishingSince={undefined} now={since + 600_000} />,
    );
    expect(html).toBe("");
  });

  /**
   * The decision is not reimplemented here. Asserted positively on the call rather than by counting
   * absences, which would pass on an empty file.
   */
  it("asks the domain function rather than comparing the threshold itself", () => {
    const source = withoutComments(noticeSource);
    // CR155: the component reaches the decision through the presentation, the one place that
    // also says when a refusal is named. The chain is asserted end to end so the authority
    // cannot be bypassed one hop further out.
    expect(source).toContain("settlementAbandonmentPresentation({");
    expect(source).not.toContain("settlementAbandonmentOffer(");
    const presentation = withoutComments(abandonmentSource);
    const start = presentation.indexOf("export function settlementAbandonmentPresentation(");
    expect(start).toBeGreaterThan(-1);
    expect(presentation.slice(start)).toContain("const offer = settlementAbandonmentOffer(input);");
    expect(source).not.toContain("ABANDON_SETTLEMENT_OFFER_AFTER_MS");
  });

  it("stops its own clock when a test supplies the time", () => {
    const source = withoutComments(noticeSource);
    const watching = source.indexOf("const watching =");
    expect(watching).toBeGreaterThan(-1);
    const line = source.slice(watching, source.indexOf(";", watching));
    expect(line).toContain("now === undefined");
    expect(line).toContain('ownerPhase === "finalizing"');
  });
});

describe("CR149: the App root no longer keeps a per-second clock", () => {
  /**
   * The regression this guards is re-introducing a root-level clock for the offer. It is asserted on
   * the symbol and on the interval literal together, because either alone can be spelled around:
   * a different state name with the same interval, or the same name with a different interval.
   */
  it("holds no one-second interval and no finishing tick", () => {
    const source = withoutComments(appSource);
    expect(source).not.toContain("finishingTick");
    expect(source).not.toContain("setInterval(() => setFinishingTick");
  });

  /**
   * Every root interval is pinned with its period, so a new fast clock cannot arrive unnoticed.
   * Three remain and CR149 left all three deliberately:
   *
   * - `STRANDED_TURN_POLL_MS` (15 s) and 60 s — a 15th and a 60th of the clock this CR removed.
   * - **500 ms, which is twice as fast as the one removed** — and is gated on `voiceSession`, so it
   *   runs only while the Navigator is recording voice, which is not a state in which they are
   *   typing into the Composer. That gate is the whole reason it is out of scope; if it were
   *   ungated it would be a worse instance of this CR's own defect.
   *
   * This assertion failed when first written, because the 500 ms clock had been read earlier and
   * forgotten by the time the expectation was typed. The test was the defect, not the code.
   */
  it("pins every root interval, including one faster than the clock this CR removed", () => {
    const source = withoutComments(appSource);
    const intervals = [...source.matchAll(/setInterval\([^;]*?,\s*([A-Z_0-9]+|[\d_]+)\s*\)/g)]
      .map((match) => match[1]);
    expect(intervals.sort()).toEqual(["500", "60_000", "STRANDED_TURN_POLL_MS"]);
  });

  it("keeps the 500 ms clock gated on an active voice session", () => {
    const source = withoutComments(appSource);
    const timer = source.indexOf("setInterval(() => setVoiceElapsedSeconds");
    expect(timer).toBeGreaterThan(-1);
    const effectEnd = source.indexOf("}, [voiceSession]);", timer);
    expect(effectEnd).toBeGreaterThan(timer);
  });

  /**
   * The inputs are passed down whole, so the component and the act cannot disagree about which
   * workspace's lease was consulted.
   */
  it("passes one set of inputs to both the notice and the act", () => {
    const source = withoutComments(appSource);
    expect(source).toContain("const abandonSettlementInputs = {");
    expect(source).toContain("<SettlementAbandonmentNotice");
    expect(source).toContain("{...abandonSettlementInputs}");
  });

  /**
   * CR149's correctness claim: the act's guard is evaluated against the clock at the moment of the
   * act, not against whatever the last render believed. Sliced to `abandonSettlementWait`'s own body
   * so a `Date.now()` anywhere else in this very large file cannot satisfy it.
   */
  it("evaluates the act's guard at the instant of the act", () => {
    const start = appSource.indexOf("async function abandonSettlementWait(");
    expect(start).toBeGreaterThan(-1);
    const end = appSource.indexOf("\n  }\n", start) + 4;
    expect(end).toBeGreaterThan(start);
    const body = withoutComments(appSource.slice(start, end));
    expect(body).toContain("settlementAbandonmentOffer({ ...abandonSettlementInputs, now: Date.now() })");
    expect(body).not.toContain("finishingTick");
  });
});
