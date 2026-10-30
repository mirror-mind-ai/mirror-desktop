/**
 * CV-010.DS-005 slice 3b: the setup step that installs the app's own Pi.
 *
 * Mirror Desktop TS talks to models through Pi, and installs the version it was built with into its
 * own folder (decision 2): about 24 MB downloaded, checked package by package. A Pi already on the
 * Mac is left alone; the sign-ins Pi keeps in `~/.pi/agent` are used as they are.
 */
export type PiInstallView =
  | { kind: "idle" }
  | { kind: "installing"; phase?: "download" | "unpack" | "check"; done: number; total: number }
  | { kind: "failed"; message: string };

type PiInstallStepProps = {
  view: PiInstallView;
  onInstall: () => void;
};

const PHASE_LABELS = {
  download: "Downloading Pi",
  unpack: "Unpacking Pi",
  check: "Checking that Pi starts",
} as const;

export function piInstallProgressLabel(view: Extract<PiInstallView, { kind: "installing" }>): string {
  if (!view.phase) return "Starting…";
  if (view.phase === "check") return `${PHASE_LABELS.check}…`;
  return `${PHASE_LABELS[view.phase]} · ${view.done} of ${view.total} packages`;
}

export function PiInstallStep({ view, onInstall }: PiInstallStepProps) {
  return (
    <>
      <p className="eyebrow">Mirror Desktop TS</p>
      <h1>Install Pi</h1>
      <p>Mirror Desktop TS talks to models through Pi, an open-source agent. It installs the version it was made with into its own folder: about 24 MB to download, each package checked before it is used.</p>
      <p>A Pi you already have is left alone. The sign-ins Pi keeps on this Mac are used as they are.</p>
      {view.kind === "installing" ? (
        <div className="pi-install-progress" role="status">
          <progress max={view.total || 1} value={view.phase === "check" ? view.total : view.done} />
          <p>{piInstallProgressLabel(view)}</p>
        </div>
      ) : (
        <>
          {view.kind === "failed" ? <p className="provider-error" role="alert">{view.message}</p> : null}
          <div className="provider-actions">
            <button type="button" onClick={onInstall}>{view.kind === "failed" ? "Try again" : "Install Pi"}</button>
          </div>
        </>
      )}
    </>
  );
}
