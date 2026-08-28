import type { ContextAttachmentSnapshot } from "../domain/contextAttachments";

type Props = {
  snapshots: ContextAttachmentSnapshot[];
  disabled?: boolean;
  onRemove: (attachmentId: string) => void;
  onClear: () => void;
};

function formatBytes(value: number) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KiB`;
}

export function PendingContextAttachments({ snapshots, disabled, onRemove, onClear }: Props) {
  if (snapshots.length === 0) return null;
  return (
    <section className="pending-context" aria-label="Pending Journey context">
      <header><strong>{snapshots.length} context snapshot{snapshots.length === 1 ? "" : "s"}</strong><button type="button" onClick={onClear} disabled={disabled}>Clear all</button></header>
      <div className="pending-context-list">
        {snapshots.map((snapshot) => (
          <details key={snapshot.attachmentId} className="pending-context-item">
            <summary><span>⌕</span><span><strong>{snapshot.displayName}</strong><small>{snapshot.relativePath} · {formatBytes(snapshot.sizeBytes)} · {snapshot.sha256.slice(0, 12)}…</small></span></summary>
            <div className="pending-context-detail">
              <p>Captured {new Date(snapshot.capturedAt).toLocaleString()} as an immutable snapshot.</p>
              <pre>{snapshot.content}</pre>
              <button type="button" onClick={() => onRemove(snapshot.attachmentId)} disabled={disabled}>Remove context</button>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
