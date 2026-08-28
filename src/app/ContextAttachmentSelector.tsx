import { useEffect, useMemo, useState } from "react";
import type { DocumentationNode, DocumentationTreeViewState } from "../domain/journeyDocumentation";
import type { ContextAttachmentSnapshotResponse } from "../domain/contextAttachments";
import { listJourneyDocumentation } from "./journeyDocumentationStorage";
import { snapshotJourneyContext } from "./contextAttachmentStorage";

type Props = {
  journeyId: string;
  journeyName: string;
  existingPaths: string[];
  onAdd: (response: ContextAttachmentSnapshotResponse) => void;
  onClose: () => void;
};

function flattenFiles(nodes: DocumentationNode[]): DocumentationNode[] {
  return nodes.flatMap((node) => node.kind === "file" ? [node] : flattenFiles(node.children));
}

export function ContextAttachmentSelector({ journeyId, journeyName, existingPaths, onAdd, onClose }: Props) {
  const [tree, setTree] = useState<DocumentationTreeViewState>({ status: "loading" });
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    listJourneyDocumentation(journeyId).then((value) => {
      if (!cancelled) setTree(value);
    }).catch((reason) => {
      if (!cancelled) setTree({ status: "error", message: reason instanceof Error ? reason.message : String(reason) });
    });
    return () => { cancelled = true; };
  }, [journeyId]);

  const files = useMemo(() => tree.status === "ready" ? flattenFiles(tree.items) : [], [tree]);
  const attachable = files.filter((file) => file.previewKind === "markdown" || file.previewKind === "text");
  const remainingCapacity = Math.max(0, 8 - existingPaths.length);

  function toggle(path: string) {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function confirm() {
    if (selectedPaths.size === 0 || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await snapshotJourneyContext(journeyId, [...selectedPaths]);
      onAdd(response);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="context-selector-backdrop" role="presentation" onClick={() => !busy && onClose()}>
      <section className="context-selector" role="dialog" aria-modal="true" aria-label="Attach Journey context" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow">Bounded context</p><h2>Attach from {journeyName}</h2></div>
          <button type="button" className="icon-button" aria-label="Close context selector" onClick={onClose} disabled={busy}>✕</button>
        </header>
        <p className="context-selector-intro">Select visible text snapshots for the next explicit turn. Selection does not invoke the agent.</p>
        {tree.status === "loading" ? <p role="status">Loading Journey files…</p> : null}
        {tree.status === "error" ? <p role="alert">{tree.message}</p> : null}
        {tree.status === "empty" ? <p>No visible Journey files are available.</p> : null}
        {tree.status === "ready" ? (
          <div className="context-selector-list" role="group" aria-label="Journey text files">
            {files.map((file) => {
              const supported = file.previewKind === "markdown" || file.previewKind === "text";
              const alreadyAttached = existingPaths.includes(file.relativePath);
              return (
                <label key={file.relativePath} className={`context-selector-row${supported ? "" : " is-disabled"}`}>
                  <input type="checkbox" checked={selectedPaths.has(file.relativePath) || alreadyAttached} disabled={!supported || alreadyAttached || busy || (!selectedPaths.has(file.relativePath) && selectedPaths.size >= remainingCapacity)} onChange={() => toggle(file.relativePath)} />
                  <span><strong>{file.name}</strong><small>{file.relativePath}{file.sizeBytes == null ? "" : ` · ${file.sizeBytes} bytes`}</small></span>
                  {!supported ? <em>Unsupported</em> : alreadyAttached ? <em>Attached</em> : null}
                </label>
              );
            })}
            {attachable.length === 0 ? <p>No supported Markdown or text files are available.</p> : null}
          </div>
        ) : null}
        {error ? <p className="context-selector-error" role="alert">{error}</p> : null}
        <footer>
          <span>{selectedPaths.size} selected · {remainingCapacity} available</span>
          <div><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="primary-button" onClick={() => void confirm()} disabled={selectedPaths.size === 0 || selectedPaths.size > remainingCapacity || busy}>{busy ? "Capturing…" : "Attach context"}</button></div>
        </footer>
      </section>
    </div>
  );
}
