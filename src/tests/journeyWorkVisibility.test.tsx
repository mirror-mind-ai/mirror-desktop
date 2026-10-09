import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyAgentStatusIndicator } from "../app/JourneyAgentStatusIndicator";
import { journeyStartAvailability } from "../app/journeyStartAvailability";
import appSource from "../app/App.tsx?raw";
import indicatorSource from "../app/JourneyAgentStatusIndicator.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function render(props: Partial<Parameters<typeof JourneyAgentStatusIndicator>[0]> = {}) {
  return renderToStaticMarkup(<JourneyAgentStatusIndicator
    journeyName="Mirror Desktop"
    status="working"
    placement="sidebar"
    {...props}
  />);
}

describe("CR134: the indicator says whose work it is", () => {
  it("renders exactly as before when no locus is supplied", () => {
    const before = render();
    expect(before).toContain('role="status"');
    expect(before).toContain('aria-label="Mirror Desktop agent is working"');
    expect(before).not.toContain("journey-agent-status-container");
    expect(before).not.toContain("in a conversation");
    expect(before).toContain('r="5"');
  });

  it("nests the mark inside a containing contour when a conversation owns the work", () => {
    const inside = render({ locus: "inside" });
    expect(inside).toContain("journey-agent-status-container");
    expect(inside).toContain("locus-inside");
    expect(inside).toContain('aria-label="Mirror Desktop agent is working in a conversation"');
    // The distinction is topological: a smaller mark plus an outer boundary. Nothing here
    // depends on colour or on motion, which CR102 measured as carrying almost nothing.
    expect(inside).toContain('r="3"');
    expect(inside).toContain('r="8.4"');
    expect((inside.match(/<circle/g) ?? []).length).toBe(2);
    expect((render().match(/<circle/g) ?? []).length).toBe(1);
  });

  it("keeps finishing distinguishable from working in both loci", () => {
    const here = render({ status: "finishing" });
    const inside = render({ status: "finishing", locus: "inside" });
    expect(here).toContain("journey-agent-status-annulus");
    expect(here).not.toContain("is-nested");
    expect(inside).toContain("journey-agent-status-annulus is-nested");
    expect(inside).toContain("journey-agent-status-container");
    expect(inside).not.toBe(here);
  });

  // An unresolved owner still shows that work is running; it only withholds the claim about
  // which workspace owns it. Absence of the contour is not a claim of ownership.
  it("shows unresolved work without attributing it", () => {
    const unknown = render({ locus: "unknown" });
    expect(unknown).toContain("journey-agent-status-dot");
    expect(unknown).not.toContain("journey-agent-status-container");
    expect(unknown).not.toContain("in a conversation");
    expect(unknown).not.toContain("locus-inside");
  });

  it("does not attribute a terminal state to a workspace", () => {
    for (const status of ["finished", "interrupted", "failed"] as const) {
      const markup = render({ status, locus: "inside" });
      expect(markup).not.toContain("journey-agent-status-container");
      expect(markup).not.toContain("in a conversation");
    }
  });
});

describe("CR134: the signal leads to the work", () => {
  it("becomes a control in the sidebar when the owning conversation can be reached", () => {
    const markup = render({ locus: "inside", onNavigateToOwner: vi.fn() });
    expect(markup).toContain("<button");
    expect(markup).toContain('aria-label="Go to the conversation working in Mirror Desktop"');
    expect(markup).not.toContain('role="status"');
  });

  it("stays a plain signal in the header and without a route", () => {
    expect(render({ placement: "header", locus: "inside", onNavigateToOwner: vi.fn() })).toContain('role="status"');
    expect(render({ locus: "inside" })).toContain('role="status"');
    expect(render({ locus: "here", onNavigateToOwner: vi.fn() })).toContain('role="status"');
  });

  it("keeps its activation away from the row that selects", () => {
    expect(indicatorSource).toContain("event.stopPropagation();");
    expect(indicatorSource).toContain('if (event.key === "Enter" || event.key === " ") event.stopPropagation();');
  });

  it("reaches the owner without needing the conversation list to be visible", () => {
    const route = appSource.slice(
      appSource.indexOf("async function navigateToJourneyWorkOwner("),
      appSource.indexOf("\n  }\n", appSource.indexOf("async function navigateToJourneyWorkOwner(")) + 4,
    );
    expect(route).toContain("selectJourney(owner.journeyId");
    expect(route).toContain('type: "select_desktop"');
    expect(route).toContain('type: "select_root"');
    // Expansion is never required, which is what makes this work under a compact sidebar, an
    // unexpanded Journey and a CR135-hidden conversation alike.
    expect(route).not.toContain("dispatchConversationExpansion");
    for (const mutating of [/\bstart\w*\(/i, /\bprovision\w*\(/i, /\brestart\w*\(/i, /\bactivate\w*\(/i]) {
      expect(route.replace(/\/\/.*$/gm, "")).not.toMatch(mutating);
    }
  });
});

describe("CR134: the carrier survives every way a conversation can disappear", () => {
  it("keeps styling the Journey status when the sidebar collapses", () => {
    expect(cssSource).toContain(".sidebar-compact .journey-agent-status.placement-sidebar");
    expect(cssSource).toContain(".sidebar-compact .focused-conversation-sidebar");
    // The carrier is styled for the compact column; the conversation list is removed from it.
    expect(cssSource).toContain(".journey-agent-status-container");
  });

  it("gives the containing contour a stroke that survives the compact glyph size", () => {
    const block = cssSource.slice(
      cssSource.indexOf(".journey-agent-status-container {"),
      cssSource.indexOf("}", cssSource.indexOf(".journey-agent-status-container {")),
    );
    expect(block).toContain("fill: none");
    const stroke = Number(/stroke-width:\s*([\d.]+)/.exec(block)?.[1]);
    expect(stroke).toBeGreaterThanOrEqual(1.5);
  });

  it("gives the control a focus affordance without changing the badge geometry", () => {
    expect(cssSource).toContain("button.journey-agent-status:focus-visible");
    const block = cssSource.slice(
      cssSource.indexOf("button.journey-agent-status {"),
      cssSource.indexOf("}", cssSource.indexOf("button.journey-agent-status {")),
    );
    expect(block).toContain("padding: 0");
    expect(block).not.toContain("height");
    expect(block).not.toContain("width");
  });
});

describe("CR134: status is sourced from something a relaunch does not erase", () => {
  it("derives both status surfaces from the registry-backed locus", () => {
    expect(appSource).toContain("const selectedJourneyWork = deriveJourneyWorkLocus({");
    expect(appSource).toContain("const journeyWork = deriveJourneyWorkLocus({");
    expect(appSource).toContain("occupancy: piInvocationOccupancy,");
    expect(appSource).toContain("runtimePhase: selectedJourneyWork?.phase,");
    expect(appSource).toContain("runtimePhase: journeyWork?.phase,");
    // The old sources are no longer the only ones consulted by the status surfaces.
    expect(appSource).not.toContain("runtimePhase: runtimeOwnerPhase,");
    expect(appSource).not.toContain("runtimePhase: selectJourneyRuntimeOwnerPhase(journeyRuntimeState, selectedJourney),\n    finishedAttention");
  });

  it("resolves a root thread only for Journeys the registry reports busy, read-only", () => {
    const start = appSource.indexOf("const pending = journeyIdsNeedingRootThread(");
    expect(start).toBeGreaterThan(-1);
    const effect = appSource.slice(start, appSource.indexOf("}, [piInvocationOccupancy, conversationCatalogs, journeyRootThreadIds]);", start));
    expect(effect).toContain("await loadNautilusJourneyThread(journeyId)");
    for (const mutating of [/\bstart\w*\(/i, /\bprovision\w*\(/i, /\bcreate\w*\(/i, /\bactivate\w*\(/i]) {
      expect(effect.replace(/\/\/.*$/gm, "")).not.toMatch(mutating);
    }
  });
});

describe("CR134: a non-owner workspace is told where the work is", () => {
  const admission = { allowed: false, reason: "same_journey_occupied" } as const;

  it("names the conversation rather than only the Journey", () => {
    expect(journeyStartAvailability({ runtimeBindingReady: true, nativeAdmission: admission, occupiedLocus: "inside" }))
      .toMatchObject({ canStart: false, unavailableReason: "A conversation in this Journey already has native work in progress.", waiting: true });
  });

  it("keeps the Journey-level sentence when the Journey's own workspace owns it", () => {
    for (const locus of ["here", "unknown", undefined] as const) {
      expect(journeyStartAvailability({ runtimeBindingReady: true, nativeAdmission: admission, occupiedLocus: locus }).unavailableReason)
        .toBe("This Journey already has native work in progress.");
    }
  });

  it("never reports an occupied Journey as startable", () => {
    for (const locus of ["here", "inside", "unknown", undefined] as const) {
      expect(journeyStartAvailability({ runtimeBindingReady: true, nativeAdmission: admission, occupiedLocus: locus }).canStart).toBe(false);
    }
  });
});
