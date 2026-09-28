type ComposerContextMenuProps = {
  canCompact: boolean;
  compacting: boolean;
  /** Why compaction is refused right now, when it is. */
  unavailableReason?: string;
  onCompactNow: () => void;
};

// CR080: the menu behind the Composer's context label. Manual compaction is the escape
// hatch — before a model switch, or to close a chapter deliberately — while automatic
// compaction stays the common path. It reuses the intent menu's popover classes, which
// already claim back the pointer events the Composer footer disables for its subtree.
export function ComposerContextMenu({
  canCompact,
  compacting,
  unavailableReason,
  onCompactNow,
}: ComposerContextMenuProps) {
  const refused = !canCompact || compacting;
  return (
    <div className="model-intent-menu composer-context-menu" role="menu" aria-label="Context window actions">
      <button
        type="button"
        role="menuitem"
        className="model-intent-menu-item"
        disabled={refused}
        title={!canCompact ? unavailableReason : undefined}
        onClick={onCompactNow}
      >
        <span className="model-intent-menu-label">{compacting ? "Compacting…" : "Compact now"}</span>
        <span className="model-intent-binding">
          Closes a chapter: Pi summarizes the conversation so far and continues on the summary.
        </span>
        {!canCompact && unavailableReason ? (
          <span className="model-intent-unavailable">{unavailableReason}</span>
        ) : null}
      </button>
    </div>
  );
}
