import type { ReactNode, Ref } from "react";
import type { RuntimeContextUsage } from "./runtimeActivityModel";
import type { PiContextState } from "./contextUsageState";
import type { ComposerTurnStatus } from "./composerTurnStatus";
import { mirrorModeDisplay, type MirrorOperatingMode } from "./mirrorModeState";
import type { ModelSelectionScope } from "../domain/modelAvailability";
import { projectContextReading } from "../domain/contextReading";

type ComposerRuntimeFooterProps = {
  contextUsage?: RuntimeContextUsage;
  /**
   * CR079: the selected model's declared window, known from the live Pi catalog even when
   * nothing has measured this Conversation yet. It keeps the reading on screen instead of
   * letting an absent token count replace it with prose.
   */
  contextWindow?: number | null;
  /** The count is an estimate or was measured by another model, so the reading is marked. */
  contextApproximate?: boolean;
  activeMode?: MirrorOperatingMode;
  contextState?: PiContextState;
  /** The exact binding, including thinking. It stays reachable even though it is no longer the
   * normal reading path. */
  providerModel: string;
  /**
   * CR103: the name to show for the selected model — bare where that is unambiguous, qualified
   * where two providers claim it. Falls back to the exact binding when the caller supplies none.
   */
  modelDisplayName?: string;
  /** CR103: the thinking level, shown only when no Model Intent already encodes it. */
  thinkingLabel?: string;
  canInitializeContext?: boolean;
  initializingContext?: boolean;
  onInitializeContext?: () => void;
  onSelectProviderModel?: () => void;
  providerSelectionDisabled?: boolean;
  /** CR090: whether the displayed selection reaches the live turn or only the next one. */
  selectionScope?: ModelSelectionScope;
  /** Model the live turn started with, shown so the difference is legible. */
  liveRunProviderModel?: string;
  /** CR103: the running turn's model in the same abbreviated register as the selection. */
  liveRunModelDisplayName?: string;
  /** CR078: label of the Model Intent the effective profile matches, when one does. */
  activeIntentLabel?: string;
  providerModelMenu?: ReactNode;
  providerModelMenuOpen?: boolean;
  menuWrapRef?: Ref<HTMLDivElement>;
  /** CR080: when provided, the context label becomes a control opening this menu. */
  onOpenContextMenu?: () => void;
  contextMenu?: ReactNode;
  contextMenuOpen?: boolean;
  contextMenuWrapRef?: Ref<HTMLDivElement>;
  /** A manual compaction is rewriting the session; the label says so instead of a number. */
  compacting?: boolean;
};

type ComposerRuntimeStatusProps = {
  status: ComposerTurnStatus;
};

export function ComposerRuntimeStatus({ status }: ComposerRuntimeStatusProps) {
  if (!status) {
    return null;
  }

  const finishing = status === "finishing";
  return (
    <div className={`composer-runtime-status${finishing ? " is-finishing" : ""}`} role="status" aria-live="polite">
      <span className="runtime-live-dot" aria-hidden="true" />
      <strong>{finishing ? "Finishing" : "Working"}</strong>
      <span className="runtime-working-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
    </div>
  );
}

export function ComposerRuntimeFooter({
  contextUsage,
  contextWindow,
  contextApproximate = false,
  activeMode,
  contextState = contextUsage ? "available" : "waiting",
  providerModel,
  modelDisplayName,
  thinkingLabel,
  canInitializeContext = false,
  initializingContext = false,
  onInitializeContext,
  onSelectProviderModel,
  providerSelectionDisabled = false,
  selectionScope = "applies_now",
  liveRunProviderModel,
  liveRunModelDisplayName,
  activeIntentLabel,
  providerModelMenu,
  providerModelMenuOpen = false,
  menuWrapRef,
  onOpenContextMenu,
  contextMenu,
  contextMenuOpen = false,
  contextMenuWrapRef,
  compacting = false,
}: ComposerRuntimeFooterProps) {
  const reading = projectContextReading({
    state: contextState,
    tokens: contextUsage?.tokens ?? null,
    contextWindow: contextWindow ?? contextUsage?.contextWindow ?? null,
    approximate: contextApproximate,
  });
  const contextLabel = compacting ? "Compacting…" : reading.text;
  const contextTone = compacting || !reading.tone ? undefined : `composer-context-${reading.tone}`;
  // CR103: the intent used to stand in for the model, so a Navigator reading the footer learned
  // what they had named their configuration but never what would actually run. The intent and the
  // model are now shown together, and the exact binding keeps riding the title for the pointer and
  // the accessible name for the keyboard.
  const visibleModelName = modelDisplayName ?? providerModel;
  const nextTurnScoped = selectionScope === "applies_to_next_turn";
  const accessibleName = activeIntentLabel
    ? `Choose model — currently ${activeIntentLabel} (${providerModel})`
    : `Choose model and thinking for ${providerModel}`;
  return (
    <div className="composer-runtime-footer" aria-label="Agent session status">
      <div className="composer-runtime-metadata">
        {activeMode ? (
          <>
            <span className="composer-active-mode">
              <span aria-hidden="true">{mirrorModeDisplay(activeMode).icon}</span>
              {mirrorModeDisplay(activeMode).label}
            </span>
            <span className="composer-runtime-separator" aria-hidden="true">·</span>
          </>
        ) : null}
        {onOpenContextMenu ? (
          <div className="model-intent-menu-wrap" ref={contextMenuWrapRef}>
            <button
              type="button"
              className={["composer-context-control", contextTone].filter(Boolean).join(" ")}
              onClick={onOpenContextMenu}
              aria-haspopup="menu"
              aria-expanded={contextMenuOpen}
              aria-label="Context window actions"
              title={`${reading.detail} Context window actions.`}
            >
              {contextLabel}
            </button>
            {contextMenu}
          </div>
        ) : (
          <span className={contextTone} title={reading.detail}>{contextLabel}</span>
        )}
        {canInitializeContext && onInitializeContext ? (
          <button
            type="button"
            className="composer-context-initialize"
            disabled={initializingContext}
            onClick={onInitializeContext}
          >
            {initializingContext ? "Initializing…" : "Initialize Pi context"}
          </button>
        ) : null}
        <span className="composer-runtime-separator" aria-hidden="true">·</span>
        {/* CR103: the running turn is named first, because while work is alive it is the fact the
            Navigator needs; the selection that has not taken effect yet follows it. */}
        {nextTurnScoped && liveRunProviderModel ? (
          <>
            <span
              className="composer-provider-model-scope"
              title={`The running turn continues on ${liveRunProviderModel}.`}
            >
              <span className="composer-model-turn-label">Current turn:</span>
              {" "}
              {liveRunModelDisplayName ?? liveRunProviderModel}
            </span>
            <span className="composer-runtime-separator" aria-hidden="true">·</span>
          </>
        ) : null}
        {onSelectProviderModel ? (
          <div className="model-intent-menu-wrap" ref={menuWrapRef}>
            <button
              type="button"
              className="composer-provider-model"
              onClick={onSelectProviderModel}
              disabled={providerSelectionDisabled}
              aria-haspopup="menu"
              aria-expanded={providerModelMenuOpen}
              aria-label={accessibleName}
              title={providerModel}
            >
              {nextTurnScoped ? (
                <>
                  <span className="composer-model-turn-label">Next turn:</span>
                  {" "}
                </>
              ) : null}
              {activeIntentLabel ? (
                <>
                  {activeIntentLabel}
                  {" "}
                  {/* A matched intent is a model and a thinking level, so naming the level again
                      would say nothing the intent has not already said. */}
                  <span className="composer-model-identity">{visibleModelName}</span>
                </>
              ) : (
                <>
                  {visibleModelName}
                  {thinkingLabel ? ` · ${thinkingLabel}` : ""}
                </>
              )}
            </button>
            {providerModelMenu}
          </div>
        ) : <span>{activeIntentLabel ?? visibleModelName}</span>}
      </div>
    </div>
  );
}

