/**
 * CR112: a Journey declares its own Workflow view and the app hosts it. Nothing here interprets
 * the Journey's vocabulary, states or stages. The app reads five semantic-free manifest fields,
 * renders the markdown the Journey's agent wrote, and reports honestly when it cannot.
 *
 * Rust supplies file facts. This module derives the view, the same split that produces
 * `tacticalStale` in `journeyProjections.ts`, so freshness is never computed in an effect.
 */

/** The agent is told this exact name by the setup prompt, so it is a contract and not a detail. */
export const WORKFLOW_MANIFEST_FILE_NAME = "mirror-workflow.json";

/** An unknown version shows absence rather than a partial render of fields we may misread. */
export const SUPPORTED_WORKFLOW_SCHEMA_VERSION = 1;

export type WorkflowFileStatus =
  | "ready"
  | "missing"
  | "symlink"
  | "unsupported_type"
  | "oversized"
  | "invalid_utf8"
  | "invalid_path";

export type WorkflowFileFact = {
  relativePath: string;
  status: WorkflowFileStatus;
  sizeBytes?: number;
  modifiedAt?: number;
};

export type WorkflowSurfaceFact = WorkflowFileFact & { content?: string };

export type JourneyWorkflowDeclaration =
  | { status: "undeclared"; manifestRelativePath: string }
  | { status: "unavailable"; manifestRelativePath: string; reason: string }
  | {
      status: "declared";
      manifestRelativePath: string;
      schemaVersion: number;
      title: string;
      surface: WorkflowSurfaceFact;
      contract: WorkflowFileFact;
      sources: WorkflowFileFact[];
    };

export type JourneyWorkflowViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "undeclared"; manifestRelativePath: string }
  | { status: "unavailable"; reason: string; detail?: string }
  | {
      status: "ready" | "possibly_stale";
      title: string;
      content: string;
      surfacePath: string;
      contractPath: string;
      sourcePaths: string[];
      /** Declared inputs modified after the surface was written, in declaration order. */
      changedInputs: string[];
      /** Declared inputs the bounded reader could not read, so freshness cannot be checked. */
      missingInputs: string[];
    };

const fileStatuses: readonly WorkflowFileStatus[] = [
  "ready",
  "missing",
  "symlink",
  "unsupported_type",
  "oversized",
  "invalid_utf8",
  "invalid_path",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Mirrors the Rust bound: inside the Journey root, no traversal, no absolute path, and no
 * component beginning with a dot, because `omitted_workspace_component` makes those invisible.
 */
function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && value.split(/[\\/]/).every((part) => part.length > 0 && !part.startsWith("."));
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Journey workflow payload is invalid.");
  }
  return value;
}

function normalizeFileFact(value: unknown): WorkflowFileFact {
  if (!isRecord(value)
    || !isSafeRelativePath(value.relativePath)
    || !fileStatuses.includes(String(value.status) as WorkflowFileStatus)) {
    throw new Error("Journey workflow declared path is invalid.");
  }
  return {
    relativePath: value.relativePath,
    status: value.status as WorkflowFileStatus,
    sizeBytes: optionalNonNegativeNumber(value.sizeBytes),
    modifiedAt: optionalNonNegativeNumber(value.modifiedAt),
  };
}

function normalizeSurfaceFact(value: unknown): WorkflowSurfaceFact {
  const fact = normalizeFileFact(value);
  const content = isRecord(value) ? value.content : undefined;
  if (content !== undefined && typeof content !== "string") {
    throw new Error("Journey workflow surface content is invalid.");
  }
  return content === undefined ? fact : { ...fact, content };
}

export function normalizeJourneyWorkflow(payload: unknown): JourneyWorkflowDeclaration {
  if (!isRecord(payload) || !isSafeRelativePath(payload.manifestRelativePath)) {
    throw new Error("Journey workflow payload is invalid.");
  }
  const manifestRelativePath = payload.manifestRelativePath;

  if (payload.status === "undeclared") {
    return { status: "undeclared", manifestRelativePath };
  }

  if (payload.status === "unavailable") {
    if (typeof payload.reason !== "string" || !payload.reason.trim()) {
      throw new Error("Journey workflow payload is invalid.");
    }
    return { status: "unavailable", manifestRelativePath, reason: payload.reason };
  }

  if (payload.status !== "declared") {
    throw new Error("Journey workflow payload is invalid.");
  }

  if (typeof payload.schemaVersion !== "number"
    || !Number.isInteger(payload.schemaVersion)
    || payload.schemaVersion < 1) {
    throw new Error("Journey workflow schema version is invalid.");
  }
  if (typeof payload.title !== "string" || !payload.title.trim()) {
    throw new Error("Journey workflow title is invalid.");
  }
  if (!Array.isArray(payload.sources)) {
    throw new Error("Journey workflow sources are invalid.");
  }

  return {
    status: "declared",
    manifestRelativePath,
    schemaVersion: payload.schemaVersion,
    title: payload.title.trim(),
    surface: normalizeSurfaceFact(payload.surface),
    contract: normalizeFileFact(payload.contract),
    sources: payload.sources.map(normalizeFileFact),
  };
}

export function deriveJourneyWorkflowView(
  declaration: JourneyWorkflowDeclaration,
): JourneyWorkflowViewState {
  if (declaration.status === "undeclared") {
    return { status: "undeclared", manifestRelativePath: declaration.manifestRelativePath };
  }
  if (declaration.status === "unavailable") {
    return { status: "unavailable", reason: declaration.reason };
  }

  if (declaration.schemaVersion !== SUPPORTED_WORKFLOW_SCHEMA_VERSION) {
    return {
      status: "unavailable",
      reason: "unsupported_schema_version",
      detail: `This app reads schema version ${SUPPORTED_WORKFLOW_SCHEMA_VERSION}. The manifest declares ${declaration.schemaVersion}.`,
    };
  }

  const { surface, contract, sources } = declaration;
  if (surface.status !== "ready" || surface.content === undefined) {
    return { status: "unavailable", reason: surface.status, detail: surface.relativePath };
  }

  // The contract declares the view's form and the sources declare its data, so both count as
  // declared freshness inputs. The manifest carries no others, which is why the surface can
  // prove a known input changed but can never prove that nothing relevant did.
  const declaredInputs: WorkflowFileFact[] = [contract, ...sources];
  const missingInputs = declaredInputs
    .filter((input) => input.status !== "ready")
    .map((input) => input.relativePath);
  const changedInputs = declaredInputs
    .filter((input) => input.status === "ready"
      && input.modifiedAt !== undefined
      && surface.modifiedAt !== undefined
      && input.modifiedAt > surface.modifiedAt)
    .map((input) => input.relativePath);

  // Without a surface modification time nothing can be compared, so the view fails safe towards
  // possibly stale rather than presenting itself as the current reading.
  const unverifiable = surface.modifiedAt === undefined;
  const status = changedInputs.length > 0 || missingInputs.length > 0 || unverifiable
    ? "possibly_stale"
    : "ready";

  return {
    status,
    title: declaration.title,
    content: surface.content,
    surfacePath: surface.relativePath,
    contractPath: contract.relativePath,
    sourcePaths: sources.map((source) => source.relativePath),
    changedInputs,
    missingInputs,
  };
}
