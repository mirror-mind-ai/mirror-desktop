import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function between(start: string, end: string): string {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

// CR081: runtime authority derives Working/Finishing; the only new state is session-local Finished
// attention. One shared status component owns sidebar and header presentation.
describe("Journey agent status integration", () => {
  it("clears stale Finished on start and records only successful completion", () => {
    const run = between("async function generatePacket", "async function startSelectedJourney");
    expect(run).toContain('dispatchJourneyFinishedAttention({ type: "run_started", journeyId: ownerJourneyId })');
    expect(run).toContain("if (runTerminal === undefined)");
    expect(run).toContain('type: "run_finished"');
    expect(run.indexOf('type: "run_finished"')).toBeGreaterThan(run.indexOf('type: "finalization_finished"'));
  });

  it("acknowledges a background completion only when its Journey becomes selected", () => {
    expect(appSource).toContain('type: "journey_selected", journeyId: selectedJourney, at: Date.now()');
    expect(appSource).toContain("nextFinishedAttentionDeadline(journeyFinishedAttention)");
    expect(appSource).toContain('type: "time_elapsed", at: Date.now()');
  });

  it("replaces recent last-worked time with state until the Journey returns to Idle", () => {
    expect(appSource).toContain('agentStatus === "idle"\n                    ? relativeLastWorkedLabel');
    expect(appSource).toContain('agentStatus !== "idle"\n                    ? journeyAgentStatusLabel(agentStatus)');
    expect(cssSource).toContain(".journey-last-worked.agent-status");
  });

  it("uses one shared status in the sidebar and beside the active Journey name", () => {
    expect(appSource).toContain('<JourneyAgentStatusIndicator journeyName={journey.name} status={agentStatus} placement="sidebar" />');
    expect(appSource).toContain('<JourneyAgentStatusIndicator journeyName={selectedJourneyItem.name} status={selectedAgentStatus} placement="header" />');
    const heading = between('className="active-journey-name-row"', "{operationalChatSelected");
    expect(heading).toContain("<h1>{selectedJourneyItem.name}</h1>");
    expect(heading).toContain('placement="header"');
    expect(cssSource).toContain(".journey-agent-status-label");
    expect(appSource).not.toContain("<JourneyRuntimeIndicator");
    expect(appSource).not.toContain("runtimePhase={runtimeOwnerPhase}");
  });

  it("moves Pin/Unpin into a context menu that remains reachable during runtime", () => {
    const openMenu = between("function openJourneyItemMenu", "function openJourneyTreeMenu");
    expect(openMenu).not.toContain("if (runtimeBusy) return");
    expect(appSource).toContain("onTogglePin={togglePinnedJourney}");
    expect(appSource).toContain("pinned={journeyPreferences.pinnedJourneyIds.includes(journeyItemMenu.journeyId)}");
    expect(appSource).not.toContain("className={`journey-pin");
  });

  it("keeps motion calm and removable without erasing state", () => {
    expect(cssSource).toContain("@keyframes journey-agent-working");
    expect(cssSource).toContain("@keyframes journey-agent-finishing");
    const reduced = cssSource.slice(cssSource.indexOf(".journey-agent-status.working,", cssSource.indexOf("@media (prefers-reduced-motion: reduce)")));
    expect(reduced).toContain("animation: none");
    expect(cssSource).toContain("CR081 light agent-status contract");
  });
});
