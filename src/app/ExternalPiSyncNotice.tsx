type ExternalPiSyncNoticeProps = {
  reason?: string;
};

export function ExternalPiSyncNotice({ reason: _reason }: ExternalPiSyncNoticeProps) {
  return (
    <aside className="conversation-sync-notice external-pi-sync-notice" aria-label="External Pi reconciliation required">
      <div>
        <strong>Pi conversation changed outside Nautilus</strong>
        <span>Review required</span>
      </div>
    </aside>
  );
}
