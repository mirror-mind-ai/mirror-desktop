import type { MirrorReconciliationReview } from "../domain/mirrorOnlyReconciliation";

type MirrorReconciliationNoticeProps = {
  review: MirrorReconciliationReview;
  disabled: boolean;
  error?: string;
  onApply: () => void;
};

export function MirrorReconciliationNotice({ review, disabled, error, onApply }: MirrorReconciliationNoticeProps) {
  const eligible = review.status === "eligible";
  const independentlyReviewed = review.status === "independent" || review.reasonCode === "independent_pi_advancement";
  const actionable = eligible || independentlyReviewed;
  return (
    <aside className="conversation-sync-notice mirror-reconciliation-notice" aria-label="Mirror reconciliation review">
      <details>
        <summary>
          <strong>{eligible ? "Mirror has newer conversation turns" : "Mirror conversation needs review"}</strong>
          <span>{review.messages.length} records · Review</span>
        </summary>
        <div className="mirror-reconciliation-preview">
          <p>Source: mapped Mirror conversation {review.fingerprint.conversationId.slice(0, 8)}</p>
          <div className="mirror-reconciliation-records" aria-label="Mirror conversation records" tabIndex={0}>
            {review.messages.map((message) => (
              <div key={message.id} className="mirror-reconciliation-record">
                <strong>{message.role === "user" ? "You" : "Mirror"}</strong>
                <span>{message.createdAt}</span>
                <p>{message.content.slice(0, 500)}{message.content.length > 500 ? "…" : ""}</p>
              </div>
            ))}
          </div>
          {independentlyReviewed ? (
            <p>Pi and Mirror advanced independently. Review both visible copies before creating a shared explicit baseline.</p>
          ) : null}
          <div className="mirror-reconciliation-actions">
            {actionable ? (
              <button type="button" disabled={disabled} onClick={onApply}>
                {disabled ? "Reconciling…" : independentlyReviewed ? "Create reviewed convergence branch" : "Create reconciled Pi branch"}
              </button>
            ) : (
              <p>Reconciliation unavailable: {review.reasonCode ?? review.status}.</p>
            )}
            {error ? <p role="alert">{error}</p> : null}
          </div>
        </div>
      </details>
    </aside>
  );
}
