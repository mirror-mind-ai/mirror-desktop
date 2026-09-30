import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";
import {
  createEmptyJourneyRuntime,
  createInitialJourneyRuntimeState,
  hasActiveOrFinalizingJourneyRuntime,
} from "../app/journeyRuntimeState";
import {
  createUnknownPiInvocationOccupancy,
  hasBlockingPiInvocationOccupancy,
} from "../app/piInvocationOccupancy";
import appSource from "../app/App.tsx?raw";

/**
 * CR107 characterisation. These tests pin the *current* behaviour that strands an existing
 * Journey on the not-started surface. They describe the mechanism proven by the diagnosis and
 * are expected to be revised by the CR107 repair once its recovery shape is authorised.
 */
describe("CR107 characterisation — why an existing Journey cannot be started", () => {
  it("offers no start action and no reason when the start callback is withheld", () => {
    // The `absent` surface is the Journey's only surface, and it degrades silently: with no
    // `onStart` there is neither a button nor any statement of what is blocking the start.
    const stranded = renderToStaticMarkup(createElement(JourneyThreadState, {
      journeyName: "Vida Técnica",
      state: { kind: "absent" },
    }));

    expect(stranded).toContain("This Journey has not started in Mirror Desktop");
    expect(stranded).not.toContain("Start this Journey");
    expect(stranded).not.toContain("Retry starting this Journey");
    // Nothing on the surface explains the withheld action.
    expect(stranded).not.toContain("busy");
    expect(stranded).not.toContain("Runtime Settings");
  });

  it("treats a run in an unrelated Journey as global busy", () => {
    // `runtimeBusy` is not scoped to the selected Journey, so work anywhere makes every
    // not-started Journey unstartable.
    const elsewhere = createEmptyJourneyRuntime("mirror-desktop");
    const state = {
      ...createInitialJourneyRuntimeState(),
      entries: { "mirror-desktop": { ...elsewhere, isStreaming: true } },
    };

    expect(hasActiveOrFinalizingJourneyRuntime(state)).toBe(true);
  });

  it("treats unresolved native occupancy as global busy", () => {
    // The initial state, every reconciliation window, and a failed inspection all report
    // `status !== "known"`, which blocks the start of every Journey.
    expect(hasBlockingPiInvocationOccupancy(createUnknownPiInvocationOccupancy())).toBe(true);
  });

  it("gates the start action on global busy while hiding every explanation", () => {
    // The start callback is withheld on global `runtimeBusy`...
    expect(appSource).toContain(
      'onStart={journeyThreadState.kind === "absent" && !runtimeBusy && runtimeBindingReady',
    );
    // ...while the notices that would have explained it live in the composer, which is hidden
    // for exactly the state in which the Journey has not started.
    expect(appSource).toContain(
      'hidden={!operationalChatSelected || selectedConversationSpace.kind === "mirror_history" || journeyThreadState.kind !== "ready"}',
    );
    expect(appSource).toContain("Connect and validate a Mirror installation in Runtime Settings");
  });
});
