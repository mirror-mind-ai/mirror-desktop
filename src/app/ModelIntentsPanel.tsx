import { useState, type FormEvent } from "react";
import type { AgentThinkingLevel } from "../domain/agentProfile";
import {
  modelFromOptionValue,
  modelKeyUnavailableReason,
  modelOptionValue,
  modelSupportsThinking,
  thinkingOptions,
  unavailableModelReason,
  type ModelCapabilityEntry,
  type ModelSelection,
} from "../domain/modelAvailability";
import {
  MODEL_INTENTS_MAX,
  MODEL_INTENT_LABEL_MAX_LENGTH,
  addModelIntent,
  createModelIntentId,
  normalizeModelIntentLabel,
  removeModelIntent,
  reorderModelIntent,
  updateModelIntent,
  type ModelIntents,
} from "../domain/modelIntents";

type ModelIntentsPanelProps = {
  intents: ModelIntents;
  catalog: readonly ModelCapabilityEntry[];
  modelOptions: readonly ModelSelection[];
  /** Model the form starts from when composing a new intent. */
  defaultModelKey: string;
  busy?: boolean;
  message?: string;
  error?: boolean;
  onChange: (next: ModelIntents) => void;
};

// CR078: the Navigator's own vocabulary for choosing a model. The mutations live in the
// domain module and are exercised there; this component only composes drafts and delegates.
export function ModelIntentsPanel({
  intents,
  catalog,
  modelOptions,
  defaultModelKey,
  busy = false,
  message,
  error = false,
  onChange,
}: ModelIntentsPanelProps) {
  const [editingId, setEditingId] = useState<string>();
  const [labelDraft, setLabelDraft] = useState("");
  const [modelDraft, setModelDraft] = useState(defaultModelKey);
  const [thinkingDraft, setThinkingDraft] = useState<AgentThinkingLevel>("pi-default");
  const [draftError, setDraftError] = useState<string>();

  const full = intents.intents.length >= MODEL_INTENTS_MAX && !editingId;

  function resetDraft() {
    setEditingId(undefined);
    setLabelDraft("");
    setModelDraft(defaultModelKey);
    setThinkingDraft("pi-default");
    setDraftError(undefined);
  }

  function selectModel(next: string) {
    setModelDraft(next);
    // Mirrors the Journey dialog: a model that cannot think forces the level down, and it
    // happens here, while the pair is being bound, rather than later at selection time.
    if (!modelSupportsThinking(catalog, next) && !["pi-default", "off"].includes(thinkingDraft)) {
      setThinkingDraft("off");
    }
  }

  function submitDraft(event: FormEvent) {
    event.preventDefault();
    try {
      const label = normalizeModelIntentLabel(labelDraft);
      const model = modelFromOptionValue(modelDraft);
      onChange(editingId
        ? updateModelIntent(intents, editingId, { label, model, thinkingLevel: thinkingDraft })
        : addModelIntent(intents, {
            id: createModelIntentId(label, intents),
            label,
            model,
            thinkingLevel: thinkingDraft,
          }));
      resetDraft();
    } catch (failure) {
      setDraftError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  return (
    <section className="settings-section model-intents-card" aria-label="Model Intents">
      <h3>Model Intents</h3>
      <p className="settings-intro">
        Name the configurations you reach for, in your own words. Each intent binds a model and
        a thinking level, so choosing one later cannot change the pair behind your back.
      </p>

      {intents.intents.length === 0 ? (
        <p className="provider-note">
          No intents yet — name your first one below.
        </p>
      ) : (
        <ul className="model-intent-list">
          {intents.intents.map((intent, index) => {
            const reason = unavailableModelReason(catalog, intent.model);
            return (
              <li className="model-intent-row" key={intent.id}>
                <div className="model-intent-identity">
                  <strong>{intent.label}</strong>
                  <span className="model-intent-binding">
                    {intent.model.provider}/{intent.model.model} · thinking {intent.thinkingLevel}
                  </span>
                  {reason ? <span className="model-intent-unavailable">{reason}</span> : null}
                </div>
                <div className="model-intent-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Move ${intent.label} up`}
                    disabled={busy || index === 0}
                    onClick={() => onChange(reorderModelIntent(intents, intent.id, "up"))}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Move ${intent.label} down`}
                    disabled={busy || index === intents.intents.length - 1}
                    onClick={() => onChange(reorderModelIntent(intents, intent.id, "down"))}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Edit ${intent.label}`}
                    disabled={busy}
                    onClick={() => {
                      setEditingId(intent.id);
                      setLabelDraft(intent.label);
                      setModelDraft(modelOptionValue(intent.model));
                      setThinkingDraft(intent.thinkingLevel);
                      setDraftError(undefined);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Remove ${intent.label}`}
                    disabled={busy}
                    onClick={() => {
                      if (editingId === intent.id) resetDraft();
                      onChange(removeModelIntent(intents, intent.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="model-intent-form" onSubmit={submitDraft}>
        <label className="provider-field">
          Name
          <input
            value={labelDraft}
            maxLength={MODEL_INTENT_LABEL_MAX_LENGTH}
            disabled={busy || full}
            onChange={(event) => { setLabelDraft(event.target.value); setDraftError(undefined); }}
          />
        </label>
        <label className="provider-field">
          Model
          <select value={modelDraft} disabled={busy || full} onChange={(event) => selectModel(event.target.value)}>
            {modelOptions.map((model) => {
              const unavailable = Boolean(unavailableModelReason(catalog, model));
              return (
                <option key={modelOptionValue(model)} value={modelOptionValue(model)} disabled={unavailable}>
                  {model.provider} / {model.model}{unavailable ? " — unavailable" : ""}
                </option>
              );
            })}
          </select>
          {modelKeyUnavailableReason(catalog, modelDraft) ? (
            <p className="provider-note">{modelKeyUnavailableReason(catalog, modelDraft)}</p>
          ) : null}
        </label>
        <label className="provider-field">
          Thinking level
          <select
            value={thinkingDraft}
            disabled={busy || full}
            onChange={(event) => setThinkingDraft(event.target.value as AgentThinkingLevel)}
          >
            {thinkingOptions(catalog, modelDraft, thinkingDraft).map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <div className="provider-actions">
          <button type="submit" disabled={busy || full || !labelDraft.trim()}>
            {editingId ? "Save intent" : "Add intent"}
          </button>
          {editingId ? (
            <button className="secondary-button" type="button" disabled={busy} onClick={resetDraft}>Cancel</button>
          ) : null}
        </div>
        {full ? (
          <p className="provider-note">
            Model intents reached their limit of {MODEL_INTENTS_MAX}. Remove one to add another.
          </p>
        ) : null}
        {draftError ? <p className="settings-error" role="alert">{draftError}</p> : null}
      </form>

      {message ? (
        <p className={error ? "settings-error" : "provider-note"} role={error ? "alert" : "status"}>{message}</p>
      ) : null}
    </section>
  );
}
