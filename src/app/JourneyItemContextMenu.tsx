import { useEffect, useRef } from "react";

type JourneyItemContextMenuProps = {
  journeyId: string;
  x: number;
  y: number;
  runtimeBusy: boolean;
  pinned: boolean;
  deleteDisabled: boolean;
  deleteTitle: string;
  returnFocusTo: HTMLElement | null;
  onTogglePin: (journeyId: string) => void;
  onEdit: (journeyId: string) => void;
  onCreate: (journeyId: string) => void;
  onMove: (journeyId: string) => void;
  onDelete: (journeyId: string) => void;
  onDismiss: () => void;
};

export function JourneyItemContextMenu({
  journeyId,
  x,
  y,
  runtimeBusy,
  pinned,
  deleteDisabled,
  deleteTitle,
  returnFocusTo,
  onTogglePin,
  onEdit,
  onCreate,
  onMove,
  onDelete,
  onDismiss,
}: JourneyItemContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  const returnFocusRef = useRef(returnFocusTo);
  onDismissRef.current = onDismiss;
  returnFocusRef.current = returnFocusTo;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]:not(:disabled), [role="menuitem"]:not(:disabled)')?.focus();
    }, 0);

    function closeOnOutsidePointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onDismissRef.current();
    }

    function closeWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismissRef.current();
        returnFocusRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, []);

  return (
    <div
      className="journey-item-context-menu"
      role="menu"
      ref={menuRef}
      aria-label="Journey options"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={pinned}
        onClick={() => { onTogglePin(journeyId); onDismiss(); }}
      >
        {pinned ? "Unpin Journey" : "Pin Journey"}
      </button>
      <button type="button" role="menuitem" disabled={runtimeBusy} onClick={() => onEdit(journeyId)}>Edit Journey…</button>
      <button type="button" role="menuitem" disabled={runtimeBusy} onClick={() => onCreate(journeyId)}>Create Journey…</button>
      <button type="button" role="menuitem" disabled={runtimeBusy} onClick={() => onMove(journeyId)}>Move Journey…</button>
      <button
        className="danger-menu-item"
        type="button"
        role="menuitem"
        disabled={runtimeBusy || deleteDisabled}
        title={deleteTitle}
        onClick={() => onDelete(journeyId)}
      >
        Delete Journey…
      </button>
    </div>
  );
}
