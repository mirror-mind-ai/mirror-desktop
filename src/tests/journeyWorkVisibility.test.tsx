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

describe("CR134: status is sourced from the carrier that always has the workspace", () => {
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

/**
 * CR134 gave this refusal a locus so it could say whether the Journey's own workspace or a
 * conversation inside it held the lease. CR140 retired the locus here and kept the property:
 * with a share of three, *several* workspaces can hold the Journey's work and one locus value
 * cannot name them, so the refusal carries the occupants and names each. The sentences changed;
 * the guarantee this suite exists to protect — a non-owner workspace is told where the work is —
 * did not, and is asserted below on the replacement.
 */
describe("CR140: a workspace refused by its Journey's share is told which work is in the way", () => {
  const admission = { allowed: false, reason: "journey_share_exceeded" } as const;
  const root = "nautilus-thread-journey-a";

  function startWith(occupants: readonly string[], titles: Record<string, string> = {}) {
    return journeyStartAvailability({
      runtimeBindingReady: true,
      nativeAdmission: admission,
      refusalContext: {
        occupants: occupants.map((threadId) => ({ threadId })),
        rootThreadId: root,
        conversationTitleOfThread: (threadId) => titles[threadId],
      },
    });
  }

  it("names the conversation rather than only the Journey", () => {
    expect(startWith(["desktop-thread-b"], { "desktop-thread-b": "Journey card" }))
      .toMatchObject({
        canStart: false,
        unavailableReason: "This Journey is already running as much work as it can at once — \u201cJourney card\u201d."
          + " Send becomes available when one of them finishes.",
        waiting: true,
      });
  });

  it("names the Journey's own workspace as itself rather than as a conversation", () => {
    expect(startWith([root]).unavailableReason)
      .toContain("this Journey's own workspace");
  });

  it("names every occupant when the whole share is spent", () => {
    const sentence = startWith([root, "desktop-thread-b", "desktop-thread-c"], {
      "desktop-thread-b": "Journey card",
      "desktop-thread-c": "Release notes",
    }).unavailableReason;
    expect(sentence).toContain("this Journey's own workspace, \u201cJourney card\u201d and \u201cRelease notes\u201d");
  });

  it("stays specific about the constraint when no occupant can be named", () => {
    const sentence = journeyStartAvailability({
      runtimeBindingReady: true, nativeAdmission: admission,
    }).unavailableReason;
    expect(sentence).toBe("This Journey is already running as much work as it can at once."
      + " Send becomes available when one of them finishes.");
  });

  it("never reports an occupied Journey as startable", () => {
    for (const occupants of [[], [root], [root, "desktop-thread-b"]]) {
      expect(startWith(occupants).canStart).toBe(false);
    }
  });
});
