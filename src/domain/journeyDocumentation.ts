export type DocumentationNodeKind = "folder" | "file";
export type DocumentationPreviewKind = "markdown" | "text" | "unavailable";

export type DocumentationNode = {
  relativePath: string;
  name: string;
  kind: DocumentationNodeKind;
  previewKind: DocumentationPreviewKind;
  sizeBytes?: number;
  modifiedAt?: number;
  children: DocumentationNode[];
};

export type DocumentationTree = {
  status: "ready" | "missing" | "empty";
  rootLabel: string;
  items: DocumentationNode[];
};

export type DocumentationTreeViewState =
  | DocumentationTree
  | { status: "loading" }
  | { status: "error"; message: string };

export type DocumentationContent =
  | {
      status: "ready";
      relativePath: string;
      previewKind: "markdown" | "text";
      content: string;
      sizeBytes?: number;
      modifiedAt?: number;
    }
  | {
      status: "unavailable";
      relativePath: string;
      previewKind: "unavailable";
      sizeBytes?: number;
      modifiedAt?: number;
      reason: string;
    };

export type DocumentationContentViewState =
  | DocumentationContent
  | { status: "idle" }
  | { status: "loading"; relativePath: string }
  | { status: "error"; relativePath: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && value.split(/[\\/]/).every((part) => part.length > 0 && part !== "." && part !== "..");
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Journey documentation payload is invalid.");
  }
  return value;
}

function normalizeNode(value: unknown): DocumentationNode {
  if (!isRecord(value)
    || !isSafeRelativePath(value.relativePath)
    || typeof value.name !== "string"
    || !value.name.trim()
    || !["folder", "file"].includes(String(value.kind))
    || !["markdown", "text", "unavailable"].includes(String(value.previewKind))
    || !Array.isArray(value.children)) {
    throw new Error("Journey documentation node is invalid.");
  }

  const node: DocumentationNode = {
    relativePath: value.relativePath,
    name: value.name,
    kind: value.kind as DocumentationNodeKind,
    previewKind: value.previewKind as DocumentationPreviewKind,
    sizeBytes: optionalNonNegativeNumber(value.sizeBytes),
    modifiedAt: optionalNonNegativeNumber(value.modifiedAt),
    children: value.children.map(normalizeNode),
  };

  if (node.kind === "file" && node.children.length > 0) {
    throw new Error("Journey documentation node is invalid.");
  }
  return node;
}

export function sortDocumentationNodes(nodes: DocumentationNode[]): DocumentationNode[] {
  return nodes
    .map((node) => ({ ...node, children: sortDocumentationNodes(node.children) }))
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
}

export function normalizeDocumentationTree(value: unknown): DocumentationTree {
  if (!isRecord(value)
    || !["ready", "missing", "empty"].includes(String(value.status))
    || typeof value.rootLabel !== "string"
    || !Array.isArray(value.items)) {
    throw new Error("Journey documentation tree is invalid.");
  }
  return {
    status: value.status as DocumentationTree["status"],
    rootLabel: value.rootLabel,
    items: sortDocumentationNodes(value.items.map(normalizeNode)),
  };
}

export function normalizeDocumentationContent(value: unknown): DocumentationContent {
  if (!isRecord(value) || !isSafeRelativePath(value.relativePath)) {
    throw new Error("Journey document content is invalid.");
  }

  const sizeBytes = optionalNonNegativeNumber(value.sizeBytes);
  const modifiedAt = optionalNonNegativeNumber(value.modifiedAt);
  if (value.status === "ready"
    && (value.previewKind === "markdown" || value.previewKind === "text")
    && typeof value.content === "string") {
    return {
      status: "ready",
      relativePath: value.relativePath,
      previewKind: value.previewKind,
      content: value.content,
      sizeBytes,
      modifiedAt,
    };
  }
  if (value.status === "unavailable"
    && value.previewKind === "unavailable"
    && typeof value.reason === "string"
    && value.reason.length > 0) {
    return {
      status: "unavailable",
      relativePath: value.relativePath,
      previewKind: "unavailable",
      reason: value.reason,
      sizeBytes,
      modifiedAt,
    };
  }
  throw new Error("Journey document content is invalid.");
}

export function toggleExpandedDocumentationPath(paths: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(paths);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  return next;
}
