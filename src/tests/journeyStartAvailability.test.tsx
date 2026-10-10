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
import { journeyWorkspace } from "../app/journeyWorkspaceKey";
import appSource from "../app/App.tsx?raw";

// CR138: admission takes a workspace. The sentences under test are Journey-grained and stay
// so, because the native admission grain is still the Journey.
function workspaceOf(journeyId: string) {
  return journeyWorkspace(journeyId, `${journeyId}-thread`);
}

// CR141: an optional thread so a test can fill a Journey's share with siblings. A caller passing
// one argument keeps the exact identity it had, as `readyThread` does for the same reason.
function lease(journeyId: string, thread?: string): PiInvocationLeaseInspection {
  const identity = thread ? `${journeyId}-${thread}` : journeyId;
  return {
    authority: {
      schemaVersion: "0.1.0",
      journeyId,
      runId: `${identity}-run`,
      turnId: `${identity}-turn`,
      threadId: `${identity}-thread`,
      generation: 1,
      piSessionId: `${identity}-session`,
      mirrorConversationId: `${identity}-conversation`,
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
    journeyWorkspaceShare: 3,
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
    const elsewhere = derivePiInvocationAdmission(occupancy([lease("mirror-desktop")]), workspaceOf("vida-tecnica"));

    expect(elsewhere.allowed).toBe(true);
    expect(journeyStartAvailability({ ...ready, nativeAdmission: elsewhere })).toEqual({ canStart: true });
  });

  it("still waits when native capacity is genuinely exhausted", () => {
    const full = derivePiInvocationAdmission(occupancy([lease("mirror-desktop")], 1), workspaceOf("vida-tecnica"));

    expect(full).toEqual({ allowed: false, reason: "global_capacity_reached" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: full })).toEqual({
      canStart: false,
      // CR140: one sentence now serves both surfaces, so the not-started one gained the clause the
      // Composer's capacity notice always carried. A widening, deliberately: the claim about where
      // capacity authority lives is true on both surfaces, and two sentence sets for one refusal
      // is how they drifted apart in the first place.
      unavailableReason: "All native Pi slots are in use. Starting becomes available once one is free. Native admission remains the atomic capacity authority.",
      waiting: true,
    });
  });

  it("names a bounded inspection as waiting rather than as a refusal", () => {
    const unknown = derivePiInvocationAdmission(createUnknownPiInvocationOccupancy(), workspaceOf("vida-tecnica"));

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

  // CR140: `workspaceOf` and `lease` share a thread, so this is the Journey's own workspace asking
  // about itself. The verdict is unchanged and the reason sharpened from the Journey to the
  // workspace, which is the whole point of RS024: a sibling would now be admitted.
  it("reports this workspace's own native work rather than a generic refusal", () => {
    const same = derivePiInvocationAdmission(occupancy([lease("vida-tecnica")]), workspaceOf("vida-tecnica"));

    expect(same).toEqual({ allowed: false, reason: "same_workspace_occupied" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: same }).unavailableReason)
      .toBe("This conversation already has native work in progress.");
  });

  /**
   * Twice re-aimed, never deleted. CR140 flipped the grain and the field refused the sibling one
   * layer lower, inside `piProcessEventDispatcher.register`, after Send had been accepted — so the
   * refusal came back here as a sentence. **CR141 re-keyed the transport**, so the sibling is
   * admitted for real: the registry allows it, the pre-check allows it, and the route it will be
   * delivered on is its own.
   */
  it("admits a sibling workspace now that the event route is keyed by workspace", () => {
    const sibling = derivePiInvocationAdmission(
      occupancy([lease("vida-tecnica")]),
      journeyWorkspace("vida-tecnica", "vida-tecnica-other-thread"),
    );

    expect(sibling).toEqual({ allowed: true, reason: null });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: sibling })).toEqual({ canStart: true });
  });

  /**
   * CR141 Stage B retired the companion case holding the Journey-grain sentence: the field
   * produced the claim it was waiting for on 2026-10-10, so the alternative it protected is gone.
   * Its property — that a refusal inside a Journey still arrives as a sentence rather than as a
   * transport exception — is re-asserted here on the refusal that remains.
   */
  it("still refuses with a sentence once the Journey's whole share is live", () => {
    const full = derivePiInvocationAdmission(
      occupancy([lease("vida-tecnica"), lease("vida-tecnica", "t2"), lease("vida-tecnica", "t3")]),
      journeyWorkspace("vida-tecnica", "vida-tecnica-fourth-thread"),
    );

    expect(full).toEqual({ allowed: false, reason: "journey_share_exceeded" });
    expect(journeyStartAvailability({ ...ready, nativeAdmission: full }).unavailableReason)
      .toContain("This Journey is already running as much work as it can at once");
  });
});

describe("CR107 — the not-started surface never withholds the action silently", () => {
  it("shows the action disabled with its reason instead of removing it", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, {
      journeyName: "Vida Técnica",
      state: { kind: "absent" },
      startUnavailableReason: "All native Pi slots are in use. Starting becomes available once one is free. Native admission remains the atomic capacity authority.",
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
