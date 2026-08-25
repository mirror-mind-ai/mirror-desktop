import type { DocumentationNodeKind } from "../domain/journeyDocumentation";

export type ArtifactIconKind =
  | "folder"
  | "markdown"
  | "pdf"
  | "text"
  | "image"
  | "code"
  | "data"
  | "archive"
  | "document"
  | "file";

const extensionKinds: Readonly<Record<string, ArtifactIconKind>> = {
  md: "markdown",
  markdown: "markdown",
  pdf: "pdf",
  txt: "text",
  log: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  py: "code",
  rs: "code",
  go: "code",
  java: "code",
  rb: "code",
  sh: "code",
  css: "code",
  html: "code",
  json: "data",
  yaml: "data",
  yml: "data",
  toml: "data",
  csv: "data",
  xml: "data",
  zip: "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  rar: "archive",
  "7z": "archive",
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  xls: "document",
  xlsx: "document",
  ppt: "document",
  pptx: "document",
};

export function artifactIconKind(path: string, nodeKind: DocumentationNodeKind): ArtifactIconKind {
  if (nodeKind === "folder") return "folder";
  const normalized = path.toLowerCase();
  if (normalized.endsWith(".tar.gz")) return "archive";
  const extension = normalized.includes(".") ? normalized.split(".").pop() ?? "" : "";
  return extensionKinds[extension] ?? "file";
}

export function ArtifactTypeIcon({
  kind,
  open = false,
}: {
  kind: ArtifactIconKind;
  open?: boolean;
}) {
  if (kind === "folder") {
    return (
      <svg
        className={`artifact-type-icon icon-folder ${open ? "open" : ""}`}
        data-artifact-icon="folder"
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        {open ? (
          <path d="M3.5 8.5h17l-2.1 9H5.2zM4 8.5V6.2c0-.9.7-1.7 1.7-1.7h4l1.8 2h6.8c.9 0 1.7.7 1.7 1.7v.3" />
        ) : (
          <path d="M3.5 6.2c0-.9.7-1.7 1.7-1.7h4l1.8 2h7.8c.9 0 1.7.7 1.7 1.7v9.6c0 .9-.7 1.7-1.7 1.7H5.2c-.9 0-1.7-.7-1.7-1.7z" />
        )}
      </svg>
    );
  }

  return (
    <svg
      className={`artifact-type-icon icon-${kind}`}
      data-artifact-icon={kind}
      aria-hidden="true"
      viewBox="0 0 24 24"
    >
      <path className="artifact-file-shape" d="M6 2.8h7.5L18.5 8v13.2H6zM13.5 2.8V8h5" />
      {renderTypeMark(kind)}
    </svg>
  );
}

function renderTypeMark(kind: Exclude<ArtifactIconKind, "folder">) {
  if (kind === "image") {
    return <><circle cx="10" cy="11.5" r="1.4" /><path d="m8 18 3.2-3.4 2 2 1.8-2.1 2 3.5" /></>;
  }
  if (kind === "code") {
    return <path className="artifact-type-mark" d="m10.3 12.2-2 2 2 2M14.2 12.2l2 2-2 2" />;
  }
  if (kind === "data") {
    return <text className="artifact-type-label" x="12.2" y="16.7">{"{}"}</text>;
  }
  const label = {
    markdown: "MD",
    pdf: "PDF",
    text: "TXT",
    archive: "ZIP",
    document: "DOC",
    file: "",
  }[kind];
  return label
    ? <text className="artifact-type-label" x="12.2" y="16.4">{label}</text>
    : <path className="artifact-type-mark" d="M9 13h6M9 16h6" />;
}
