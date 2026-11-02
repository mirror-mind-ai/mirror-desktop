import { type PiInstallView } from "./PiInstallStep";

/**
 * CR173: Settings' Claude models. Mirror Desktop TS reaches Anthropic's models through its own copy
 * of Claude Code, installed on demand into its folder, never through the person's: their Claude Code,
 * its plugins and its hooks stay out of the Desktop's turns. It signs in with the Claude sign-in
 * already on this Mac.
 */
type ClaudeModelsPanelProps = {
  installed: boolean;
  view: PiInstallView;
  onInstall: () => void;
};

const PHASE_LABELS = {
  download: "Downloading Claude models",
  unpack: "Unpacking Claude models",
  check: "Checking that Claude Code starts",
} as const;

export function claudeModelsProgressLabel(view: Extract<PiInstallView, { kind: "installing" }>): string {
  if (!view.phase) return "Starting…";
  if (view.phase === "check") return `${PHASE_LABELS.check}…`;
  return `${PHASE_LABELS[view.phase]} · ${view.done} of ${view.total} packages`;
}

export function ClaudeModelsPanel({ installed, view, onInstall }: ClaudeModelsPanelProps) {
  return (
    <section className="settings-section provider-card" aria-label="Claude models">
      <h3>Claude models</h3>
      {installed ? (
        <p className="provider-note">Installed. Claude models appear in the model menu and use the Claude sign-in already on this Mac.</p>
      ) : (
        <>
          <p className="provider-note">Use your Claude subscription in Mirror Desktop TS. It installs its own copy of Claude Code into its folder: about 135 MB to download, each package checked before it is used.</p>
          <p className="provider-note">Your own Claude Code, its plugins and its hooks are left alone, and stay out of Mirror Desktop's turns. It uses the Claude sign-in already on this Mac.</p>
          {view.kind === "installing" ? (
            <div className="pi-install-progress" role="status">
              <progress max={view.total || 1} value={view.phase === "check" ? view.total : view.done} />
              <p>{claudeModelsProgressLabel(view)}</p>
            </div>
          ) : (
            <>
              {view.kind === "failed" ? <p className="provider-error" role="alert">{view.message}</p> : null}
              <div className="provider-actions">
                <button type="button" onClick={onInstall}>{view.kind === "failed" ? "Try again" : "Install Claude models"}</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
