import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyItemCopy } from "../app/JourneyItemCopy";

describe("Journey item copy", () => {
  it("exposes identity and hierarchy context without duplicating agent status", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy
        layout="card"
        journeyName="Venda de Livros"
        description="Empreendedora / Software Zen"
        lastWorkedLabel="2 days ago"
        pinned
      />,
    );

    expect(html).toContain('class="journey-name"');
    expect(html).toContain('class="journey-context"');
    expect(html).not.toContain('class="journey-copy"');
    expect(html).toContain('class="journey-last-worked"');
    expect(html).toContain("2 days ago");
    expect(html).toContain('class="journey-pinned-marker"');
    expect(html).toContain('aria-label="Pinned"');
    expect(html).not.toContain("journey-runtime-state");
  });

  it("replaces last-worked time with agent state while the agent is not idle", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy
        layout="card"
        journeyName="Mirror Desktop"
        description="Desktop"
        lastWorkedLabel="2 minutes ago"
        agentStatusLabel="Working"
      />,
    );
    expect(html).toContain('class="journey-last-worked agent-status"');
    expect(html).toContain("Working");
    expect(html).not.toContain("2 minutes ago");
  });

  it("retains one compact copy wrapper for Tree layout", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy layout="tree" journeyName="TinTim" description="Vida Consultiva" />,
    );

    expect(html).toContain('class="journey-copy"');
    expect(html).toContain("TinTim");
    expect(html).not.toContain("journey-runtime-state");
  });
});
