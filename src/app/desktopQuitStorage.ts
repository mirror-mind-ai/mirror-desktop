import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// CR085: closing the window only hides it, so the backend announces a real Navigator quit here.
// The window owns the decision because only it knows the Composer drafts and the visible work.
const DESKTOP_QUIT_REQUESTED_EVENT = "mirror-desktop-quit-requested";

export async function listenForDesktopQuitRequest(onRequested: () => void): Promise<() => void> {
  return await listen(DESKTOP_QUIT_REQUESTED_EVENT, () => onRequested());
}

export async function confirmDesktopQuitRequest(): Promise<void> {
  await invoke("confirm_desktop_quit");
}

export async function cancelDesktopQuitRequest(): Promise<void> {
  await invoke("cancel_desktop_quit");
}
