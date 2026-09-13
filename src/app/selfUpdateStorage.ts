import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { verifyReleaseReading, type ReleaseReading } from "../domain/releaseReading";
import { preparePendingRelease } from "./whatsNewStorage";

export type SelfUpdateCheckResult =
  | { status: "current" }
  | { status: "available"; update: Update; version: string; currentVersion: string; notes?: string; date?: string; releaseReading?: ReleaseReading };

export type SelfUpdateProgress = {
  downloadedBytes: number;
  totalBytes?: number;
  message: string;
};

export async function currentMirrorDesktopVersion(): Promise<string> {
  return getVersion();
}

export async function checkForTrustedSelfUpdate(): Promise<SelfUpdateCheckResult> {
  const update = await check({ timeout: 15000 });
  if (!update) return { status: "current" };
  const releaseReading = await verifyReleaseReading(update.rawJson?.release_reading, update.version);
  return {
    status: "available",
    update,
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body,
    date: update.date,
    releaseReading,
  };
}

export async function installTrustedSelfUpdate(
  update: Update,
  onProgress: (progress: SelfUpdateProgress) => void,
  releaseReading?: ReleaseReading,
): Promise<void> {
  await preparePendingRelease(releaseReading);
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
