import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import {
  clampFocusedSidebarWidth,
  MAX_FOCUSED_SIDEBAR_WIDTH,
  MIN_FOCUSED_SIDEBAR_WIDTH,
} from "../domain/conversationSpaces";

type Props = { width: number; viewportWidth: number; onChange: (width: number) => void };
type DragOrigin = { pointerId: number; x: number; width: number };

export function FocusedSidebarResizeHandle({ width, viewportWidth, onChange }: Props) {
  const dragOrigin = useRef<DragOrigin | null>(null);

  useEffect(() => () => document.body.classList.remove("is-resizing-sidebar"), []);

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragOrigin.current = { pointerId: event.pointerId, x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-sidebar");
  }

  function continueResize(event: PointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    event.preventDefault();
    onChange(clampFocusedSidebarWidth(origin.width + event.clientX - origin.x, window.innerWidth));
  }

  function stopResize(event: PointerEvent<HTMLDivElement>) {
    if (dragOrigin.current?.pointerId !== event.pointerId) return;
    dragOrigin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove("is-resizing-sidebar");
  }

  function resizeFromKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const requested = event.key === "ArrowLeft" ? width - 8
      : event.key === "ArrowRight" ? width + 8
        : event.key === "Home" ? MIN_FOCUSED_SIDEBAR_WIDTH
          : event.key === "End" ? MAX_FOCUSED_SIDEBAR_WIDTH
            : undefined;
    if (requested === undefined) return;
    event.preventDefault();
    onChange(clampFocusedSidebarWidth(requested, viewportWidth));
  }

  return <div
    className="focused-sidebar-resize-handle"
    role="separator"
    aria-label="Resize Journey sidebar"
    aria-orientation="vertical"
    aria-valuemin={MIN_FOCUSED_SIDEBAR_WIDTH}
    aria-valuemax={clampFocusedSidebarWidth(MAX_FOCUSED_SIDEBAR_WIDTH, viewportWidth)}
    aria-valuenow={width}
    tabIndex={0}
    onPointerDown={startResize}
    onPointerMove={continueResize}
    onPointerUp={stopResize}
    onPointerCancel={stopResize}
    onLostPointerCapture={() => {
      dragOrigin.current = null;
      document.body.classList.remove("is-resizing-sidebar");
    }}
    onKeyDown={resizeFromKeyboard}
  />;
}
