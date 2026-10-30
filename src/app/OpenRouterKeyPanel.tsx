import { useState } from "react";
import { describeLastCheck, type OpenRouterKeyStatus } from "./openRouterKey";

/**
 * CV-010.DS-005 slice 3c-2: "Mirror's context · OpenRouter" (decision 4). In setup it asks for the
 * key once and offers to go on without one; in Settings it tests, replaces and removes it. The key
 * is typed into a password field, checked with OpenRouter before it is kept, and never shown back.
 */
type OpenRouterKeyPanelProps = {
  variant: "setup" | "settings";
  status?: OpenRouterKeyStatus;
  message?: string;
  busy: boolean;
  onSave: (key: string) => void;
  onTest: () => void;
  onRemove: () => void;
  onDecline: () => void;
  onReload: () => void;
  /** Tests only. */
  initialReplacing?: boolean;
  initialConfirmingRemove?: boolean;
};

export const WITHOUT_CONTEXT = "Without a key, your turns still work, but the model answers without Mirror's context: your identity, Journeys and memories.";

export function OpenRouterKeyPanel({ variant, status, message, busy, onSave, onTest, onRemove, onDecline, onReload, initialReplacing, initialConfirmingRemove }: OpenRouterKeyPanelProps) {
  const [key, setKey] = useState("");
  const [replacing, setReplacing] = useState(Boolean(initialReplacing));
  const [confirmingRemove, setConfirmingRemove] = useState(Boolean(initialConfirmingRemove));
  const Heading = variant === "setup" ? "h1" : "h3";
  const asking = !status?.configured || replacing;

  return (
    <>
      <Heading>Mirror's context · OpenRouter</Heading>
      <p>Before the model answers, your Mirror finds what matters from your identity, Journeys and memories. It does that through OpenRouter, with your own key. The key is kept in your Mac's Keychain and never shown again.</p>
      {status ? <p className="provider-note">{status.configured ? describeLastCheck(status) : WITHOUT_CONTEXT}</p> : null}
      {!status && !message ? <p className="provider-note">Checking the Keychain…</p> : null}
      {message ? <p className={status ? "provider-note" : "provider-error"} role="status">{message}</p> : null}
      {!status && message ? (
        <div className="provider-actions">
          <button type="button" onClick={onReload}>Try again</button>
          {variant === "setup" ? <button className="secondary-button" type="button" onClick={onDecline}>Not now</button> : null}
        </div>
      ) : null}
      {status && asking ? (
        <form className="runtime-onboarding-form" onSubmit={(event) => { event.preventDefault(); if (key.trim()) { onSave(key); setKey(""); } }}>
          <label className="provider-field">{status.configured ? "New OpenRouter key" : "OpenRouter key"}
            <input type="password" autoComplete="off" spellCheck={false} placeholder="sk-or-…" value={key} onChange={(event) => setKey(event.target.value)} />
          </label>
          <div className="provider-actions">
            <button type="submit" disabled={busy || !key.trim()}>{busy ? "Checking with OpenRouter…" : "Check and keep"}</button>
            {replacing ? <button className="secondary-button" type="button" onClick={() => { setReplacing(false); setKey(""); }}>Cancel</button> : null}
            {variant === "setup" && !status.configured ? <button className="secondary-button" type="button" disabled={busy} onClick={onDecline}>Not now</button> : null}
          </div>
          {!status.configured ? <p className="provider-note">Create a key at openrouter.ai/keys.</p> : null}
        </form>
      ) : null}
      {status?.configured && !replacing ? (
        confirmingRemove ? (
          <div className="provider-actions">
            <span>Remove the key? {WITHOUT_CONTEXT}</span>
            <button type="button" disabled={busy} onClick={() => { setConfirmingRemove(false); onRemove(); }}>Remove</button>
            <button className="secondary-button" type="button" onClick={() => setConfirmingRemove(false)}>Keep</button>
          </div>
        ) : (
          <div className="provider-actions">
            <button type="button" disabled={busy} onClick={onTest}>{busy ? "Checking…" : "Test"}</button>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => setReplacing(true)}>Replace</button>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => setConfirmingRemove(true)}>Remove</button>
          </div>
        )
      ) : null}
    </>
  );
}
