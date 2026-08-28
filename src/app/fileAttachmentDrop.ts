import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { UnlistenFn } from "@tauri-apps/api/event";

export type FileDropHandlers = {
  onActiveChange: (active: boolean) => void;
  onDrop: (paths: string[]) => void;
};

export async function listenForFileAttachments({ onActiveChange, onDrop }: FileDropHandlers): Promise<UnlistenFn> {
  return getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === "enter") onActiveChange(true);
    if (event.payload.type === "leave") onActiveChange(false);
    if (event.payload.type === "drop") {
      onActiveChange(false);
      if (event.payload.paths.length) onDrop(event.payload.paths);
    }
  });
}
