import { useEffect, useRef } from "react";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;

type Props = {
  entry: MirrorEntry;
  x: number;
  y: number;
  busy?: boolean;
  returnFocusTo: HTMLElement | null;
  onContinue: (entry: MirrorEntry) => void;
  onOpenTerminal: (entry: MirrorEntry) => void;
  onRename: (entry: MirrorEntry) => void;
  onDismiss: () => void;
};

export function ConversationEntryContextMenu(props: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(props.onDismiss);
  const returnFocusRef = useRef(props.returnFocusTo);
  onDismissRef.current = props.onDismiss;
  returnFocusRef.current = props.returnFocusTo;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
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

  function invoke(action: (entry: MirrorEntry) => void) {
    props.onDismiss();
    action(props.entry);
  }

  return <div
    className="journey-item-context-menu conversation-entry-context-menu"
    role="menu"
    ref={menuRef}
    aria-label={`${props.entry.title} options`}
    style={{ left: props.x, top: props.y }}
  >
    <button type="button" role="menuitem" disabled={props.busy} onClick={() => invoke(props.onContinue)}>Continue in new Desktop Conversation</button>
    <button type="button" role="menuitem" disabled={props.busy} onClick={() => invoke(props.onOpenTerminal)}>Continue with recalled context in Terminal</button>
    <button type="button" role="menuitem" disabled={props.busy} onClick={() => invoke(props.onRename)}>Rename in Mirror…</button>
  </div>;
}
