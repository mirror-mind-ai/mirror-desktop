import {
  unavailableModelReason,
  type ModelCapabilityEntry,
} from "../domain/modelAvailability";
import type { ModelIntent, ModelIntents } from "../domain/modelIntents";

type ModelIntentMenuProps = {
  intents: ModelIntents;
  catalog: readonly ModelCapabilityEntry[];
  /** Intent the Journey's effective profile currently matches, when one does. */
  activeIntentId?: string;
  usingGlobalDefault: boolean;
  globalModelLabel: string;
  onSelectIntent: (intent: ModelIntent) => void;
  onUseGlobalDefaults: () => void;
  onOpenFullSelector: () => void;
};

// CR078: the consumption point for the semantic layer. The Navigator's order decides what
// sits nearest, and every entry keeps its binding legible so the label never hides the
// configuration it stands for.
export function ModelIntentMenu({
  intents,
  catalog,
  activeIntentId,
  usingGlobalDefault,
  globalModelLabel,
  onSelectIntent,
  onUseGlobalDefaults,
  onOpenFullSelector,
}: ModelIntentMenuProps) {
  return (
    <div className="model-intent-menu" role="menu" aria-label="Model intents">
      {intents.intents.length === 0 ? (
        <p className="model-intent-menu-empty">
          No intents yet. Name the configurations you reach for in Settings → Agent.
        </p>
      ) : (
        intents.intents.map((intent) => {
          const reason = unavailableModelReason(catalog, intent.model);
          const active = intent.id === activeIntentId;
          return (
            <button
              type="button"
              role="menuitem"
              key={intent.id}
              className={`model-intent-menu-item${active ? " selected" : ""}`}
              aria-current={active ? "true" : undefined}
              disabled={Boolean(reason)}
              onClick={() => onSelectIntent(intent)}
            >
              <span className="model-intent-menu-label">{intent.label}</span>
              <span className="model-intent-binding">
                {intent.model.provider}/{intent.model.model} · thinking {intent.thinkingLevel}
              </span>
              {reason ? <span className="model-intent-unavailable">{reason}</span> : null}
            </button>
          );
        })
      )}

      <div className="model-intent-menu-separator" role="separator" />

      <button
        type="button"
        role="menuitem"
        className={`model-intent-menu-item${usingGlobalDefault ? " selected" : ""}`}
        aria-current={usingGlobalDefault ? "true" : undefined}
        onClick={onUseGlobalDefaults}
      >
        <span className="model-intent-menu-label">Use global defaults</span>
        <span className="model-intent-binding">{globalModelLabel}</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className="model-intent-menu-item"
        onClick={onOpenFullSelector}
      >
        <span className="model-intent-menu-label">Open full selector…</span>
      </button>
    </div>
  );
}
