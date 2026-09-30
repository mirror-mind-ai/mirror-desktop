import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";
import { journeyStartAvailability } from "../app/journeyStartAvailability";
import {
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  type PiInvocationLeaseInspection,
  type PiInvocationOccupancyState,
} from "../app/piInvocationOccupancy";
import appSource from "../app/App.tsx?raw";

function lease(journeyId: string): PiInvocationLeaseInspection {
  return {
    authority: {
      schemaVersion: "0.1.0",
      journeyId,
      runId: `${journeyId}-run`,
      turnId: `${journeyId}-turn`,
      threadId: `${journeyId}-thread`,
      generation: 1,
      piSessionId: `${journeyId}-session`,
      mirrorConversationId: `${journeyId}-conversation`,
      harnessUserMessageId: `${journeyId}-user`,
      harnessAssistantMessageId: `${journeyId}-assistant`,
    },
    leasePhase: "running",
    processCapacityState: "running",
    cancellationState: "none",
    terminalState: "open",
  };
}

function occupancy(entries: PiInvocationLeaseInspection[], limit: 1 | 2 | 4 = 2): PiInvocationOccupancyState {
  return {
    status: "known",
    requestId: 1,
    limit,
    processCapacityInUse: entries.length,
    entries,
    diagnostic: null,
  };
}

const ready = { runtimeBindingReady: true, nativeAdmission: { allowed: true, reason: null } as const };

describe("CR107 — starting a Journey that has not started yet", () => {
  it("offers the start when the runtime is bound and native admission allows it", () => {
    expect(journeyStartAvailability(ready)).toEqual({ canStart: true });
  });

  it("does not let work in an unrelated Journey block the start", () => {
    // The defect this CR repairs: a global busy flag made every not-started Journey
    // unstartable while any other Journey worked. Native admission is Journey-aware, so a
    // lease elsewhere only matters through real capacity.
    const elsewhere = derivePiInvocationAdmission(occupancy([lease("mirror-desktop")]), "vida-tecnica");

    expect(elsewhere.allowed).toBe(true);
    expect(journeyStartAvailability({ ...ready, nativeAdmission: elsewhere })).toEqual({ canStart: true });
  });

  it("still waits when native capacity is genuinely exhausted", () => {
    const full = derivePiInvocationAdmission(occupancy([lease("mirror-desktop")], 1), "vida-tecnica");

    expect(full).toEqual({ allowed: false, reason: "global_capacity_reached" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: full })).toEqual({
      canStart: false,
      unavailableReason: "All native Pi slots are in use. Starting becomes available once one is free.",
      waiting: true,
    });
  });

  it("names a bounded inspection as waiting rather than as a refusal", () => {
    const unknown = derivePiInvocationAdmission(createUnknownPiInvocationOccupancy(), "vida-tecnica");

    expect(unknown).toEqual({ allowed: false, reason: "inspection_unknown" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: unknown })).toEqual({
      canStart: false,
      unavailableReason: "Checking native operation occupancy before starting.",
      waiting: true,
    });
  });

  it("asks for a validated runtime binding before anything native", () => {
    // Actionable by the Navigator, so it is not presented as waiting.
    expect(journeyStartAvailability({ ...ready, runtimeBindingReady: false })).toEqual({
      canStart: false,
      unavailableReason: "Connect and validate a Mirror installation in Runtime Settings to start this Journey.",
      waiting: false,
    });
  });

  it("reports this Journey's own native work rather than a generic refusal", () => {
    const same = derivePiInvocationAdmission(occupancy([lease("vida-tecnica")]), "vida-tecnica");

    expect(same).toEqual({ allowed: false, reason: "same_journey_occupied" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: same }).unavailableReason)
      .toBe("This Journey already has native work in progress.");
  });
});

describe("CR107 — the not-started surface never withholds the action silently", () => {
  it("shows the action disabled with its reason instead of removing it", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, {
      journeyName: "Vida Técnica",
      state: { kind: "absent" },
      startUnavailableReason: "All native Pi slots are in use. Starting becomes available once one is free.",
    }));

    expect(html).toContain("This Journey has not started in Mirror Desktop");
    expect(html).toContain("Start this Journey");
    expect(html).toContain("disabled");
    expect(html).toContain("All native Pi slots are in use");
  });

  it("keeps the action live when nothing is blocking it", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, {
      journeyName: "Vida Técnica",
      state: { kind: "absent" },
      onStart: () => undefined,
    }));

    expect(html).toContain("Start this Journey");
    expect(html).not.toContain("disabled");
  });

  it("stops gating the start on the global busy flag", () => {
    // The reason must reach the surface, because every notice that could have explained it
    // lives in the composer, which is hidden while the Journey has not started.
    expect(appSource).toContain("journeyStartAvailability(");
    expect(appSource).toContain("startUnavailableReason=");
    expect(appSource).not.toContain('journeyThreadState.kind === "absent" && !runtimeBusy && runtimeBindingReady');
  });
});
