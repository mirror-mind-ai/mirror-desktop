import type { ConversationAttachmentProvenance } from "../domain/contextAttachments";

export function MessageAttachmentProvenance({ attachments }: { attachments?: ConversationAttachmentProvenance[] }) {
  if (!attachments?.length) return null;
  return (
    <section className="message-attachment-provenance" aria-label="Context used for this turn">
      <strong>Attached context</strong>
      <ul>
        {attachments.map((attachment) => (
          <li key={attachment.attachmentId}>
            <span>{attachment.displayName}</span>
            <small>{attachment.relativePath} · {attachment.sizeBytes} bytes · {attachment.sha256.slice(0, 12)}…</small>
          </li>
        ))}
      </ul>
      <p>Historical snapshot provenance — no current file authority.</p>
    </section>
  );
}
