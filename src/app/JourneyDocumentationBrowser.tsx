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
  loadedDocumentationPaths,
  replaceDocumentationNodeChildren,
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
  treeActionError?: string;
  treeReloading?: boolean;
  loadingPaths?: ReadonlySet<string>;
  onReload?: () => void;
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
  const [treeActionError, setTreeActionError] = useState<string>();
  const [treeReloading, setTreeReloading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [artifactMenu, setArtifactMenu] = useState<ArtifactMenuState>();
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const treeRequestRef = useRef(0);
  const folderRequestSequenceRef = useRef(0);
  const folderRequestsRef = useRef<Map<string, number>>(new Map());
  const contentRequestRef = useRef(0);
  const artifactActionRequestRef = useRef(0);

  async function loadTree(preserveView: boolean) {
    const request = ++treeRequestRef.current;
    folderRequestsRef.current.clear();
    contentRequestRef.current += 1;
    artifactActionRequestRef.current += 1;
    setLoadingPaths(new Set());
    setTreeActionError(undefined);
    if (preserveView) {
      setTreeReloading(true);
    } else {
      setExpandedPaths(new Set());
      setSelectedNode(undefined);
      setContent({ status: "idle" });
      setRoutingError(undefined);
      setOpenError(undefined);
      setArtifactActionError(undefined);
      setArtifactMenu(undefined);
      setTree({ status: "loading" });
    }

    try {
      const root = await listJourneyDocumentation(journeyId);
      if (treeRequestRef.current !== request) return;
      let items = root.items;
      if (preserveView) {
        const paths = [...expandedPaths].sort((left, right) => left.split("/").length - right.split("/").length);
        for (const path of paths) {
          if (treeRequestRef.current !== request) return;
          const match = findDocumentationNode(items, path);
          if (!match || match.node.kind !== "folder") continue;
          const children = await listJourneyDocumentation(journeyId, path);
          if (treeRequestRef.current !== request) return;
          items = replaceDocumentationNodeChildren(items, path, children.items);
        }
      }
      const nextTree = { ...root, items };
      setTree(nextTree);
      const availablePaths = loadedDocumentationPaths(items);
      setExpandedPaths((current) => new Set([...current].filter((path) => availablePaths.has(path))));
      if (preserveView && selectedNode) {
        const refreshed = findDocumentationNode(items, selectedNode.relativePath)?.node;
        if (refreshed) selectNode(refreshed);
        else {
          setSelectedNode(undefined);
          setContent({ status: "idle" });
          setTreeActionError("The previously selected artifact is no longer present.");
        }
      }
    } catch {
      if (treeRequestRef.current !== request) return;
      if (preserveView) {
        setTreeActionError("The Journey workspace could not be reloaded. The last successful tree is still shown.");
      } else {
        setTree({ status: "error", message: `${journeyName}'s bounded workspace read could not be completed.` });
      }
    } finally {
      if (treeRequestRef.current === request) setTreeReloading(false);
    }
  }

  useEffect(() => {
    void loadTree(false);
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

  async function toggleFolder(node: DocumentationNode) {
    if (expandedPaths.has(node.relativePath)) {
      setExpandedPaths((current) => toggleExpandedDocumentationPath(current, node.relativePath));
      return;
    }
    setExpandedPaths((current) => new Set(current).add(node.relativePath));
    if (node.childrenLoaded !== false) return;

    const request = ++folderRequestSequenceRef.current;
    const treeRequest = treeRequestRef.current;
    folderRequestsRef.current.set(node.relativePath, request);
    setLoadingPaths((current) => new Set(current).add(node.relativePath));
    setTreeActionError(undefined);
    try {
      const children = await listJourneyDocumentation(journeyId, node.relativePath);
      if (treeRequestRef.current !== treeRequest || folderRequestsRef.current.get(node.relativePath) !== request) return;
      setTree((current) => current.status === "ready"
        ? { ...current, items: replaceDocumentationNodeChildren(current.items, node.relativePath, children.items) }
        : current);
    } catch {
      if (treeRequestRef.current === treeRequest && folderRequestsRef.current.get(node.relativePath) === request) {
        setTreeActionError(`Could not load ${node.relativePath}. Already loaded artifacts remain available.`);
      }
    } finally {
      if (folderRequestsRef.current.get(node.relativePath) === request) {
        folderRequestsRef.current.delete(node.relativePath);
        setLoadingPaths((current) => {
          const next = new Set(current);
          next.delete(node.relativePath);
          return next;
        });
      }
    }
  }

  useEffect(() => {
    if (!requestedRelativePath || requestId === undefined || tree.status !== "ready") return;
    const treeRequest = treeRequestRef.current;
    let cancelled = false;
    void (async () => {
      let items = tree.items;
      const components = requestedRelativePath.split("/");
      const ancestorPaths = components.slice(0, -1).map((_, index) => components.slice(0, index + 1).join("/"));
      try {
        for (const path of ancestorPaths) {
          const match = findDocumentationNode(items, path);
          if (!match || match.node.kind !== "folder") break;
          if (match.node.childrenLoaded === false) {
            const children = await listJourneyDocumentation(journeyId, path);
            if (cancelled || treeRequestRef.current !== treeRequest) return;
            items = replaceDocumentationNodeChildren(items, path, children.items);
          }
        }
        if (cancelled || treeRequestRef.current !== treeRequest) return;
        setTree((current) => current.status === "ready" ? { ...current, items } : current);
        const resolution = resolveArtifactNavigationIntent(items, {
          relativePath: requestedRelativePath,
          expandPreview: expandPreviewOnReveal,
        });
        if (resolution.kind === "rejected") {
          setRoutingError("The linked Journey document is not visible in the bounded Artifacts workspace.");
        } else {
          setExpandedPaths((current) => new Set([...current, ...resolution.ancestorPaths]));
          if (resolution.shouldExpandPreview) setPreviewExpanded(true);
          selectNode(resolution.node);
        }
      } catch {
        if (!cancelled) setRoutingError("The linked Journey document could not be loaded within the bounded Artifacts workspace.");
      } finally {
        if (!cancelled) onNavigationRequestSettled(requestId);
      }
    })();
    return () => { cancelled = true; };
  }, [requestedRelativePath, requestId, tree.status, expandPreviewOnReveal]);

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
        onToggle={(path) => {
          if (tree.status !== "ready") return;
          const node = findDocumentationNode(tree.items, path)?.node;
          if (node?.kind === "folder") void toggleFolder(node);
        }}
        onSelect={selectNode}
        onOpen={(node) => void openSelectedNode(node)}
        onOpenContextMenu={openArtifactContextMenu}
        routingError={routingError}
        openError={openError}
        artifactActionError={artifactActionError}
        treeActionError={treeActionError}
        treeReloading={treeReloading}
        loadingPaths={loadingPaths}
        onReload={() => void loadTree(true)}
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
  treeActionError,
  treeReloading = false,
  loadingPaths = new Set(),
  onReload = () => undefined,
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
          <div className="operational-artifacts-tree-toolbar">
            <p className="operational-artifacts-section-label">Workspace structure</p>
            <button
              type="button"
              className="artifact-tree-reload"
              onClick={onReload}
              disabled={treeReloading || tree.status === "loading"}
              aria-label="Reload workspace"
              title="Reload workspace"
            >
              <span aria-hidden="true">↻</span>
            </button>
          </div>
          <p className="operational-artifacts-visibility-note">Private and high-volume generated internals are hidden; release bundles remain available.</p>
          {treeActionError ? <p className="journey-documentation-routing-error" role="alert">{treeActionError}</p> : null}
          {treeReloading ? <p className="artifact-tree-reloading" role="status">Reloading workspace…</p> : null}
          {renderTreeState(tree, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu, loadingPaths)}
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
  loadingPaths: ReadonlySet<string>,
): ReactNode {
  if (tree.status === "loading") return <BrowserState title="Reading Journey workspace" detail="Loading the bounded Journey hierarchy…" />;
  if (tree.status === "error") return <BrowserState title="Workspace unavailable" detail={tree.message} />;
  if (tree.status === "empty") return <BrowserState title="This Journey workspace is empty" detail="Artifacts will appear here when the Journey has material to project." />;

  return (
    <div className="journey-documentation-tree-wrap">
      <div className="journey-documentation-root"><ArtifactTypeIcon kind="folder" open /><strong>{tree.rootLabel}</strong></div>
      <ul className="journey-documentation-tree" role="tree" aria-label="Journey workspace">
        {tree.items.map((node) => renderTreeNode(node, 0, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu, loadingPaths))}
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
  loadingPaths: ReadonlySet<string>,
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
      {node.kind === "folder" && expanded && loadingPaths.has(node.relativePath) ? (
        <p className="artifact-tree-folder-loading" role="status">Loading {node.name}…</p>
      ) : null}
      {node.kind === "folder" && expanded && node.children.length > 0 ? (
        <ul role="group">
          {node.children.map((child) => renderTreeNode(child, depth + 1, expandedPaths, selectedNode, onToggle, onSelect, onOpenContextMenu, loadingPaths))}
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
