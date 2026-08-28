import type { FileAttachment } from "../domain/fileAttachments";
import { openFileAttachment } from "./fileAttachmentStorage";

type Props = {
  attachments: FileAttachment[];
  disabled?: boolean;
  onRemove: (attachmentId: string) => void;
  onClear: () => void;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

export function PendingFileAttachments({ attachments, disabled, onRemove, onClear }: Props) {
  if (!attachments.length) return null;
  return (
    <section className="pending-files" aria-label="Files selected for the next message">
      <header>
        <strong>{attachments.length} file{attachments.length === 1 ? "" : "s"} selected</strong>
        <button type="button" onClick={onClear} disabled={disabled}>Clear all</button>
      </header>
      <div className="pending-file-list">
        {attachments.map((attachment) => (
          <article key={attachment.attachmentId} className="pending-file-item">
            {attachment.thumbnail ? <img src={attachment.thumbnail.dataUrl} width={attachment.thumbnail.width} height={attachment.thumbnail.height} alt={`Preview of ${attachment.displayName}`} /> : <span className="file-attachment-glyph" aria-hidden="true">▧</span>}
            <div>
              <strong>{attachment.displayName}</strong>
              <button type="button" className="file-path-button" title={`Open ${attachment.absolutePath}`} onClick={() => void openFileAttachment(attachment.absolutePath)}>{attachment.absolutePath}</button>
              <small>{formatBytes(attachment.sizeBytes)}</small>
            </div>
            <button type="button" className="remove-file-button" onClick={() => onRemove(attachment.attachmentId)} disabled={disabled} aria-label={`Remove file ${attachment.displayName}`}>Remove file</button>
          </article>
        ))}
      </div>
    </section>
  );
}
