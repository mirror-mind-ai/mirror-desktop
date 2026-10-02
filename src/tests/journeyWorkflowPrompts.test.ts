import { describe, expect, it } from "vitest";
import { COMPOSER_DRAFT_MAX_CHARS } from "../domain/composerDrafts";
import { WORKFLOW_MANIFEST_FILE_NAME } from "../domain/journeyWorkflow";
import {
  composeWorkflowRerenderPrompt,
  composeWorkflowSetupPrompt,
} from "../domain/journeyWorkflowPrompts";

const setup = composeWorkflowSetupPrompt("livro-lideranca-soberana");
const rerender = composeWorkflowRerenderPrompt("livro-lideranca-soberana");

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
    for (const prompt of [setup, rerender]) {
      expect(prompt.length).toBeGreaterThan(400);
      expect(prompt.length).toBeLessThan(COMPOSER_DRAFT_MAX_CHARS / 2);
    }
  });
});
