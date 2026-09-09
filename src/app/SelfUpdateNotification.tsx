import { useEffect, useRef, useState } from "react";
import { updateQuiescence } from "../domain/updateInstallation";
import { checkForTrustedSelfUpdate, currentMirrorDesktopVersion, installTrustedSelfUpdate, type SelfUpdateCheckResult, type SelfUpdateProgress } from "./selfUpdateStorage";

export type SelfUpdateNotificationProps = {
  runtimeBusy: boolean;
  checkUpdates?: () => Promise<SelfUpdateCheckResult>;
  getCurrentVersion?: () => Promise<string>;
  installUpdate?: typeof installTrustedSelfUpdate;
  initialCurrentVersion?: string;
  initialUpdate?: SelfUpdateCheckResult & { status: "available" };
  initialOpen?: boolean;
  onReview: () => void;
};

type UpdateChipState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: SelfUpdateCheckResult & { status: "available" } }
  | { status: "installing"; update: SelfUpdateCheckResult & { status: "available" }; progress?: SelfUpdateProgress }
  | { status: "error"; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function displayMirrorDesktopVersion(version: string): string {
  const trimmed = version.trim();
  const match = trimmed.match(/^(\d+\.\d+\.\d+)-([a-z]+)\.(\d+)$/i);
  if (!match) return trimmed;
  const [, base, channel, number] = match;
  return `${base}-${channel[0].toLowerCase()}${number}`;
}

export function SelfUpdateNotification({
  runtimeBusy,
  checkUpdates = checkForTrustedSelfUpdate,
  getCurrentVersion = currentMirrorDesktopVersion,
  installUpdate = installTrustedSelfUpdate,
  initialCurrentVersion,
  initialUpdate,
  initialOpen = false,
  onReview,
}: SelfUpdateNotificationProps) {
  const [currentVersion, setCurrentVersion] = useState(initialCurrentVersion ?? initialUpdate?.currentVersion ?? "");
  const [state, setState] = useState<UpdateChipState>(initialUpdate ? { status: "available", update: initialUpdate } : { status: "idle" });
  const [open, setOpen] = useState(initialOpen);
  const [dismissedVersion, setDismissedVersion] = useState<string>();
  const popoverRef = useRef<HTMLDivElement>(null);
  const quiescence = updateQuiescence({
    activePiRuns: runtimeBusy ? 1 : 0,
    pendingConversationCommits: 0,
    pendingProjectionWrites: 0,
    activeFileSnapshots: 0,
  });

  useEffect(() => {
    let cancelled = false;
    if (initialCurrentVersion || initialUpdate?.currentVersion) return () => { cancelled = true; };
    void getCurrentVersion()
      .then((version) => { if (!cancelled) setCurrentVersion(version); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [getCurrentVersion, initialCurrentVersion, initialUpdate?.currentVersion]);

  useEffect(() => {
    let cancelled = false;
    if (initialUpdate) return () => { cancelled = true; };
    setState({ status: "checking" });
    void checkUpdates()
      .then((result) => {
        if (cancelled) return;
        setState(result.status === "available" ? { status: "available", update: result } : { status: "idle" });
        if (result.status === "available") setCurrentVersion(result.currentVersion);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "idle" });
      });
    return () => { cancelled = true; };
  }, [checkUpdates, initialUpdate]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    }
    if (!open) return;
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  async function updateNow() {
    if (state.status !== "available") return;
    if (quiescence.status !== "safe") {
      setState({ status: "error", message: quiescence.reason });
      return;
    }
    const available = state.update;
    setState({ status: "installing", update: available, progress: { downloadedBytes: 0, message: "Downloading verified update…" } });
    try {
      await installUpdate(available.update, (progress) => setState({ status: "installing", update: available, progress }));
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }

  const available = state.status === "available" || state.status === "installing" ? state.update : undefined;
  const fullVersionLabel = currentVersion ? `Mirror Desktop ${currentVersion}` : "Mirror Desktop";
  const compactVersionLabel = currentVersion ? displayMirrorDesktopVersion(currentVersion) : "version";
  const updateDismissed = available && dismissedVersion === available.version;
  const showsAvailable = available && !updateDismissed;
  const chipStatus = state.status === "installing"
    ? "updating…"
    : showsAvailable
      ? "update"
      : undefined;

  return (
    <div className="self-update-chip-wrap" ref={popoverRef}>
      <button
        className={`self-update-chip ${showsAvailable ? "available" : "current"} ${state.status === "installing" ? "installing" : ""}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={showsAvailable ? `Mirror Desktop ${available.version} is available` : `${fullVersionLabel} is up to date`}
      >
        <span>Version: {compactVersionLabel}</span>
        {chipStatus ? <span className="self-update-chip-status">{chipStatus}</span> : null}
      </button>
      {open ? (
        <div className="self-update-popover" role="dialog" aria-label="Mirror Desktop update">
          {showsAvailable ? (
            <>
              <strong>Mirror Desktop update is available.</strong>
              <p className="self-update-version-line">Version: {displayMirrorDesktopVersion(available.currentVersion)}</p>
              <p>Available: {displayMirrorDesktopVersion(available.version)}. This update replaces only the application. Your Journeys, conversations, memory, credentials, and local data remain intact.</p>
              {runtimeBusy ? <p className="settings-error" role="alert">Finish the active runtime operation before updating.</p> : null}
              {state.status === "installing" ? <p className="provider-note" role="status">{state.progress?.message ?? "Installing…"} {state.progress?.totalBytes ? `${Math.round((state.progress.downloadedBytes / state.progress.totalBytes) * 100)}%` : ""}</p> : null}
              {state.status === "error" ? <p className="settings-error" role="alert">{state.message}</p> : null}
              <div className="self-update-popover-actions">
                <button className="secondary-button" type="button" onClick={() => { setDismissedVersion(available.version); setOpen(false); }}>Later</button>
                <button className="secondary-button" type="button" onClick={() => { onReview(); setOpen(false); }}>Details</button>
                <button type="button" onClick={() => void updateNow()} disabled={state.status === "installing" || runtimeBusy}>Update</button>
              </div>
            </>
          ) : (
            <>
              <strong>Mirror Desktop</strong>
              <p className="self-update-version-line">Version: {compactVersionLabel}</p>
              <p>You are up to date.</p>
              <div className="self-update-popover-actions">
                <button className="secondary-button" type="button" onClick={() => setOpen(false)}>Close</button>
                <button className="secondary-button" type="button" onClick={() => { onReview(); setOpen(false); }}>Update settings</button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
