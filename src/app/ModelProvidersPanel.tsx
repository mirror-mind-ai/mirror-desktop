import { useState } from "react";
import { PiLoginPanel, orderedProviders, readinessLabel } from "./ProviderConnectStep";
import type { PiLoginView, PiProviderStatus } from "./piProviders";

/**
 * CV-010.DS-005 slice 3c-2: Settings' model providers. The connected providers, each with Disconnect
 * when Pi holds its sign-in, and a way to connect another one with Pi's own sign-in.
 *
 * Pi keeps its sign-ins in `~/.pi/agent`, which Pi in a terminal also uses, so a disconnect here
 * signs Pi out there too; the confirmation says so.
 */
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
  /** Tests only. */
  initialConfirming?: string;
};

export function disconnectWarning(provider: PiProviderStatus, providers: PiProviderStatus[]): string {
  const others = providers.filter((other) => other.id !== provider.id && other.ready);
  const last = others.length === 0 ? " It is your only connected provider, so Mirror Desktop will ask you to connect one." : "";
  return `Disconnect ${provider.name}? Pi forgets this sign-in, in Mirror Desktop and in Pi in a terminal.${last}`;
}

export function ModelProvidersPanel({ providers, state, login, message, busy, onSignIn, onAnswer, onCancel, onOpenAgain, onDisconnect, onReload, initialConfirming }: ModelProvidersPanelProps) {
  const ordered = orderedProviders(providers);
  const connected = ordered.filter((provider) => provider.ready);
  const available = ordered.filter((provider) => !provider.ready);
  const [choice, setChoice] = useState(available[0]?.id ?? "");
  const [confirming, setConfirming] = useState<string | undefined>(initialConfirming);
  const chosen = available.find((provider) => provider.id === choice) ?? available[0];

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
      {connected.length > 0 ? (
        <ul className="model-provider-list">
          {connected.map((provider) => (
            <li key={provider.id}>
              <span className="model-provider-name">{provider.name}</span>
              <span className="model-provider-state">{provider.stored ? readinessLabel(provider) : "Connected · from your environment"}</span>
              {provider.stored ? (
                confirming === provider.id ? (
                  <span className="model-provider-confirm">
                    <span>{disconnectWarning(provider, providers)}</span>
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
      {available.length > 0 ? (
        <div className="runtime-onboarding-form">
          <label className="provider-field">Connect another provider
            <select value={chosen?.id ?? ""} onChange={(event) => setChoice(event.target.value)}>
              {available.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
          </label>
          <div className="provider-actions">
            {chosen?.oauth ? <button type="button" disabled={busy !== undefined} onClick={() => onSignIn(chosen, "oauth")}>Sign in{chosen.oauthName ? ` · ${chosen.oauthName}` : ""}</button> : null}
            {chosen?.apiKey ? <button className={chosen.oauth ? "secondary-button" : undefined} type="button" disabled={busy !== undefined} onClick={() => onSignIn(chosen, "api_key")}>Use an API key</button> : null}
          </div>
        </div>
      ) : null}
      {message ? <p className="provider-note" role="status">{message}</p> : null}
    </section>
  );
}
