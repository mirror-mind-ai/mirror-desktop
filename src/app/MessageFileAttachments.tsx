import type { ConversationMessage } from "../agent/piTaskPacket";
import type { FileAttachment } from "../domain/fileAttachments";
import { openFileAttachment } from "./fileAttachmentStorage";

export function MessageFileAttachments({ attachments }: { attachments?: ConversationMessage["attachments"] }) {
  const files = (attachments ?? []).filter((attachment): attachment is FileAttachment => attachment.schemaVersion === "0.2.0");
  if (!files.length) return null;
  return (
    <section className="message-file-attachments" aria-label="Files attached to this message">
      <strong>Files attached</strong>
      <div className="message-file-list">
        {files.map((file) => (
          <button type="button" key={file.attachmentId} className="message-file-item" title={`Open ${file.absolutePath}`} onClick={() => void openFileAttachment(file.absolutePath)}>
            {file.thumbnail ? <img src={file.thumbnail.dataUrl} width={file.thumbnail.width} height={file.thumbnail.height} alt={`Preview of ${file.displayName}`} /> : <span className="file-attachment-glyph" aria-hidden="true">▧</span>}
            <span><strong>{file.displayName}</strong><small>{file.absolutePath}</small></span>
          </button>
        ))}
      </div>
    </section>
  );
}
