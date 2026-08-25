import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  toggleExpandedDocumentationPath,
  type DocumentationContentViewState,
  type DocumentationNode,
  type DocumentationTreeViewState,
} from "../domain/journeyDocumentation";
import { listJourneyDocumentation, readJourneyDocument } from "./journeyDocumentationStorage";
import { ArtifactTypeIcon, artifactIconKind } from "./ArtifactTypeIcon";

type JourneyDocumentationBrowserProps = {
  journeyId: string;
  journeyName: string;
};

type JourneyDocumentationSurfaceProps = {
  tree: DocumentationTreeViewState;
  expandedPaths: ReadonlySet<string>;
  selectedNode?: DocumentationNode;
  content: DocumentationContentViewState;
  onToggle: (path: string) => void;
  onSelect: (node: DocumentationNode) => void;
};

const unavailableReasons: Record<string, string> = {
  folder: "Folders provide structure and metadata rather than document content.",
  unsupported_type: "Unsupported document type",
  oversized: "This document exceeds the 1 MiB preview limit.",
  invalid_utf8: "This document is not valid UTF-8 text.",
};

export function JourneyDocumentationBrowser({
  journeyId,
  journeyName,
}: JourneyDocumentationBrowserProps) {
  const [tree, setTree] = useState<DocumentationTreeViewState>({ status: "loading" });
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<DocumentationNode>();
  const [content, setContent] = useState<DocumentationContentViewState>({ status: "idle" });
  const treeRequestRef = useRef(0);
  const contentRequestRef = useRef(0);

  useEffect(() => {
    const request = ++treeRequestRef.current;
    contentRequestRef.current += 1;
    setExpandedPaths(new Set());
    setSelectedNode(undefined);
    setContent({ status: "idle" });

    setTree({ status: "loading" });
    void listJourneyDocumentation(journeyId)
      .then((nextTree) => {
        if (treeRequestRef.current === request) setTree(nextTree);
      })
      .catch(() => {
        if (treeRequestRef.current === request) {
          setTree({ status: "error", message: `${journeyName}'s bounded workspace read could not be completed.` });
        }
      });
  }, [journeyId, journeyName]);

  function selectNode(node: DocumentationNode) {
    setSelectedNode(node);
    const request = ++contentRequestRef.current;
    if (node.kind === "folder") {
      setContent({
        status: "unavailable",
        relativePath: node.relativePath,
        previewKind: "unavailable",
        sizeBytes: node.sizeBytes,
        modifiedAt: node.modifiedAt,
        reason: "folder",
      });
      return;
    }
    if (node.previewKind === "unavailable") {
      setContent({
        status: "unavailable",
        relativePath: node.relativePath,
        previewKind: "unavailable",
        sizeBytes: node.sizeBytes,
        modifiedAt: node.modifiedAt,
        reason: "unsupported_type",
      });
      return;
    }

    setContent({ status: "loading", relativePath: node.relativePath });
    void readJourneyDocument(journeyId, node.relativePath)
      .then((nextContent) => {
        if (contentRequestRef.current === request) setContent(nextContent);
      })
      .catch(() => {
        if (contentRequestRef.current === request) {
          setContent({
            status: "error",
            relativePath: node.relativePath,
            message: "This document could not be read within the bounded workspace.",
          });
        }
      });
  }

  return (
    <JourneyDocumentationSurface
      tree={tree}
      expandedPaths={expandedPaths}
      selectedNode={selectedNode}
      content={content}
      onToggle={(path) => setExpandedPaths((current) => toggleExpandedDocumentationPath(current, path))}
      onSelect={selectNode}
    />
  );
}

export function JourneyDocumentationSurface({
  tree,
  expandedPaths,
  selectedNode,
  content,
  onToggle,
  onSelect,
}: JourneyDocumentationSurfaceProps) {
  return (
    <section
      id="operational-artifacts-panel"
      className="operational-artifacts-workspace"
      role="tabpanel"
      aria-label="Journey workspace browser"
    >
      <div className="operational-artifacts-layout">
        <div className="operational-artifacts-browser">
          <p className="operational-artifacts-section-label">Workspace structure</p>
          {renderTreeState(tree, expandedPaths, selectedNode, onToggle, onSelect)}
        </div>
        <div className="operational-artifact-document-viewer">
          {renderViewer(selectedNode, content)}
        </div>
      </div>
    </section>
  );
}

function renderTreeState(
  tree: DocumentationTreeViewState,
  expandedPaths: ReadonlySet<string>,
  selectedNode: DocumentationNode | undefined,
  onToggle: (path: string) => void,
  onSelect: (node: DocumentationNode) => void,
): ReactNode {
  if (tree.status === "loading") return <BrowserState title="Reading Journey workspace" detail="Loading the bounded Journey hierarchy…" />;
  if (tree.status === "error") return <BrowserState title="Workspace unavailable" detail={tree.message} />;
  if (tree.status === "empty") return <BrowserState title="This Journey workspace is empty" detail="Artifacts will appear here when the Journey has material to project." />;

  return (
    <div className="journey-documentation-tree-wrap">
      <div className="journey-documentation-root"><ArtifactTypeIcon kind="folder" open /><strong>{tree.rootLabel}</strong></div>
      <ul className="journey-documentation-tree" role="tree" aria-label="Journey workspace">
        {tree.items.map((node) => renderTreeNode(node, 0, expandedPaths, selectedNode, onToggle, onSelect))}
      </ul>
    </div>
  );
}

function renderTreeNode(
  node: DocumentationNode,
  depth: number,
  expandedPaths: ReadonlySet<string>,
  selectedNode: DocumentationNode | undefined,
  onToggle: (path: string) => void,
  onSelect: (node: DocumentationNode) => void,
): ReactNode {
  const expanded = node.kind === "folder" && expandedPaths.has(node.relativePath);
  const selected = selectedNode?.relativePath === node.relativePath;
  return (
    <li
      key={node.relativePath}
      role="treeitem"
      aria-expanded={node.kind === "folder" ? expanded : undefined}
      aria-selected={selected}
      className={`journey-documentation-node ${selected ? "selected" : ""}`}
    >
      <div className="journey-documentation-node-row" style={{ "--documentation-depth": depth } as CSSProperties}>
        {node.kind === "folder" ? (
          <button
            type="button"
            className="journey-documentation-toggle"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            onClick={() => onToggle(node.relativePath)}
          >
            {expanded ? "▾" : "›"}
          </button>
        ) : <span className="journey-documentation-file-mark" aria-hidden="true" />}
        <button
          type="button"
          className="journey-documentation-select"
          onClick={() => onSelect(node)}
          title={node.relativePath}
        >
          <ArtifactTypeIcon
            kind={artifactIconKind(node.relativePath, node.kind)}
            open={node.kind === "folder" && expanded}
          />
          <span>{node.name}</span>
        </button>
      </div>
      {node.kind === "folder" && expanded && node.children.length > 0 ? (
        <ul role="group">
          {node.children.map((child) => renderTreeNode(child, depth + 1, expandedPaths, selectedNode, onToggle, onSelect))}
        </ul>
      ) : null}
    </li>
  );
}

function renderViewer(selectedNode: DocumentationNode | undefined, content: DocumentationContentViewState): ReactNode {
  if (!selectedNode || content.status === "idle") {
    return <ViewerEmpty title="Select an artifact" detail="Content, details, and metadata will appear here." />;
  }
  if (content.status === "loading") {
    return <ViewerEmpty title="Reading artifact" detail={content.relativePath} />;
  }
  if (content.status === "error") {
    return <ViewerEmpty title="Artifact unavailable" detail={content.message} />;
  }

  const metadata = (
    <div className="journey-documentation-metadata" aria-label="Artifact metadata">
      <span><strong>Path</strong>{content.relativePath}</span>
      <span><strong>Kind</strong>{selectedNode.kind === "folder" ? "Folder" : selectedNode.previewKind === "markdown" ? "Markdown" : selectedNode.previewKind === "text" ? "Text" : "File"}</span>
      {content.sizeBytes !== undefined ? <span><strong>Size</strong>{formatBytes(content.sizeBytes)}</span> : null}
      {content.modifiedAt !== undefined ? <span><strong>Modified</strong>{new Date(content.modifiedAt).toLocaleString()}</span> : null}
    </div>
  );

  if (content.status === "unavailable") {
    return (
      <div className="journey-documentation-detail">
        <p className="operational-artifacts-section-label">Details and metadata</p>
        <ViewerArtifactTitle node={selectedNode} />
        {metadata}
        <div className="journey-documentation-unavailable">
          <strong>Preview unavailable</strong>
          <p>{unavailableReasons[content.reason] ?? "This item does not expose textual preview content."}</p>
        </div>
      </div>
    );
  }

  return (
    <article className="journey-documentation-content">
      <p className="operational-artifacts-section-label">Artifact content</p>
      <ViewerArtifactTitle node={selectedNode} />
      {metadata}
      <div className={`journey-documentation-body content-${content.previewKind}`}>
        {content.previewKind === "markdown" ? renderSafeMarkdown(content.content) : <pre>{content.content}</pre>}
      </div>
    </article>
  );
}

function renderSafeMarkdown(content: string): ReactNode {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const output: ReactNode[] = [];
  let inFence = false;
  let code: string[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inFence) {
        output.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
        code = [];
      }
      inFence = !inFence;
      return;
    }
    if (inFence) {
      code.push(line);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const text = heading[2];
      output.push(heading[1].length === 1
        ? <h2 key={index}>{text}</h2>
        : <h3 key={index}>{text}</h3>);
      return;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      output.push(<div className="journey-documentation-list-item" key={index}>• {item[1]}</div>);
      return;
    }
    if (line.trim()) output.push(<p key={index}>{line}</p>);
  });
  if (code.length > 0) output.push(<pre key="code-final"><code>{code.join("\n")}</code></pre>);
  return output;
}

function ViewerArtifactTitle({ node }: { node: DocumentationNode }) {
  return (
    <div className="journey-documentation-viewer-title">
      <ArtifactTypeIcon kind={artifactIconKind(node.relativePath, node.kind)} open={node.kind === "folder"} />
      <h2>{node.name}</h2>
    </div>
  );
}

function BrowserState({ title, detail }: { title: string; detail: string }) {
  return <div className="journey-documentation-state"><strong>{title}</strong><p>{detail}</p></div>;
}

function ViewerEmpty({ title, detail }: { title: string; detail: string }) {
  return <div className="operational-artifact-detail-preview"><span className="operational-artifact-detail-symbol" aria-hidden="true">□</span><h3>{title}</h3><p>{detail}</p></div>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
