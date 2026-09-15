import { clampFocusedSidebarWidth, DEFAULT_FOCUSED_SIDEBAR_WIDTH } from "../domain/conversationSpaces";

const KEY_PREFIX = "mirror-desktop:focused-sidebar-width:v1";

export function loadFocusedSidebarWidth(channel: string, viewportWidth: number): number {
  try {
    const value = Number(window.localStorage.getItem(`${KEY_PREFIX}:${channel}`));
    return clampFocusedSidebarWidth(Number.isFinite(value) && value > 0 ? value : DEFAULT_FOCUSED_SIDEBAR_WIDTH, viewportWidth);
  } catch {
    return clampFocusedSidebarWidth(DEFAULT_FOCUSED_SIDEBAR_WIDTH, viewportWidth);
  }
}

export function saveFocusedSidebarWidth(channel: string, width: number, viewportWidth: number): number {
  const clamped = clampFocusedSidebarWidth(width, viewportWidth);
  try {
    window.localStorage.setItem(`${KEY_PREFIX}:${channel}`, String(clamped));
  } catch {
    // The bounded in-memory width remains usable when persistence is unavailable.
  }
  return clamped;
}
