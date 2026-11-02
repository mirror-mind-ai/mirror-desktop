import { useState } from "react";
import { PiLoginPanel, orderedProviders, readinessLabel } from "./ProviderConnectStep";
import type { PiLoginView, PiProviderStatus } from "./piProviders";
import type { PiInstallView } from "./PiInstallStep";

/**
 * CV-010.DS-005 slice 3c-2: Settings' model providers. The connected providers, each with Disconnect
 * when Pi holds its sign-in, and a way to connect another one with Pi's own sign-in.
 *
 * Pi keeps its sign-ins in `~/.pi/agent`, which Pi in a terminal also uses, so a disconnect here
 * signs Pi out there too; the confirmation says so.
 *
 * CR173: Claude through the Desktop's own copy of Claude Code is one more provider here. Connect
 * installs it (the download is that act's progress) and it then uses the Claude sign-in already on
 * this Mac; the person's own Claude Code, its plugins and its hooks stay out of the Desktop's turns.
 */

/** The select's value for Claude through Claude Code, which no Pi provider id can take. */
export const CLAUDE_CODE = "mirror-desktop:claude-code";
const CLAUDE_CODE_NAME = "Claude · through Claude Code";

export type ClaudeCodeConnection = {
  installed: boolean;
  view: PiInstallView;
  onConnect: () => void;
};

const CLAUDE_PHASES = {
  download: "Downloading Claude Code",
  unpack: "Unpacking Claude Code",
  check: "Checking that Claude Code starts",
} as const;

export function claudeProgressLabel(view: Extract<PiInstallView, { kind: "installing" }>): string {
  if (!view.phase) return "Starting…";
  if (view.phase === "check") return `${CLAUDE_PHASES.check}…`;
  return `${CLAUDE_PHASES[view.phase]} · ${view.done} of ${view.total} packages`;
}
type ModelProvidersPanelProps = {
  providers: PiProviderStatus[];
  state: "idle" | "loading" | "ready" | "error";
  login?: PiLoginView;
  message?: string;
  busy?: string;
  onSignIn: (provider: PiProviderStatus, loginType: "oauth" | "api_key") => void;
  onAnswer: (promptId: string, value: string) => void;
  onCancel: () => void;
  onOpenAgain: (url: string) => void;
  onDisconnect: (provider: PiProviderStatus) => void;
  onReload: () => void;
  /** CR173: absent until the runtime says whether the Desktop's Claude Code is installed. */
  claude?: ClaudeCodeConnection;
  /** Tests only. */
  initialConfirming?: string;
};

export function disconnectWarning(provider: PiProviderStatus, providers: PiProviderStatus[], claudeConnected = false): string {
  const others = providers.filter((other) => other.id !== provider.id && other.ready);
  const last = others.length === 0 && !claudeConnected ? " It is your only connected provider, so Mirror Desktop will ask you to connect one." : "";
  return `Disconnect ${provider.name}? Pi forgets this sign-in, in Mirror Desktop and in Pi in a terminal.${last}`;
}

export function ModelProvidersPanel({ providers, state, login, message, busy, onSignIn, onAnswer, onCancel, onOpenAgain, onDisconnect, onReload, claude, initialConfirming }: ModelProvidersPanelProps) {
  const ordered = orderedProviders(providers);
  const connected = ordered.filter((provider) => provider.ready);
  const available = ordered.filter((provider) => !provider.ready);
  const claudeOffered = claude !== undefined && !claude.installed;
  const claudeConnected = claude?.installed === true;
  const [choice, setChoice] = useState(claudeOffered ? CLAUDE_CODE : available[0]?.id ?? "");
  const [confirming, setConfirming] = useState<string | undefined>(initialConfirming);
  const claudeChosen = claudeOffered && (choice === CLAUDE_CODE || available.length === 0);
  const chosen = claudeChosen ? undefined : available.find((provider) => provider.id === choice) ?? available[0];

  if (login) {
    return (
      <section className="settings-section provider-card" aria-label="Model providers">
        <PiLoginPanel login={login} heading="h3" onAnswer={onAnswer} onCancel={onCancel} onOpenAgain={onOpenAgain} />
      </section>
    );
  }

  return (
    <section className="settings-section provider-card" aria-label="Model providers">
      <h3>Model providers</h3>
      <p className="provider-note">Your Mirror talks to a model through these providers. Pi keeps the sign-ins on this Mac; Mirror Desktop keeps no copy.</p>
      {state === "loading" && providers.length === 0 ? <p className="provider-note">Asking Pi about providers…</p> : null}
      {state === "error" ? (
        <div className="provider-actions"><button className="secondary-button" type="button" onClick={onReload}>Ask Pi again</button></div>
      ) : null}
      {connected.length > 0 || claudeConnected ? (
        <ul className="model-provider-list">
          {claudeConnected ? (
            <li>
              <span className="model-provider-name">{CLAUDE_CODE_NAME}</span>
              <span className="model-provider-state">Connected · Claude sign-in on this Mac</span>
            </li>
          ) : null}
          {connected.map((provider) => (
            <li key={provider.id}>
              <span className="model-provider-name">{provider.name}</span>
              <span className="model-provider-state">{provider.stored ? readinessLabel(provider) : "Connected · from your environment"}</span>
              {provider.stored ? (
                confirming === provider.id ? (
                  <span className="model-provider-confirm">
                    <span>{disconnectWarning(provider, providers, claudeConnected)}</span>
                    <button type="button" disabled={busy !== undefined} onClick={() => { setConfirming(undefined); onDisconnect(provider); }}>Disconnect</button>
                    <button className="secondary-button" type="button" onClick={() => setConfirming(undefined)}>Keep</button>
                  </span>
                ) : (
                  <button className="secondary-button" type="button" disabled={busy !== undefined} onClick={() => setConfirming(provider.id)}>
                    {busy === provider.id ? "Disconnecting…" : "Disconnect"}
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : state === "ready" ? <p className="provider-note">No provider is connected.</p> : null}
      {available.length > 0 || claudeOffered ? (
        <div className="runtime-onboarding-form">
          <label className="provider-field">Connect another provider
            <select value={claudeChosen ? CLAUDE_CODE : chosen?.id ?? ""} disabled={claude?.view.kind === "installing"} onChange={(event) => setChoice(event.target.value)}>
              {claudeOffered ? <option value={CLAUDE_CODE}>{CLAUDE_CODE_NAME}</option> : null}
              {available.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </label>
          {claudeChosen && claude ? (
            <>
              <p className="provider-note">Use your Claude subscription. Mirror Desktop TS installs its own copy of Claude Code into its folder (about 135 MB, each package checked) and uses the Claude sign-in already on this Mac.</p>
              <p className="provider-note">Your own Claude Code, its plugins and its hooks are left alone, and stay out of Mirror Desktop's turns.</p>
              {claude.view.kind === "installing" ? (
                <div className="pi-install-progress" role="status">
                  <progress max={claude.view.total || 1} value={claude.view.phase === "check" ? claude.view.total : claude.view.done} />
                  <p>{claudeProgressLabel(claude.view)}</p>
                </div>
              ) : (
                <>
                  {claude.view.kind === "failed" ? <p className="provider-error" role="alert">{claude.view.message}</p> : null}
                  <div className="provider-actions">
                    <button type="button" disabled={busy !== undefined} onClick={claude.onConnect}>{claude.view.kind === "failed" ? "Try again" : "Connect"}</button>
                  </div>
                </>
              )}
            </>
          ) : (
          <div className="provider-actions">
            {chosen?.oauth ? <button type="button" disabled={busy !== undefined} onClick={() => onSignIn(chosen, "oauth")}>Sign in{chosen.oauthName ? ` · ${chosen.oauthName}` : ""}</button> : null}
            {chosen?.apiKey ? <button className={chosen.oauth ? "secondary-button" : undefined} type="button" disabled={busy !== undefined} onClick={() => onSignIn(chosen, "api_key")}>Use an API key</button> : null}
          </div>
          )}
        </div>
      ) : null}
      {message ? <p className="provider-note" role="status">{message}</p> : null}
    </section>
  );
}
