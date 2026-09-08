import { useState } from "react";
import { requireUpdateConsent, updateQuiescence } from "../domain/updateInstallation";
import { checkForTrustedSelfUpdate, installTrustedSelfUpdate, type SelfUpdateCheckResult, type SelfUpdateProgress } from "./selfUpdateStorage";

export type SelfUpdatePanelProps = {
  runtimeBusy: boolean;
  checkUpdates?: () => Promise<SelfUpdateCheckResult>;
  installUpdate?: typeof installTrustedSelfUpdate;
};

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "current" }
  | { status: "available"; update: SelfUpdateCheckResult & { status: "available" } }
  | { status: "installing"; update: SelfUpdateCheckResult & { status: "available" }; progress?: SelfUpdateProgress }
  | { status: "error"; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SelfUpdatePanel({
  runtimeBusy,
  checkUpdates = checkForTrustedSelfUpdate,
  installUpdate = installTrustedSelfUpdate,
}: SelfUpdatePanelProps) {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const busy = state.status === "checking" || state.status === "installing";
  const quiescence = updateQuiescence({
    activePiRuns: runtimeBusy ? 1 : 0,
    pendingConversationCommits: 0,
    pendingProjectionWrites: 0,
    activeFileSnapshots: 0,
  });

  async function checkNow() {
    setState({ status: "checking" });
    try {
      const result = await checkUpdates();
      setState(result.status === "available" ? { status: "available", update: result } : { status: "current" });
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }

  async function updateNow() {
    if (state.status !== "available") return;
    const availability = {
      status: "available" as const,
      manifest: {
        schemaVersion: "1.0.0" as const,
        product: "Mirror Desktop" as const,
        version: state.update.version,
        tag: `v${state.update.version}`,
        revision: "0000000000000000000000000000000000000000",
        minimumMacOS: "0.0.0",
        mirrorCore: ">=0.0.0",
        releaseNotes: "https://updates.mirrormind.ai/release-notes",
        provenance: { receiptUrl: "https://updates.mirrormind.ai/provenance", sha256: "0".repeat(64) },
        artifacts: [{ architecture: "universal" as const, url: "https://updates.mirrormind.ai/artifact", sha256: "0".repeat(64) }],
      },
      artifact: { architecture: "universal" as const, url: "https://updates.mirrormind.ai/artifact", sha256: "0".repeat(64) },
      notes: [],
    };
    const consent = requireUpdateConsent(availability, { accepted: true, acceptedVersion: state.update.version, acceptedArtifactSha256: "0".repeat(64) });
    if (!consent.ok) {
      setState({ status: "error", message: consent.reason });
      return;
    }
    const guard = updateQuiescence({ activePiRuns: runtimeBusy ? 1 : 0, pendingConversationCommits: 0, pendingProjectionWrites: 0, activeFileSnapshots: 0 });
    if (guard.status !== "safe") {
      setState({ status: "error", message: guard.reason });
      return;
    }
    const available = state.update;
    setState({ status: "installing", update: available, progress: { downloadedBytes: 0, message: "Preparing verified update…" } });
    try {
      await installUpdate(available.update, (progress) => setState({ status: "installing", update: available, progress }));
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }

  return (
    <section className="settings-section self-update-card" aria-label="Trusted self-update">
      <h3>Mirror Desktop updates</h3>
      <p className="provider-note">Checks the signed trusted update channel. Updates replace only the application bundle; Mirror homes, memory.db, identity, credentials, Journey content and conversations are never mutated.</p>
      <div className="provider-actions">
        <button type="button" onClick={() => void checkNow()} disabled={busy}>Check for updates</button>
        {state.status === "available" ? <button type="button" onClick={() => void updateNow()} disabled={busy || quiescence.status !== "safe"}>Update</button> : null}
      </div>
      {runtimeBusy ? <p className="settings-error" role="alert">Finish the active runtime operation before updating.</p> : null}
      {state.status === "checking" ? <p className="provider-note" role="status">Checking trusted update channel…</p> : null}
      {state.status === "current" ? <p className="provider-note" role="status">Mirror Desktop is up to date.</p> : null}
      {state.status === "available" ? <div className="self-update-available" role="status"><strong>Version {state.update.version} is available.</strong>{state.update.notes ? <p>{state.update.notes}</p> : null}{state.update.date ? <p className="provider-note">Published {state.update.date}</p> : null}</div> : null}
      {state.status === "installing" ? <p className="provider-note" role="status">{state.progress?.message ?? "Installing update…"} {state.progress?.totalBytes ? `${Math.round((state.progress.downloadedBytes / state.progress.totalBytes) * 100)}%` : ""}</p> : null}
      {state.status === "error" ? <p className="settings-error" role="alert">{state.message}</p> : null}
    </section>
  );
}
