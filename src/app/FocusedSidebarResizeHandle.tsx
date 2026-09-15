import type { KeyboardEvent, PointerEvent } from "react";
import {
  clampFocusedSidebarWidth,
  MAX_FOCUSED_SIDEBAR_WIDTH,
  MIN_FOCUSED_SIDEBAR_WIDTH,
} from "../domain/conversationSpaces";

type Props = { width: number; viewportWidth: number; onChange: (width: number) => void };

export function FocusedSidebarResizeHandle({ width, viewportWidth, onChange }: Props) {
  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const originX = event.clientX;
    const originWidth = width;
    const move = (next: globalThis.PointerEvent) => onChange(clampFocusedSidebarWidth(originWidth + next.clientX - originX, window.innerWidth));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
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
    aria-label="Resize conversation sidebar"
    aria-orientation="vertical"
    aria-valuemin={MIN_FOCUSED_SIDEBAR_WIDTH}
    aria-valuemax={clampFocusedSidebarWidth(MAX_FOCUSED_SIDEBAR_WIDTH, viewportWidth)}
    aria-valuenow={width}
    tabIndex={0}
    onPointerDown={startResize}
    onKeyDown={resizeFromKeyboard}
  />;
}
