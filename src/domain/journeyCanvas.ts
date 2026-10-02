/**
 * CR112: a Journey's agent keeps a durable drawing of what is happening, and the app renders it.
 * Nothing here interprets the drawing: not its genre, not its vocabulary, not its structure.
 *
 * There is no manifest. The two file names are the convention, so there is no schema to version,
 * no declared source list, and nothing a Journey can get wrong before it can draw.
 *
 * Consequently there is no freshness. The superseded design could prove that a declared source had
 * changed; it could never prove that nothing relevant had. With no declared sources the app knows
 * only when the drawing was made, and must not imply more than that.
 */

/** The prompts tell the agent exactly these names, so they are a contract and not a detail. */
export const CANVAS_FILE_NAME = "canvas.md";
export const CANVAS_INSTRUCTIONS_FILE_NAME = "canvas-instructions.md";

type CanvasPaths = {
  relativePath: string;
  instructionsRelativePath: string;
  /** Existence only. The instructions face the Journey's agent and are never read by the app. */
  instructionsPresent: boolean;
};

export type JourneyCanvas = CanvasPaths & (
  | { status: "undrawn" }
  | { status: "unavailable"; reason: string }
  | { status: "drawn"; content: string; sizeBytes?: number; modifiedAt?: number }
);

export type JourneyCanvasViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | (CanvasPaths & { status: "undrawn" })
  | (CanvasPaths & { status: "unavailable"; reason: string })
  | (CanvasPaths & { status: "drawn"; content: string; drawnAt?: number });

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
    throw new Error("Journey canvas payload is invalid.");
  }
  return value;
}

export function normalizeJourneyCanvas(payload: unknown): JourneyCanvas {
  if (!isRecord(payload)
    || !isSafeRelativePath(payload.relativePath)
    || !isSafeRelativePath(payload.instructionsRelativePath)
    || typeof payload.instructionsPresent !== "boolean") {
    throw new Error("Journey canvas payload is invalid.");
  }
  const paths: CanvasPaths = {
    relativePath: payload.relativePath,
    instructionsRelativePath: payload.instructionsRelativePath,
    instructionsPresent: payload.instructionsPresent,
  };

  if (payload.status === "undrawn") {
    return { ...paths, status: "undrawn" };
  }

  if (payload.status === "unavailable") {
    if (typeof payload.reason !== "string" || !payload.reason.trim()) {
      throw new Error("Journey canvas payload is invalid.");
    }
    return { ...paths, status: "unavailable", reason: payload.reason };
  }

  if (payload.status !== "drawn" || typeof payload.content !== "string") {
    throw new Error("Journey canvas payload is invalid.");
  }

  return {
    ...paths,
    status: "drawn",
    content: payload.content,
    sizeBytes: optionalNonNegativeNumber(payload.sizeBytes),
    modifiedAt: optionalNonNegativeNumber(payload.modifiedAt),
  };
}

export function deriveJourneyCanvasView(canvas: JourneyCanvas): JourneyCanvasViewState {
  const paths: CanvasPaths = {
    relativePath: canvas.relativePath,
    instructionsRelativePath: canvas.instructionsRelativePath,
    instructionsPresent: canvas.instructionsPresent,
  };

  if (canvas.status === "undrawn") return { ...paths, status: "undrawn" };
  if (canvas.status === "unavailable") {
    return { ...paths, status: "unavailable", reason: canvas.reason };
  }

  // `drawnAt` is the only temporal fact the view carries. There is deliberately no companion
  // field saying whether that moment is recent enough to trust, because the app cannot know.
  return { ...paths, status: "drawn", content: canvas.content, drawnAt: canvas.modifiedAt };
}
