import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComposerRuntimeStatus } from "../app/ComposerRuntimeFooter";
import { FINISHING_PHASE_VISIBLE_AFTER_MS } from "../app/settlementPhaseTiming";
import appSource from "../app/App.tsx?raw";

// CR119 slice 3: `Finishing` names the phase it is in once a wait has visibly begun. A fast turn
// must render exactly as it did before this CR, so the phase is withheld until the threshold.

describe("Finishing names its phase", () => {
  it("renders exactly as before when no phase is known", () => {
    const html = renderToStaticMarkup(<ComposerRuntimeStatus status="finishing" />);
    expect(html).toContain("<strong>Finishing</strong>");
    expect(html).not.toContain("composer-runtime-phase");
  });

  it("withholds the phase until the wait has visibly begun", () => {
    const since = 10_000;
    const early = renderToStaticMarkup(
      <ComposerRuntimeStatus
        status="finishing"
        finishingPhase={{ phase: "publish_segments", since }}
        now={since + FINISHING_PHASE_VISIBLE_AFTER_MS - 1}
      />,
    );
    expect(early).not.toContain("composer-runtime-phase");

    const late = renderToStaticMarkup(
      <ComposerRuntimeStatus
        status="finishing"
        finishingPhase={{ phase: "publish_segments", since }}
        now={since + FINISHING_PHASE_VISIBLE_AFTER_MS}
      />,
    );
    expect(late).toContain("<strong>Finishing</strong>");
    expect(late).toContain('<span class="composer-runtime-phase">publishing chapters</span>');
  });

  it("never names a phase while Working, because the phase belongs to settlement only", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeStatus
        status="working"
        finishingPhase={{ phase: "publish_segments", since: 0 }}
        now={99_000}
      />,
    );
    expect(html).toContain("<strong>Working</strong>");
    expect(html).not.toContain("composer-runtime-phase");
  });

  it("the app times every settlement port, times the steps inside saving a projection, and writes once", () => {
    expect(appSource).toContain("timeFinalizationPorts(");
    expect(appSource).toContain("settlementTimingRegistry.begin(");
    expect(appSource).toContain("settlementTimingRegistry.end(");
    for (const phase of ["save_durable_projection", "refresh_segments", "load_segments", "publish_segments", "reconcile_catalog"]) {
      expect(appSource).toContain(`"${phase}"`);
    }
    // One write per settled turn, after the record is complete — never from inside a phase.
    //
    // CR132 re-aimed the count from 1 to 2. The second call site is the Navigator ending a wait
    // that will not end, which is also after the record is complete and also outside every phase.
    // The two cannot both write for one turn: `registry.end` deletes the collector, so whichever
    // runs first produces the record and the other receives `undefined`. That mutual exclusion is
    // guarded behaviourally in `settlementAbandonment.test.ts` rather than by counting here.
    expect(appSource.match(/appendSettlementTiming\(/g)?.length).toBe(2);
    expect(appSource).toContain("finishingPhase={");
  });
});
