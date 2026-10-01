import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAgentStatusIndicator } from "../app/JourneyAgentStatusIndicator";
import { JourneyItemCopy } from "../app/JourneyItemCopy";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function cssBlock(selector: string): string {
  const start = cssSource.indexOf(selector);
  expect(start, `missing selector: ${selector}`).toBeGreaterThan(-1);
  const open = cssSource.indexOf("{", start);
  return cssSource.slice(open, cssSource.indexOf("}", open));
}

const LIGHT_THEMES = ["daylight", "mist", "parchment"] as const;

describe("CR106 — Ready reads as completion", () => {
  it("draws Ready as a filled circle holding a check", () => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status="finished" placement="sidebar" />,
    );

    expect(html).toContain("<circle");
    expect(html).toContain("<path");
    // The disc carries the success colour and the check is knocked out of it.
    expect(html).toContain('class="journey-agent-status-disc"');
    expect(html).toContain('class="journey-agent-status-check"');
  });

  it("keeps a non-colour cue, so Ready is not distinguished by green alone", () => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status="finished" placement="header" />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Mirror Desktop agent finished"');
    expect(html).toContain('title="Agent finished"');
    expect(html).toContain(">Ready</span>");
  });

  // CR102 gave every state a glyph, so the quiet states are circles too. CR106's point survives
  // intact and is what is asserted here: Ready is the only one built as a disc with a mark knocked
  // out of it, so it is never green Working.
  it("keeps Working, Finishing and Idle off the completion construction", () => {
    for (const status of ["idle", "working", "finishing"] as const) {
      const html = renderToStaticMarkup(
        <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="sidebar" />,
      );
      expect(html).not.toContain("journey-agent-status-disc");
      expect(html).not.toContain("journey-agent-status-check");
      expect(html).not.toContain("<path");
    }
  });
});

describe("CR106 — completion has its own colour authority", () => {
  it("defines a success register that no accent can claim", () => {
    // The accent is Navigator-configurable and includes green palettes, so completion cannot
    // borrow it without becoming indistinguishable from Working.
    const root = cssBlock(":root {");
    expect(root).toContain("--ui-success:");
    expect(root).toContain("--ui-success-on:");
  });

  it("redefines the success register for the light themes, where a bright green fails contrast", () => {
    const light = cssBlock("CR106 light completion register");
    expect(light).toContain("--ui-success:");
    expect(light).toContain("--ui-success-on:");
    for (const theme of LIGHT_THEMES) {
      expect(cssSource.slice(cssSource.indexOf("CR106 light completion register")).slice(0, 400))
        .toContain(`"${theme}"`);
    }
  });

  it("paints Ready from the success register instead of the accent", () => {
    const finished = cssBlock(".journey-agent-status.finished {");
    expect(finished).toContain("--ui-success");
    expect(finished).not.toContain("var(--accent)");
  });

  it("surrounds Ready with a success halo rather than an accent halo", () => {
    const finished = cssBlock(".journey-agent-status.finished {");
    expect(finished).toContain("box-shadow");
    expect(finished).toContain("var(--ui-success)");
  });

  it("gives the light themes a Ready rule of their own", () => {
    // The light contract grouped Working, Finishing and Ready into one colour by construction.
    const grouped = cssBlock(".journey-agent-status:is(.working, .finishing)");
    expect(grouped).not.toContain("finished");
    const lightFinished = cssBlock("CR106 light Ready contract");
    expect(lightFinished).toContain("--ui-success");
  });

  it("colours the sidebar Ready label from the same register as its icon", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy
        layout="card"
        journeyName="Mirror Desktop"
        description="Desktop"
        agentStatusLabel="Ready"
        agentStatusKind="finished"
      />,
    );
    expect(html).toContain('class="journey-last-worked agent-status finished"');
    expect(cssBlock(".journey-last-worked.agent-status.finished")).toContain("var(--ui-success)");
    expect(appSource).toContain("agentStatusKind={");
  });
});

describe("CR106 — attention without nagging", () => {
  it("announces completion once instead of looping, and yields to reduced motion", () => {
    expect(cssSource).toContain("@keyframes journey-agent-finished-arrival");
    const finished = cssBlock(".journey-agent-status.finished {");
    expect(finished).toContain("journey-agent-finished-arrival");
    // Ready is transient; a looping signal would nag rather than inform.
    expect(finished).not.toContain("infinite");

    const reducedMotion = cssSource.slice(cssSource.indexOf("@media (prefers-reduced-motion: reduce)"));
    const reducedBlock = reducedMotion.slice(0, reducedMotion.indexOf("\n}\n"));
    expect(reducedBlock).toContain(".journey-agent-status.finished");
  });

  it("does not change how long Ready lasts or when it is derived", () => {
    expect(appSource).toContain("nextFinishedAttentionDeadline(journeyFinishedAttention)");
    expect(cssSource).toContain("@keyframes journey-agent-working");
    expect(cssSource).toContain("@keyframes journey-agent-finishing");
  });
});
