import { useEffect, useRef } from "react";
import type { DocumentationNode } from "../domain/journeyDocumentation";

type ArtifactContextMenuProps = {
  node: DocumentationNode;
  x: number;
  y: number;
  returnFocusTo: HTMLElement | null;
  onReveal: (node: DocumentationNode) => void;
  onDismiss: () => void;
};

export function ArtifactContextMenu({
  node,
  x,
  y,
  returnFocusTo,
  onReveal,
  onDismiss,
}: ArtifactContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  const returnFocusRef = useRef(returnFocusTo);
  onDismissRef.current = onDismiss;
  returnFocusRef.current = returnFocusTo;

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

  function revealExactNode() {
    onReveal(node);
    returnFocusRef.current?.focus();
  }

  return (
    <div
      className="artifact-context-menu"
      role="menu"
      ref={menuRef}
      aria-label={`${node.name} options`}
      style={{ left: x, top: y }}
    >
      <button type="button" role="menuitem" onClick={revealExactNode}>
        {node.kind === "folder" ? "Reveal Folder..." : "Reveal File..."}
      </button>
    </div>
  );
}
