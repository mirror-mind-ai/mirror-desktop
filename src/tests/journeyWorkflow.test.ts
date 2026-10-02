import { describe, expect, it } from "vitest";
import {
  WORKFLOW_MANIFEST_FILE_NAME,
  SUPPORTED_WORKFLOW_SCHEMA_VERSION,
  deriveJourneyWorkflowView,
  normalizeJourneyWorkflow,
  type JourneyWorkflowDeclaration,
} from "../domain/journeyWorkflow";

const declaredPayload = {
  status: "declared",
  manifestRelativePath: WORKFLOW_MANIFEST_FILE_NAME,
  schemaVersion: 1,
  title: "Status do projeto",
  surface: {
    relativePath: "docs/workflow-surface.md",
    status: "ready",
    modifiedAt: 2_000,
    sizeBytes: 120,
    content: "## Status\n\n| Capítulo | Estágio |\n| --- | --- |\n| 01 | pronto |\n",
  },
  contract: { relativePath: "docs/surface-status-do-projeto.md", status: "ready", modifiedAt: 1_000 },
  sources: [
    { relativePath: "livro/estrutura.yml", status: "ready", modifiedAt: 1_500 },
    { relativePath: "livro/status.yml", status: "ready", modifiedAt: 1_800 },
  ],
};

function declared(overrides: Record<string, unknown> = {}): JourneyWorkflowDeclaration {
  return normalizeJourneyWorkflow({ ...declaredPayload, ...overrides });
}

describe("journey workflow manifest transport", () => {
  it("names the manifest the Journey agent has to write", () => {
    // The agent is told this exact name by the setup prompt, so it is a contract, not a detail.
    expect(WORKFLOW_MANIFEST_FILE_NAME).toBe("mirror-workflow.json");
    expect(WORKFLOW_MANIFEST_FILE_NAME.startsWith(".")).toBe(false);
  });

  it("normalizes a declared manifest with its declared inputs", () => {
    const declaration = declared();
    expect(declaration.status).toBe("declared");
    if (declaration.status !== "declared") throw new Error("expected a declared manifest");
    expect(declaration.title).toBe("Status do projeto");
    expect(declaration.schemaVersion).toBe(SUPPORTED_WORKFLOW_SCHEMA_VERSION);
    expect(declaration.surface.relativePath).toBe("docs/workflow-surface.md");
    expect(declaration.sources.map((source) => source.relativePath))
      .toEqual(["livro/estrutura.yml", "livro/status.yml"]);
  });

  it("normalizes the undeclared and unavailable transports", () => {
    const undeclared = normalizeJourneyWorkflow({
      status: "undeclared",
      manifestRelativePath: WORKFLOW_MANIFEST_FILE_NAME,
    });
    expect(undeclared.status).toBe("undeclared");

    const unavailable = normalizeJourneyWorkflow({
      status: "unavailable",
      manifestRelativePath: WORKFLOW_MANIFEST_FILE_NAME,
      reason: "manifest_malformed",
    });
    expect(unavailable.status).toBe("unavailable");
  });

  it("rejects a transport that escapes the Journey workspace", () => {
    for (const relativePath of ["/etc/passwd", "../outside.md", "C:/outside.md", ".mirror/surface.md", ""]) {
      expect(() => normalizeJourneyWorkflow({
        ...declaredPayload,
        surface: { ...declaredPayload.surface, relativePath },
      })).toThrow();
    }
  });

  it("rejects a malformed transport rather than guessing", () => {
    expect(() => normalizeJourneyWorkflow(undefined)).toThrow();
    expect(() => normalizeJourneyWorkflow({ status: "nonsense" })).toThrow();
    expect(() => normalizeJourneyWorkflow({ ...declaredPayload, title: "  " })).toThrow();
    expect(() => normalizeJourneyWorkflow({ ...declaredPayload, schemaVersion: "1" })).toThrow();
    expect(() => normalizeJourneyWorkflow({ ...declaredPayload, sources: "livro/status.yml" })).toThrow();
  });
});

describe("journey workflow view derivation", () => {
  it("renders a declared surface without ever claiming it is fresh", () => {
    const view = deriveJourneyWorkflowView(declared());
    expect(view.status).toBe("ready");
    if (view.status !== "ready") throw new Error("expected a ready view");
    expect(view.title).toBe("Status do projeto");
    expect(view.content).toContain("| 01 | pronto |");
    expect(view.contractPath).toBe("docs/surface-status-do-projeto.md");
    expect(view.changedInputs).toEqual([]);
    expect(view.missingInputs).toEqual([]);
  });

  it("marks the view possibly stale when a declared input is newer", () => {
    const view = deriveJourneyWorkflowView(declared({
      sources: [
        { relativePath: "livro/estrutura.yml", status: "ready", modifiedAt: 1_500 },
        { relativePath: "livro/status.yml", status: "ready", modifiedAt: 9_000 },
      ],
    }));
    expect(view.status).toBe("possibly_stale");
    if (view.status !== "possibly_stale") throw new Error("expected a possibly stale view");
    expect(view.changedInputs).toEqual(["livro/status.yml"]);
    expect(view.content).toContain("| 01 | pronto |");
  });

  it("treats the contract as a declared freshness input, not only provenance", () => {
    const view = deriveJourneyWorkflowView(declared({
      contract: { relativePath: "docs/surface-status-do-projeto.md", status: "ready", modifiedAt: 9_000 },
    }));
    expect(view.status).toBe("possibly_stale");
    if (view.status !== "possibly_stale") throw new Error("expected a possibly stale view");
    expect(view.changedInputs).toEqual(["docs/surface-status-do-projeto.md"]);
  });

  it("fails safe towards possibly stale when the surface has no modification time", () => {
    const view = deriveJourneyWorkflowView(declared({
      surface: { ...declaredPayload.surface, modifiedAt: undefined },
    }));
    expect(view.status).toBe("possibly_stale");
  });

  it("names a declared input it cannot read instead of implying the view is current", () => {
    const view = deriveJourneyWorkflowView(declared({
      sources: [
        { relativePath: "livro/estrutura.yml", status: "ready", modifiedAt: 1_500 },
        { relativePath: "livro/status.yml", status: "missing" },
      ],
    }));
    expect(view.status).toBe("possibly_stale");
    if (view.status !== "possibly_stale") throw new Error("expected a possibly stale view");
    expect(view.missingInputs).toEqual(["livro/status.yml"]);
  });

  it("shows absence with a reason when the declared surface cannot be rendered", () => {
    for (const status of ["missing", "symlink", "unsupported_type", "oversized", "invalid_utf8"] as const) {
      const view = deriveJourneyWorkflowView(declared({
        surface: { relativePath: "docs/workflow-surface.md", status },
      }));
      expect(view.status).toBe("unavailable");
      if (view.status !== "unavailable") throw new Error("expected an unavailable view");
      expect(view.reason).toBe(status);
    }
  });

  it("refuses an unknown schema version rather than rendering part of it", () => {
    const view = deriveJourneyWorkflowView(declared({ schemaVersion: 2 }));
    expect(view.status).toBe("unavailable");
    if (view.status !== "unavailable") throw new Error("expected an unavailable view");
    expect(view.reason).toBe("unsupported_schema_version");
    expect(view.detail).toContain("2");
  });

  it("passes the undeclared and unavailable transports straight through", () => {
    const undeclared = deriveJourneyWorkflowView(normalizeJourneyWorkflow({
      status: "undeclared",
      manifestRelativePath: WORKFLOW_MANIFEST_FILE_NAME,
    }));
    expect(undeclared.status).toBe("undeclared");

    const unavailable = deriveJourneyWorkflowView(normalizeJourneyWorkflow({
      status: "unavailable",
      manifestRelativePath: WORKFLOW_MANIFEST_FILE_NAME,
      reason: "manifest_malformed",
    }));
    expect(unavailable.status).toBe("unavailable");
    if (unavailable.status !== "unavailable") throw new Error("expected an unavailable view");
    expect(unavailable.reason).toBe("manifest_malformed");
  });
});
