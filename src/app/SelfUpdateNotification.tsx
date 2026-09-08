import { useEffect, useRef, useState } from "react";
import { updateQuiescence } from "../domain/updateInstallation";
import { checkForTrustedSelfUpdate, installTrustedSelfUpdate, type SelfUpdateCheckResult, type SelfUpdateProgress } from "./selfUpdateStorage";

export type SelfUpdateNotificationProps = {
  runtimeBusy: boolean;
  checkUpdates?: () => Promise<SelfUpdateCheckResult>;
  installUpdate?: typeof installTrustedSelfUpdate;
  initialUpdate?: SelfUpdateCheckResult & { status: "available" };
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

export function SelfUpdateNotification({
  runtimeBusy,
  checkUpdates = checkForTrustedSelfUpdate,
  installUpdate = installTrustedSelfUpdate,
  initialUpdate,
  onReview,
}: SelfUpdateNotificationProps) {
  const [state, setState] = useState<UpdateChipState>(initialUpdate ? { status: "available", update: initialUpdate } : { status: "idle" });
  const [open, setOpen] = useState(false);
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
    if (initialUpdate) return () => { cancelled = true; };
    setState({ status: "checking" });
    void checkUpdates()
      .then((result) => {
        if (cancelled) return;
        setState(result.status === "available" ? { status: "available", update: result } : { status: "idle" });
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
    setState({ status: "installing", update: available, progress: { downloadedBytes: 0, message: "Baixando atualização…" } });
    try {
      await installUpdate(available.update, (progress) => setState({ status: "installing", update: available, progress }));
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }

  const available = state.status === "available" || state.status === "installing" ? state.update : undefined;
  if (!available || dismissedVersion === available.version) return null;

  return (
    <div className="self-update-chip-wrap" ref={popoverRef}>
      <button
        className={`self-update-chip ${state.status === "installing" ? "installing" : ""}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Mirror Desktop ${available.version} está disponível`}
      >
        <span className="self-update-dot" aria-hidden="true" />
        <span>{state.status === "installing" ? "Atualizando…" : "Atualização disponível"}</span>
      </button>
      {open ? (
        <div className="self-update-popover" role="dialog" aria-label="Atualização do Mirror Desktop">
          <strong>Mirror Desktop {available.version} está disponível.</strong>
          <p>Esta atualização troca apenas o aplicativo. Seus Journeys, conversas, memória, credenciais e dados locais permanecem intactos.</p>
          {runtimeBusy ? <p className="settings-error" role="alert">Conclua a execução atual antes de atualizar.</p> : null}
          {state.status === "installing" ? <p className="provider-note" role="status">{state.progress?.message ?? "Instalando…"} {state.progress?.totalBytes ? `${Math.round((state.progress.downloadedBytes / state.progress.totalBytes) * 100)}%` : ""}</p> : null}
          {state.status === "error" ? <p className="settings-error" role="alert">{state.message}</p> : null}
          <div className="self-update-popover-actions">
            <button className="secondary-button" type="button" onClick={() => { setDismissedVersion(available.version); setOpen(false); }}>Agora não</button>
            <button className="secondary-button" type="button" onClick={() => { onReview(); setOpen(false); }}>Ver detalhes</button>
            <button type="button" onClick={() => void updateNow()} disabled={state.status === "installing" || runtimeBusy}>Atualizar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
