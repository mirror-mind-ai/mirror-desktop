import {
  describeInstallProgress,
  describeVoiceModel,
  formatComponentSize,
  voiceControlIntent,
  voiceControlLabel,
  type VoiceComponentCatalog,
  type VoiceComponentStatus,
  type VoiceControlIntent,
  type VoiceInstallProgress,
  type VoiceSession,
} from "../domain/voiceTranscription";

type VoiceComposerControlProps = {
  status: VoiceComponentStatus | undefined;
  session: VoiceSession;
  installing: boolean;
  composerBusy: boolean;
  onIntent: (intent: VoiceControlIntent) => void;
};

/**
 * One microphone entry point for two separate consents: installing the local
 * component and recording. It never starts a recording after installation.
 */
export function VoiceComposerControl({ status, session, installing, composerBusy, onIntent }: VoiceComposerControlProps) {
  const intent = voiceControlIntent(status, session, { installing, composerBusy });
  const label = voiceControlLabel(intent, session, installing);
  const recording = session.kind === "recording";
  const busy = session.kind === "transcribing" || session.kind === "requesting_permission" || installing;
  return (
    <button
      className={`icon-button voice-composer-button${recording ? " is-recording" : ""}${busy ? " is-busy" : ""}`}
      type="button"
      onClick={() => onIntent(intent)}
      disabled={intent === "blocked"}
      aria-label={label}
      aria-pressed={recording}
      title={label}
      data-voice-intent={intent}
    >
      {recording ? <StopIcon /> : <MicrophoneIcon />}
    </button>
  );
}

/** Conventional microphone: capsule, cradle arc, stand and base. */
function MicrophoneIcon() {
  return (
    <svg className="voice-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="voice-icon" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

type VoiceSessionStatusProps = {
  session: VoiceSession;
  elapsedSeconds?: number;
  onCancel: () => void;
};

export function VoiceSessionStatus({ session, elapsedSeconds, onCancel }: VoiceSessionStatusProps) {
  if (session.kind === "idle") return null;
  const text = session.kind === "recording"
    ? `Recording${elapsedSeconds !== undefined ? ` · ${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}` : ""} · limit 5:00`
    : session.kind === "transcribing"
      ? "Transcribing locally…"
      : "Waiting for microphone permission…";
  return (
    <div className={`voice-session-status is-${session.kind}`} role="status" aria-live="polite">
      <span className="runtime-live-dot" aria-hidden="true" />
      <span>{text}</span>
      <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
    </div>
  );
}

type VoiceModelPickerProps = {
  catalog: VoiceComponentCatalog | undefined;
  loading: boolean;
  modelId: string | undefined;
  disabled: boolean;
  onChange: (modelId: string) => void;
};

/**
 * Accuracy and speed trade off sharply by model and the right answer depends on
 * the machine, so the choice belongs to the Navigator rather than to a default
 * baked in from one benchmark.
 */
export function VoiceModelPicker({ catalog, loading, modelId, disabled, onChange }: VoiceModelPickerProps) {
  if (!catalog) {
    return loading ? <p className="provider-note" role="status">Reading the available speech models…</p> : null;
  }
  const selected = modelId ?? catalog.defaultModel;
  return (
    <label className="voice-model-picker">
      <span>Speech model</span>
      <select value={selected} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {catalog.models.map((model) => (
          <option key={model.id} value={model.id}>
            {describeVoiceModel(model.id).label} · {formatComponentSize(model.sizeBytes)}
            {model.id === catalog.defaultModel ? " · recommended" : ""}
          </option>
        ))}
      </select>
      <small>{describeVoiceModel(selected).detail}</small>
    </label>
  );
}

type VoiceInstallDialogProps = {
  status: VoiceComponentStatus;
  installing: boolean;
  progress?: VoiceInstallProgress;
  error?: string;
  catalog?: VoiceComponentCatalog;
  catalogLoading: boolean;
  modelId?: string;
  onModelChange: (modelId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function VoiceInstallDialog({ status, installing, progress, error, catalog, catalogLoading, modelId, onModelChange, onConfirm, onClose }: VoiceInstallDialogProps) {
  const ready = status.state === "ready";
  return (
    <div className="settings-backdrop" role="presentation" onClick={() => !installing && onClose()}>
      <section
        className="settings-window voice-install-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Install local voice transcription"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <div>
            <p className="eyebrow">Voice prompt composition</p>
            <h2>{ready ? "Local transcription is ready" : "Install local transcription?"}</h2>
            <p className="settings-intro">
              {ready
                ? "Click the microphone again to start a recording. Nothing was recorded during installation."
                : "Mirror Desktop downloads a small speech-to-text engine and model, verifies their checksums and keeps them in this app's data folder."}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={installing}>×</button>
        </header>
        {!ready ? (
          <div className="restart-assurances">
            <p>Audio is transcribed on this computer. Recordings are never uploaded and are deleted after each transcription.</p>
            <p>The download is roughly 100 MB and can be removed at any time in Settings → Voice.</p>
            <p>Installing does not turn on the microphone. Recording starts only when you click the microphone afterwards.</p>
          </div>
        ) : null}
        {!ready ? (
          <VoiceModelPicker catalog={catalog} loading={catalogLoading} modelId={modelId} disabled={installing} onChange={onModelChange} />
        ) : null}
        {installing ? <p className="provider-note" role="status">{describeInstallProgress(progress)}</p> : null}
        {error ? <p className="settings-error" role="alert">{error}</p> : null}
        <div className="provider-actions">
          {ready ? (
            <button type="button" onClick={onClose}>Done</button>
          ) : (
            <>
              <button type="button" onClick={onConfirm} disabled={installing}>{installing ? "Installing…" : "Install"}</button>
              <button className="secondary-button" type="button" onClick={onClose} disabled={installing}>Not now</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

type VoiceSettingsPanelProps = {
  status: VoiceComponentStatus | undefined;
  installing: boolean;
  removing: boolean;
  progress?: VoiceInstallProgress;
  error?: string;
  sessionActive: boolean;
  catalog?: VoiceComponentCatalog;
  catalogLoading: boolean;
  modelId?: string;
  onModelChange: (modelId: string) => void;
  onInstall: () => void;
  onRemove: () => void;
};

export function VoiceSettingsPanel({ status, installing, removing, progress, error, sessionActive, catalog, catalogLoading, modelId, onModelChange, onInstall, onRemove }: VoiceSettingsPanelProps) {
  const busy = installing || removing || sessionActive;
  const installed = status?.modelId;
  const selected = modelId ?? catalog?.defaultModel;
  const switching = status?.state === "ready" && selected !== undefined && selected !== installed;
  return (
    <section className="settings-section provider-card" aria-label="Local voice transcription">
      <h3>Local voice transcription</h3>
      <p className="settings-intro">Optional speech-to-text component managed by Mirror Desktop. Audio never leaves this computer.</p>
      <dl>
        <div><dt>Status</dt><dd>{voiceStateLabel(status)}</dd></div>
        {status?.state === "ready" ? (
          <>
            <div><dt>Engine</dt><dd>whisper.cpp {status.componentVersion}</dd></div>
            <div><dt>Model</dt><dd>{describeVoiceModel(status.modelId ?? "").label} ({status.modelId})</dd></div>
            <div><dt>Size</dt><dd>{formatComponentSize(status.sizeBytes)}</dd></div>
            {status.installedAt ? <div><dt>Installed</dt><dd>{status.installedAt}</dd></div> : null}
          </>
        ) : null}
      </dl>
      {status?.message ? <p className="provider-note">{status.message}</p> : null}
      {installing ? <p className="provider-note" role="status">{describeInstallProgress(progress)}</p> : null}
      {error ? <p className="provider-error" role="alert">{error}</p> : null}
      {status?.state === "ready" || status?.state === "not_installed" ? (
        <VoiceModelPicker catalog={catalog} loading={catalogLoading} modelId={selected} disabled={busy} onChange={onModelChange} />
      ) : null}
      {switching ? (
        <p className="provider-note">Switching models downloads the new one and replaces the installed model. The engine is kept.</p>
      ) : null}
      <div className="provider-actions">
        {status?.state === "not_installed" || status?.state === "damaged" ? (
          <button type="button" onClick={onInstall} disabled={busy || status.state === "damaged"}>{installing ? "Installing…" : "Install local transcription"}</button>
        ) : null}
        {switching ? (
          <button type="button" onClick={onInstall} disabled={busy}>{installing ? "Installing…" : "Switch model"}</button>
        ) : null}
        {status?.state === "ready" || status?.state === "damaged" ? (
          <button type="button" className="secondary-button" onClick={onRemove} disabled={busy}>{removing ? "Removing…" : "Remove local transcription"}</button>
        ) : null}
      </div>
    </section>
  );
}

function voiceStateLabel(status: VoiceComponentStatus | undefined): string {
  switch (status?.state) {
    case "ready": return "Installed and verified";
    case "not_installed": return "Not installed";
    case "damaged": return "Incomplete — remove and install again";
    case "unsupported": return "Not available on this platform";
    default: return "Checking…";
  }
}
