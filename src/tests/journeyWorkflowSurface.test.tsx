import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyWorkflowSurface } from "../app/JourneyWorkflowSurface";
import type { JourneyWorkflowViewState } from "../domain/journeyWorkflow";
import workflowSurfaceSource from "../app/JourneyWorkflowSurface.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const readyView: JourneyWorkflowViewState = {
  status: "ready",
  title: "Status do projeto",
  content: "## Capítulos\n\n| Capítulo | Estágio |\n| --- | --- |\n| 01 | pronto |\n",
  surfacePath: "docs/workflow-surface.md",
  contractPath: "docs/surface-status-do-projeto.md",
  sourcePaths: ["livro/estrutura.yml", "livro/status.yml"],
  changedInputs: [],
  missingInputs: [],
};

const BRIEFING = "Livro sobre liderança soberana, escrito em português.";

function render(workflow: JourneyWorkflowViewState, onCompose = () => undefined) {
  return renderToStaticMarkup(
    <JourneyWorkflowSurface
      journeyName="livro-lideranca-soberana"
      journeyBriefing={BRIEFING}
      workflow={workflow}
      onCompose={onCompose}
    />,
  );
}

describe("JourneyWorkflowSurface", () => {
  it("renders the Journey's own declared view through the shared markdown renderer", () => {
    const html = render(readyView);
    expect(html).toContain('aria-label="Workflow"');
    expect(html).toContain("Status do projeto");
    expect(html).toContain("<table>");
    expect(html).toContain("pronto");
    expect(html).toContain("docs/surface-status-do-projeto.md");
    expect(html).toContain("livro/status.yml");
  });

  it("never claims the view is fresh, because a declared source list cannot prove it", () => {
    const html = render(readyView);
    expect(html).not.toMatch(/up to date|up-to-date|\bfresh\b|current as of/i);
  });

  it("names which declared inputs changed when the view may have fallen behind", () => {
    const html = render({ ...readyView, status: "possibly_stale", changedInputs: ["livro/status.yml"] });
    expect(html).toMatch(/changed/i);
    expect(html).toContain("livro/status.yml");
    expect(html).toContain("pronto");
  });

  it("names a declared input it could not read", () => {
    const html = render({ ...readyView, status: "possibly_stale", missingInputs: ["livro/status.yml"] });
    expect(html).toMatch(/could not be read|missing/i);
    expect(html).toContain("livro/status.yml");
  });

  it("offers composition when the Journey has declared nothing", () => {
    const html = render({ status: "undeclared", manifestRelativePath: "mirror-workflow.json" });
    expect(html).toMatch(/has not declared/i);
    expect(html).toContain("mirror-workflow.json");
    expect(html).toMatch(/<button/);
  });

  it("shows absence with its reason rather than a partial substitute", () => {
    const html = render({ status: "unavailable", reason: "unsupported_schema_version", detail: "Found 2" });
    expect(html).toMatch(/cannot be shown|unavailable/i);
    expect(html).toContain("Found 2");
    expect(html).not.toContain("<table>");
  });

  it("reports a loading and an error state without inventing content", () => {
    expect(render({ status: "loading" })).toMatch(/reading/i);
    const errored = render({ status: "error", message: "Journey workspace is unavailable." });
    expect(errored).toContain("Journey workspace is unavailable.");
  });

  it("only composes a message, and says so", () => {
    const onCompose = vi.fn();
    const html = renderToStaticMarkup(
      <JourneyWorkflowSurface
        journeyName="livro-lideranca-soberana"
        workflow={{ status: "undeclared", manifestRelativePath: "mirror-workflow.json" }}
        onCompose={onCompose}
      />,
    );
    // The copy carries the same promise JourneyArrivalSurface makes about its own buttons, and
    // rendering alone must never compose: the gesture belongs to the Navigator.
    expect(html).toMatch(/nothing is sent until you decide/i);
    expect(onCompose).not.toHaveBeenCalled();
  });

  it("offers re-render whenever a manifest exists", () => {
    expect(render(readyView)).toMatch(/regenerate|re-render/i);
    expect(render({ ...readyView, status: "possibly_stale", changedInputs: ["livro/status.yml"] }))
      .toMatch(/regenerate|re-render/i);
  });

  it("carries the Journey's description into both prompts without displaying it", () => {
    // The briefing is the language anchor for what the agent writes, and the agent cannot read it
    // in a Desktop turn, so the app has to pass it in. It is an input to the prompt, not content
    // for this tab: Workflow shows the view the Journey declared, nothing else.
    expect(workflowSurfaceSource).toContain("composeWorkflowSetupPrompt(journeyName, journeyBriefing)");
    expect(workflowSurfaceSource).toContain("composeWorkflowRerenderPrompt(journeyName, journeyBriefing)");

    expect(render(readyView)).not.toContain(BRIEFING);
    expect(render({ status: "undeclared", manifestRelativePath: "mirror-workflow.json" }))
      .not.toContain(BRIEFING);
  });

  it("introduces no invocation, hidden state or side effect", () => {
    // The house rule measured on the tactical surface: prefill is permitted, running is not.
    expect(workflowSurfaceSource).not.toMatch(/invoke|generatePacket|AgentRun|useEffect|localStorage|sessionStorage/);
    expect(workflowSurfaceSource).not.toContain("dangerouslySetInnerHTML");
    expect(workflowSurfaceSource).not.toMatch(/<(form|input|textarea|select)\b/);
  });

  it("gives its controls a button class the light families already treat", () => {
    // The light themes paint every bare button white unless it is named in a catch-all opt-out
    // list. A new transparent text button here would repeat the CR105 defect exactly: readable
    // ink on the dark shell, white ink on a white surface. `.secondary-button` already opts out
    // and carries a measured light-family treatment, so the controls reuse it rather than
    // inventing a style that would have to be measured again.
    expect(render(readyView)).toContain('class="secondary-button"');
    expect(render({ status: "undeclared", manifestRelativePath: "mirror-workflow.json" }))
      .toContain('class="secondary-button"');

    const optOut = String(cssSource)
      .split("\n")
      .find((line: string) => line.includes(":where(button:not(") && line.includes(".secondary-button"));
    expect(optOut).toBeTruthy();
  });

  it("encodes none of the Journey's own vocabulary", () => {
    // The canonical case's stages and states belong to the Journey's contract, not to the app.
    for (const owned of [
      "workflow_stages",
      "proposal",
      "author_editing",
      "partnership_review",
      "canonical_promotion",
      "proof_emission",
      "a4_printing",
      "aguardando",
      "em andamento",
    ]) {
      expect(workflowSurfaceSource).not.toContain(owned);
    }
  });
});
