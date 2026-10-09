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
  // CR135: hiding is a presentation choice and mutates nothing, so it is never gated on
  // availability — an entry that needs attention is arguably the one most worth putting away.
  hidden?: boolean;
  onHide: (entry: ConversationCatalogEntry) => void;
  onReveal: (entry: ConversationCatalogEntry) => void;
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

  function toggleVisibility() {
    props.onDismiss();
    if (props.hidden) props.onReveal(props.entry);
    else props.onHide(props.entry);
  }

  // CR135: the label carries reversibility rather than leaving it to a tooltip, because in the
  // Desktop branch this item's neighbour is Delete and this CR exists so the two are never
  // confused. The separator below keeps them from reading as one group.
  const visibilityItem = <button
    type="button"
    role="menuitem"
    className="conversation-visibility-menu-item"
    onClick={toggleVisibility}
    title={props.hidden
      ? "Puts it back in this Journey's conversation list."
      : "Only hides it from this list. Nothing is deleted, and you can reveal it again."}
  >{props.hidden ? "Reveal in List" : "Hide from List (can be revealed)"}</button>;

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
      {visibilityItem}
    </> : <>
      <button type="button" role="menuitem" disabled={props.busy} onClick={renameConversation}>Rename Conversation…</button>
      {visibilityItem}
      <div className="context-menu-separator" role="separator" />
      <button className="danger-menu-item" type="button" role="menuitem" disabled={props.busy} onClick={deleteDesktop}>Delete Conversation…</button>
    </>}
  </div>;
}
