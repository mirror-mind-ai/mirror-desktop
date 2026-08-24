type ConversationSyncNoticeProps = {
  retrying: boolean;
  error?: string;
  onRetry: () => void;
};

export function ConversationSyncNotice({ retrying, error, onRetry }: ConversationSyncNoticeProps) {
  return (
    <div className="conversation-sync-notice" role="status" aria-live="polite">
      <span>{error ? `Mirror conversation commit incomplete: ${error}` : "Mirror conversation commit incomplete"}</span>
      <button type="button" className="secondary-button" onClick={onRetry} disabled={retrying}>
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
