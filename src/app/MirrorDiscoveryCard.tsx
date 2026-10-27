import { useCallback, useEffect, useState } from "react";
import { describeMirrorDiscovery, type MirrorDiscovery } from "../domain/mirrorDiscovery";
import type { RuntimeBinding } from "./runtimeChannelStorage";

// CV-010.DS-001: the first screen for a person who already uses Mirror. It shows what was found,
// one row per requirement, and connects with one confirmation. Discovery itself never writes;
// Connect hands the proposal to the existing save, whose validation stays the authority.

export type MirrorDiscoveryState =
  | { kind: "checking" }
  | { kind: "failed"; message: string }
  | { kind: "result"; discovery: MirrorDiscovery };

type CardProps = {
  state: MirrorDiscoveryState;
  connecting: boolean;
  error?: string;
  onConnect: (binding: RuntimeBinding) => void;
  onChoose: () => void;
  onRetry: () => void;
  onManual: () => void;
};

export function MirrorDiscoveryCard({ state, connecting, error, onConnect, onChoose, onRetry, onManual }: CardProps) {
  const view = state.kind === "result" ? describeMirrorDiscovery(state.discovery) : undefined;
  const binding = state.kind === "result" ? state.discovery.binding : null;
  return (
    <>
      <p className="eyebrow">Mirror Desktop</p>
      <h1>{state.kind === "checking" ? "Looking for your Mirror…" : view?.headline ?? "Your Mirror could not be checked"}</h1>
      <p>{state.kind === "failed" ? state.message : view?.summary ?? "Checking the usual places on this Mac. Nothing is changed."}</p>
      {view ? (
        <ul className="readiness-checklist" aria-label="Mirror requirements">
          {view.rows.map((row) => (
            <li key={row.id} className="readiness-row" data-found={row.found ? "true" : "false"} data-required={row.required ? "true" : "false"}>
              <span className="readiness-mark" aria-hidden="true">{row.found ? "✓" : row.required ? "✕" : "!"}</span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="provider-error" role="alert">{error}</p> : null}
      <div className="provider-actions">
        {view ? (
          <button type="button" disabled={!view.canConnect || connecting || !binding} onClick={() => binding && onConnect(binding)}>
            {connecting ? "Connecting…" : "Connect"}
          </button>
        ) : null}
        {state.kind !== "checking" ? <button className="secondary-button" type="button" onClick={onRetry} disabled={connecting}>Check again</button> : null}
        <button className="secondary-button" type="button" onClick={onChoose} disabled={connecting}>Choose Mirror folder…</button>
        <button className="secondary-button" type="button" onClick={onManual} disabled={connecting}>Use a different Mirror…</button>
      </div>
    </>
  );
}

type DiscoveryProps = Omit<CardProps, "state" | "onChoose" | "onRetry"> & {
  discover: (chosenRoot?: string) => Promise<MirrorDiscovery>;
  chooseRoot: () => Promise<string | undefined>;
};

export function ExistingMirrorDiscovery({ discover, chooseRoot, ...card }: DiscoveryProps) {
  const [state, setState] = useState<MirrorDiscoveryState>({ kind: "checking" });
  const run = useCallback((chosenRoot?: string) => {
    let cancelled = false;
    setState({ kind: "checking" });
    discover(chosenRoot)
      .then((discovery) => { if (!cancelled) setState({ kind: "result", discovery }); })
      .catch((error) => {
        if (!cancelled) setState({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
      });
    return () => { cancelled = true; };
  }, [discover]);
  useEffect(() => run(), [run]);
  return (
    <MirrorDiscoveryCard
      {...card}
      state={state}
      onRetry={() => { run(); }}
      onChoose={() => { void chooseRoot().then((path) => { if (path) run(path); }); }}
    />
  );
}
