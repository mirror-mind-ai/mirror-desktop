import { useState } from "react";
import type { PiLoginPrompt, PiLoginView, PiProviderStatus } from "./piProviders";

/**
 * CV-010.DS-005 slice 3c-1: the setup step that connects a model provider.
 *
 * Every provider the app's Pi knows is listed, the connected ones first. Signing in is Pi's own: a
 * subscription opens the provider's page in the browser; an API key is typed once and handed to Pi,
 * which keeps it (decision 3). Mirror Desktop keeps no copy and never shows one back.
 */
type ProviderConnectStepProps = {
  providers: PiProviderStatus[];
  login?: PiLoginView;
  message?: string;
  onSignIn: (provider: PiProviderStatus, loginType: "oauth" | "api_key") => void;
  onAnswer: (promptId: string, value: string) => void;
  onCancel: () => void;
  onOpenAgain: (url: string) => void;
  onContinue: () => void;
  /** Tests only: the provider chosen when the screen opens. */
  initialChoice?: string;
};

export function orderedProviders(providers: PiProviderStatus[]): PiProviderStatus[] {
  return [...providers].sort((a, b) => Number(Boolean(b.ready)) - Number(Boolean(a.ready)) || a.name.localeCompare(b.name));
}

export function readinessLabel(provider: PiProviderStatus): string {
  if (!provider.ready) return "Not connected";
  return provider.ready.type === "oauth" ? "Connected · signed in" : "Connected · API key";
}

function PromptField({ prompt, onAnswer }: { prompt: PiLoginPrompt; onAnswer: (id: string, value: string) => void }) {
  const [value, setValue] = useState(prompt.kind === "select" ? (prompt.options[0]?.id ?? "") : "");
  const label = prompt.kind === "manual_code" ? "Or paste the code or the final address here" : prompt.message;
  return (
    <form className="runtime-onboarding-form" onSubmit={(event) => { event.preventDefault(); if (value) onAnswer(prompt.id, value); }}>
      <label className="provider-field">{label}
        {prompt.kind === "select" ? (
          <select value={value} onChange={(event) => setValue(event.target.value)}>
            {prompt.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        ) : (
          <input
            type={prompt.kind === "secret" ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            placeholder={prompt.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
      </label>
      <div className="provider-actions"><button type="submit" disabled={!value}>Continue</button></div>
    </form>
  );
}

/** A sign-in in progress: the page Pi asked to open, its prompts, and Cancel. Setup and Settings share it. */
export function PiLoginPanel({ login, heading, onAnswer, onCancel, onOpenAgain }: {
  login: PiLoginView;
  heading: "h1" | "h3";
  onAnswer: (promptId: string, value: string) => void;
  onCancel: () => void;
  onOpenAgain: (url: string) => void;
}) {
  const Heading = heading;
  return (
    <>
      <Heading>Connecting {login.providerName}</Heading>
      {login.authUrl ? (
        <>
          <p>{login.instructions ?? "Finish signing in in your browser."}</p>
          <p className="provider-note">Your browser opened {new URL(login.authUrl).host}.</p>
        </>
      ) : null}
      {login.deviceCode ? (
        <p>Open {login.deviceCode.verificationUri} and enter the code <strong>{login.deviceCode.userCode}</strong>.</p>
      ) : null}
      {login.notes.length > 0 ? <p className="provider-note">{login.notes.at(-1)}</p> : null}
      {login.prompts.map((prompt) => <PromptField key={prompt.id} prompt={prompt} onAnswer={onAnswer} />)}
      <div className="provider-actions">
        {login.authUrl ? <button className="secondary-button" type="button" onClick={() => onOpenAgain(login.authUrl as string)}>Open the sign-in page again</button> : null}
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

export function ProviderConnectStep({ providers, login, message, onSignIn, onAnswer, onCancel, onOpenAgain, onContinue, initialChoice }: ProviderConnectStepProps) {
  const ordered = orderedProviders(providers);
  const [choice, setChoice] = useState(initialChoice ?? ordered.find((provider) => !provider.ready)?.id ?? ordered[0]?.id ?? "");
  const chosen = ordered.find((provider) => provider.id === choice);
  const connected = ordered.filter((provider) => provider.ready);

  if (login) {
    return (
      <>
        <p className="eyebrow">Mirror Desktop TS</p>
        <PiLoginPanel login={login} heading="h1" onAnswer={onAnswer} onCancel={onCancel} onOpenAgain={onOpenAgain} />
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">Mirror Desktop TS</p>
      <h1>Connect a model provider</h1>
      <p>Your Mirror talks to a model through a provider. Sign in with a subscription you have, or use an API key. Pi keeps the sign-in on this Mac; Mirror Desktop keeps no copy.</p>
      {connected.length > 0 ? <p className="provider-note">Connected: {connected.map((provider) => provider.name).join(", ")}.</p> : null}
      {message ? <p className={connected.length > 0 && message.startsWith("Connected") ? "provider-note" : "provider-error"} role="alert">{message}</p> : null}
      <div className="runtime-onboarding-form">
        <label className="provider-field">Provider
          <select value={choice} onChange={(event) => setChoice(event.target.value)}>
            {ordered.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {readinessLabel(provider)}</option>)}
          </select>
        </label>
        <div className="provider-actions">
          {chosen?.oauth ? <button type="button" onClick={() => onSignIn(chosen, "oauth")}>Sign in{chosen.oauthName ? ` · ${chosen.oauthName}` : ""}</button> : null}
          {chosen?.apiKey ? <button className={chosen.oauth ? "secondary-button" : undefined} type="button" onClick={() => onSignIn(chosen, "api_key")}>Use an API key</button> : null}
          {connected.length > 0 ? <button className="secondary-button" type="button" onClick={onContinue}>Continue</button> : null}
        </div>
      </div>
    </>
  );
}
