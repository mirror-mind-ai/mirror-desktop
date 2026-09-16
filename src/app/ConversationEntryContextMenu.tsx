import { useEffect, useRef } from "react";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;
type DesktopEntry = Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>;

type Props = {
  entry: ConversationCatalogEntry;
  x: number;
  y: number;
  busy?: boolean;
  returnFocusTo: HTMLElement | null;
  onContinue: (entry: MirrorEntry) => void;
  onOpenTerminal: (entry: MirrorEntry) => void;
  onRename: (entry: ConversationCatalogEntry) => void;
  onDeleteDesktop: (entry: DesktopEntry) => void;
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

  function invokeMirror(action: (entry: MirrorEntry) => void) {
    if (props.entry.kind !== "mirror_history") return;
    props.onDismiss();
    action(props.entry);
  }

  function renameConversation() {
    props.onDismiss();
    props.onRename(props.entry);
  }

  function deleteDesktop() {
    if (props.entry.kind !== "desktop_conversation") return;
    props.onDismiss();
    props.onDeleteDesktop(props.entry);
  }

  return <div
    className="journey-item-context-menu conversation-entry-context-menu"
    role="menu"
    ref={menuRef}
    aria-label={`${props.entry.title} options`}
    style={{ left: props.x, top: props.y }}
  >
    {props.entry.kind === "mirror_history" ? <>
      <button type="button" role="menuitem" disabled={props.busy} onClick={() => invokeMirror(props.onContinue)}>Continue in new Desktop Conversation</button>
      <button type="button" role="menuitem" disabled={props.busy} onClick={() => invokeMirror(props.onOpenTerminal)}>Continue with recalled context in Terminal</button>
      <button type="button" role="menuitem" disabled={props.busy} onClick={renameConversation}>Rename in Mirror…</button>
    </> : <>
      <button type="button" role="menuitem" disabled={props.busy} onClick={renameConversation}>Rename Conversation…</button>
      <button className="danger-menu-item" type="button" role="menuitem" disabled={props.busy} onClick={deleteDesktop}>Delete Conversation…</button>
    </>}
  </div>;
}
