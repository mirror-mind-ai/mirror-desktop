import type { ReconciliationClassification } from "../domain/conversationReconciliation";

type ConversationAuthorityNoticeProps = {
  classification: ReconciliationClassification;
  checking: boolean;
  disabled?: boolean;
  onReview: () => void;
};

export function ConversationAuthorityNotice({
  classification,
  checking,
  disabled = false,
  onReview,
}: ConversationAuthorityNoticeProps) {
  const message = checking
    ? "Checking the linked Pi session and Mirror conversation before another command can run."
    : classification === "uninitialized"
      ? "This local transcript has not established a canonical Pi and Mirror baseline."
      : "The local transcript differs from its linked Pi or Mirror authority.";

  return (
    <section className="conversation-authority-notice" aria-label="Conversation synchronization required" role="status">
      <div>
        <strong>Conversation not synchronized</strong>
        <p>{message} Review and reload the canonical conversation before continuing.</p>
      </div>
      <button type="button" onClick={onReview} disabled={disabled || checking}>
        Review and reload
      </button>
    </section>
  );
}
