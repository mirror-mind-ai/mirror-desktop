import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

export type SelfUpdateCheckResult =
  | { status: "current" }
  | { status: "available"; update: Update; version: string; currentVersion: string; notes?: string; date?: string };

export type SelfUpdateProgress = {
  downloadedBytes: number;
  totalBytes?: number;
  message: string;
};

export async function checkForTrustedSelfUpdate(): Promise<SelfUpdateCheckResult> {
  const update = await check({ timeout: 15000 });
  if (!update) return { status: "current" };
  return {
    status: "available",
    update,
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body,
    date: update.date,
  };
}

export async function installTrustedSelfUpdate(
  update: Update,
  onProgress: (progress: SelfUpdateProgress) => void,
): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes: number | undefined;
  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      totalBytes = event.data.contentLength;
      onProgress({ downloadedBytes, totalBytes, message: "Downloading verified update…" });
      return;
    }
    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      onProgress({ downloadedBytes, totalBytes, message: "Downloading verified update…" });
      return;
    }
    onProgress({ downloadedBytes, totalBytes, message: "Installing update…" });
  });
  await relaunch();
}
