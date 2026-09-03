import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  findDocumentationNode,
  toggleExpandedDocumentationPath,
  type DocumentationContentViewState,
  type DocumentationNode,
  type DocumentationTreeViewState,
} from "../domain/journeyDocumentation";
import {
  listJourneyDocumentation,
  readJourneyDocument,
  revealJourneyArtifact,
} from "./journeyDocumentationStorage";
import { openJourneyDocument } from "./chatLocalReferenceNavigation";
import { ArtifactTypeIcon, artifactIconKind } from "./ArtifactTypeIcon";
import { ArtifactContextMenu } from "./ArtifactContextMenu";
import { ArtifactMarkdown } from "./ArtifactMarkdown";

type JourneyDocumentationBrowserProps = {
  journeyId: string;
  journeyName: string;
  requestedRelativePath?: string;
  requestId?: number;
  expandPreviewOnReveal?: boolean;
  onNavigationRequestSettled?: (requestId: number) => void;
};

export type ArtifactNavigationIntent = {
  relativePath: string;
  expandPreview: boolean;
};

export type ArtifactNavigationResolution =
  | {
      kind: "resolved";
      node: DocumentationNode;
      ancestorPaths: string[];
      shouldExpandPreview: boolean;
    }
  | { kind: "rejected"; shouldExpandPreview: false };

export function resolveArtifactNavigationIntent(
  items: DocumentationNode[],
  intent: ArtifactNavigationIntent,
): ArtifactNavigationResolution {
  const match = findDocumentationNode(items, intent.relativePath);
  if (!match || match.node.kind !== "file") {
    return { kind: "rejected", shouldExpandPreview: false };
  }
  return {
    kind: "resolved",
    node: match.node,
    ancestorPaths: match.ancestorPaths,
    shouldExpandPreview: intent.expandPreview,
  };
}

type JourneyDocumentationSurfaceProps = {
  tree: DocumentationTreeViewState;
  expandedPaths: ReadonlySet<string>;
  selectedNode?: DocumentationNode;
  content: DocumentationContentViewState;
  onToggle: (path: string) => void;
  onSelect: (node: DocumentationNode) => void;
  onOpen?: (node: DocumentationNode) => void;
  onOpenContextMenu?: (
    node: DocumentationNode,
    x: number,
    y: number,
    returnFocusTo: HTMLElement,
  ) => void;
  routingError?: string;
  openError?: string;
  artifactActionError?: string;
  previewExpanded?: boolean;
  onPreviewExpandedChange?: (expanded: boolean) => void;
};

type ArtifactMenuState = {
  node: DocumentationNode;
  x: number;
  y: number;
  returnFocusTo: HTMLElement;
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
  requestedRelativePath,
  requestId,
  expandPreviewOnReveal = false,
  onNavigationRequestSettled = () => undefined,
}: JourneyDocumentationBrowserProps) {
  const [tree, setTree] = useState<DocumentationTreeViewState>({ status: "loading" });
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<DocumentationNode>();
  const [content, setContent] = useState<DocumentationContentViewState>({ status: "idle" });
  const [routingError, setRoutingError] = useState<string>();
  const [openError, setOpenError] = useState<string>();
  const [artifactActionError, setArtifactActionError] = useState<string>();
  const [artifactMenu, setArtifactMenu] = useState<ArtifactMenuState>();
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const treeRequestRef = useRef(0);
  const contentRequestRef = useRef(0);
  const artifactActionRequestRef = useRef(0);

  useEffect(() => {
    const request = ++treeRequestRef.current;
    contentRequestRef.current += 1;
    artifactActionRequestRef.current += 1;
    setExpandedPaths(new Set());
    setSelectedNode(undefined);
    setContent({ status: "idle" });
    setRoutingError(undefined);
    setOpenError(undefined);
    setArtifactActionError(undefined);
    setArtifactMenu(undefined);

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
    setRoutingError(undefined);
    setOpenError(undefined);
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

  useEffect(() => {
    if (!requestedRelativePath || requestId === undefined || tree.status !== "ready") return;
    const resolution = resolveArtifactNavigationIntent(tree.items, {
      relativePath: requestedRelativePath,
      expandPreview: expandPreviewOnReveal,
    });
    if (resolution.kind === "rejected") {
      setRoutingError("The linked Journey document is not visible in the bounded Artifacts workspace.");
      onNavigationRequestSettled(requestId);
      return;
    }
    setExpandedPaths((current) => new Set([...current, ...resolution.ancestorPaths]));
    if (resolution.shouldExpandPreview) setPreviewExpanded(true);
    selectNode(resolution.node);
    onNavigationRequestSettled(requestId);
  }, [requestedRelativePath, requestId, tree, expandPreviewOnReveal]);

  function openArtifactContextMenu(
    node: DocumentationNode,
    x: number,
    y: number,
    returnFocusTo: HTMLElement,
  ) {
    setArtifactActionError(undefined);
    setArtifactMenu({ node, x, y, returnFocusTo });
  }

  async function revealArtifact(node: DocumentationNode) {
    const request = ++artifactActionRequestRef.current;
    setArtifactMenu(undefined);
    setArtifactActionError(undefined);
    try {
      await revealJourneyArtifact(journeyId, node.relativePath);
    } catch (error) {
      if (artifactActionRequestRef.current === request) {
        setArtifactActionError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async function openSelectedNode(node: DocumentationNode) {
    if (node.kind !== "file") return;
    setOpenError(undefined);
    try {
      await openJourneyDocument(journeyId, node.relativePath);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <JourneyDocumentationSurface
        tree={tree}
        expandedPaths={expandedPaths}
        selectedNode={selectedNode}
        content={content}
        onToggle={(path) => setExpandedPaths((current) => toggleExpandedDocumentationPath(current, path))}
        onSelect={selectNode}
        onOpen={(node) => void openSelectedNode(node)}
        onOpenContextMenu={openArtifactContextMenu}
        routingError={routingError}
        openError={openError}
        artifactActionError={artifactActionError}
        previewExpanded={previewExpanded}
        onPreviewExpandedChange={setPreviewExpanded}
      />
      {artifactMenu ? (
        <ArtifactContextMenu
          node={artifactMenu.node}
          x={artifactMenu.x}
          y={artifactMenu.y}
          returnFocusTo={artifactMenu.returnFocusTo}
          onReveal={(node) => void revealArtifact(node)}
          onDismiss={() => setArtifactMenu(undefined)}
        />
      ) : null}
    </>
  );
}

export function JourneyDocumentationSurface({
  tree,
  expandedPaths,
  selectedNode,
  content,
  onToggle,
  onSelect,
  onOpen = () => undefined,
  onOpenContextMenu = () => undefined,
  routingError,
  openError,
  artifactActionError,
  previewExpanded = false,
  onPreviewExpandedChange = () => undefined,
}: JourneyDocumentationSurfaceProps) {
  return (
    <section
      id="operational-artifacts-panel"
      className="operational-artifacts-workspace"
      role="tabpanel"
      aria-label="Journey workspace browser"
    >
      {routingError ? <p className="journey-documentation-routing-error" role="alert">{routingError}</p> : null}
      {artifactActionError ? <p className="journey-documentation-routing-error" role="alert">{artifactActionError}</p> : null}
      <div className={`operational-artifacts-layout${previewExpanded ? " is-preview-expanded" : ""}`}>
        <div id="journey-artifact-workspace-tree" className="operational-artifacts-browser">
          <p className="operational-artifacts-section-label">Workspace structure</p>
          {renderTreeState(tree, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu)}
        </div>
        <div className="operational-artifact-document-viewer">
          <div className="artifact-preview-layout-toolbar">
            <button
              type="button"
              className="artifact-preview-layout-toggle"
              aria-controls="journey-artifact-workspace-tree"
              aria-pressed={previewExpanded}
              onClick={() => onPreviewExpandedChange(!previewExpanded)}
            >
              {previewExpanded ? "Show workspace tree" : "Expand preview"}
            </button>
          </div>
          {renderViewer(selectedNode, content, onOpen, openError)}
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
  onOpenContextMenu: JourneyDocumentationSurfaceProps["onOpenContextMenu"],
): ReactNode {
  if (tree.status === "loading") return <BrowserState title="Reading Journey workspace" detail="Loading the bounded Journey hierarchy…" />;
  if (tree.status === "error") return <BrowserState title="Workspace unavailable" detail={tree.message} />;
  if (tree.status === "empty") return <BrowserState title="This Journey workspace is empty" detail="Artifacts will appear here when the Journey has material to project." />;

  return (
    <div className="journey-documentation-tree-wrap">
      <div className="journey-documentation-root"><ArtifactTypeIcon kind="folder" open /><strong>{tree.rootLabel}</strong></div>
      <ul className="journey-documentation-tree" role="tree" aria-label="Journey workspace">
        {tree.items.map((node) => renderTreeNode(node, 0, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu))}
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
  onOpenContextMenu: JourneyDocumentationSurfaceProps["onOpenContextMenu"],
): ReactNode {
  const expanded = node.kind === "folder" && expandedPaths.has(node.relativePath);
  const selected = selectedNode?.relativePath === node.relativePath;

  function openFromPointer(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    onOpenContextMenu?.(node, event.clientX, event.clientY, event.currentTarget);
  }

  function openFromKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    onOpenContextMenu?.(node, bounds.left + 12, bounds.bottom + 4, event.currentTarget);
  }

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
          onContextMenu={openFromPointer}
          onKeyDown={openFromKeyboard}
          aria-haspopup="menu"
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
          {node.children.map((child) => renderTreeNode(child, depth + 1, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu))}
        </ul>
      ) : null}
    </li>
  );
}

function renderViewer(
  selectedNode: DocumentationNode | undefined,
  content: DocumentationContentViewState,
  onOpen: (node: DocumentationNode) => void,
  openError?: string,
): ReactNode {
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

  const openAction = selectedNode.kind === "file" ? (
    <div className="journey-documentation-open-action">
      <button type="button" onClick={() => onOpen(selectedNode)}>Open file</button>
      {openError ? <p role="alert">{openError}</p> : null}
    </div>
  ) : null;

  if (content.status === "unavailable") {
    return (
      <div className="journey-documentation-detail">
        <p className="operational-artifacts-section-label">Details and metadata</p>
        <ViewerArtifactTitle node={selectedNode} />
        {metadata}
        {openAction}
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
      {openAction}
      <div className={`journey-documentation-body content-${content.previewKind}`}>
        {content.previewKind === "markdown" ? <ArtifactMarkdown content={content.content} /> : <pre>{content.content}</pre>}
      </div>
    </article>
  );
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
