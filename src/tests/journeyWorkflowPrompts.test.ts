import { describe, expect, it } from "vitest";
import { COMPOSER_DRAFT_MAX_CHARS } from "../domain/composerDrafts";
import { WORKFLOW_MANIFEST_FILE_NAME } from "../domain/journeyWorkflow";
import {
  WORKFLOW_BRIEFING_EXCERPT_MAX_CHARS,
  composeWorkflowRerenderPrompt,
  composeWorkflowSetupPrompt,
} from "../domain/journeyWorkflowPrompts";

const briefing = "Livro sobre liderança soberana, escrito em português, com revisão em parceria.";
const setup = composeWorkflowSetupPrompt("livro-lideranca-soberana", briefing);
const rerender = composeWorkflowRerenderPrompt("livro-lideranca-soberana", briefing);

describe("workflow setup prompt", () => {
  it("tells the agent to find an existing workflow and forbids inventing one", () => {
    expect(setup.toLowerCase()).toContain("find");
    expect(setup).toMatch(/do not invent/i);
    expect(setup).toMatch(/do not design/i);
  });

  it("carries the prohibitions that keep a confident wrong reading out", () => {
    // The CR105 genericity error reappears at the prompt layer without these. This session
    // produced exactly that error twice by reading a cadence off the directory tree.
    expect(setup).toMatch(/do not infer state from our conversation/i);
    expect(setup).toMatch(/directory tree|directory shape/i);
    expect(setup).toMatch(/memory/i);
  });

  it("requires a descriptive observation instead of a bare refusal", () => {
    expect(setup).toMatch(/do not just refuse/i);
    expect(setup).toMatch(/describe what you did observe/i);
    expect(setup).toMatch(/what is missing/i);
  });

  it("carries the manifest contract inline, because the agent cannot read this repository", () => {
    expect(setup).toContain(WORKFLOW_MANIFEST_FILE_NAME);
    for (const field of ["schemaVersion", "title", "surface", "contract", "sources"]) {
      expect(setup).toContain(field);
    }
    expect(setup).toMatch(/relative to the Journey root/i);
    expect(setup).toMatch(/must not contain any component beginning with a dot/i);
    expect(setup).toMatch(/\.md, \.markdown or \.txt/);
  });

  it("restricts the surface to the markdown subset the renderer actually supports", () => {
    // ArtifactMarkdown renders no links at all; link syntax would survive as literal text.
    expect(setup).toMatch(/do not use links/i);
    expect(setup).toMatch(/level one to three/i);
    expect(setup).toMatch(/tables/i);
  });

  it("stops for confirmation before writing anything into the Journey", () => {
    expect(setup).toMatch(/report before writing/i);
    expect(setup).toMatch(/wait for my confirmation/i);
  });

  it("names the Journey it was composed for", () => {
    expect(composeWorkflowSetupPrompt("vida-economica")).toContain("vida-economica");
  });
});

describe("both prompts anchor the language of what the agent writes", () => {
  // These prompts are written in English, which pulls an agent towards answering in English even
  // when every document it just read is in another language. The Journey briefing is the only
  // anchor that always exists: measured on the dev registry, only 4 of 21 registered Journeys
  // carry a JOURNEY.md, while every Journey carries a description. CR105 also measured that the
  // briefing is never injected into a Desktop turn, so the agent cannot read it and the app has
  // to carry it into the prompt.
  it("quotes the Journey's own description as the language anchor", () => {
    for (const prompt of [setup, rerender]) {
      expect(prompt).toContain(briefing);
      expect(prompt).toMatch(/language of/i);
    }
  });

  it("forbids translating into the language of the prompt itself", () => {
    for (const prompt of [setup, rerender]) {
      expect(prompt).toMatch(/do not translate/i);
      expect(prompt).toMatch(/english/i);
    }
  });

  it("keeps a language rule even when no briefing is available", () => {
    const withoutBriefing = composeWorkflowSetupPrompt("vida-economica");
    expect(withoutBriefing).toMatch(/do not translate/i);
    expect(withoutBriefing).toMatch(/language of/i);
    expect(withoutBriefing).not.toContain("undefined");

    const rerenderWithout = composeWorkflowRerenderPrompt("vida-economica");
    expect(rerenderWithout).toMatch(/do not translate/i);
    expect(rerenderWithout).not.toContain("undefined");
  });

  it("anchors regeneration to the language already in the contract and the view", () => {
    // Regeneration runs many times over a Journey's life, so this is where drift would compound.
    expect(rerender).toMatch(/same language as the contract/i);
  });

  it("bounds the quoted briefing so a long description cannot crowd out the rules", () => {
    const long = "Jornada de teste. ".repeat(400);
    const bounded = composeWorkflowSetupPrompt("vida-economica", long);
    expect(long.length).toBeGreaterThan(WORKFLOW_BRIEFING_EXCERPT_MAX_CHARS);
    expect(bounded).toContain(long.slice(0, 80));
    expect(bounded).not.toContain(long);
    expect(bounded).toMatch(/do not invent/i);
    expect(bounded).toMatch(/do not translate/i);
  });
});

describe("workflow re-render prompt", () => {
  it("regenerates from the contract without improving on it", () => {
    expect(rerender).toContain(WORKFLOW_MANIFEST_FILE_NAME);
    expect(rerender).toMatch(/do not improve on it/i);
    expect(rerender).toMatch(/the contract is the authority/i);
    expect(rerender).toMatch(/report the broken path and stop/i);
  });

  it("keeps the same reading and rendering prohibitions as setup", () => {
    expect(rerender).toMatch(/do not reconstruct state from our conversation/i);
    expect(rerender).toMatch(/do not use links of any kind/i);
  });

  it("changes only the surface the manifest declares", () => {
    expect(rerender).toMatch(/change only the surface file/i);
  });
});

describe("both prompts fit the composer that receives them", () => {
  it("stays well inside the silent truncation bound", () => {
    // setJourneyComposerDraft slices at COMPOSER_DRAFT_MAX_CHARS without telling anyone, so a
    // prompt that grows past it would lose its own prohibitions last.
    const longBriefing = "Jornada de teste. ".repeat(400);
    const prompts = [
      setup,
      rerender,
      composeWorkflowSetupPrompt("vida-economica", longBriefing),
      composeWorkflowRerenderPrompt("vida-economica", longBriefing),
    ];
    for (const prompt of prompts) {
      expect(prompt.length).toBeGreaterThan(400);
      expect(prompt.length).toBeLessThan(COMPOSER_DRAFT_MAX_CHARS / 2);
    }
  });
});
