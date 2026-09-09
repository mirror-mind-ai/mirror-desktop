import type { RuntimeContextUsage } from "./runtimeActivityModel";
import type { PiContextState } from "./contextUsageState";
import type { ComposerTurnStatus } from "./composerTurnStatus";
import { mirrorModeDisplay, type MirrorOperatingMode } from "./mirrorModeState";

type ComposerRuntimeFooterProps = {
  contextUsage?: RuntimeContextUsage;
  activeMode?: MirrorOperatingMode;
  contextState?: PiContextState;
  providerModel: string;
  canInitializeContext?: boolean;
  initializingContext?: boolean;
  onInitializeContext?: () => void;
  onSelectProviderModel?: () => void;
  providerSelectionDisabled?: boolean;
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
  activeMode,
  contextState = contextUsage ? "available" : "waiting",
  providerModel,
  canInitializeContext = false,
  initializingContext = false,
  onInitializeContext,
  onSelectProviderModel,
  providerSelectionDisabled = false,
}: ComposerRuntimeFooterProps) {
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
        <span className={contextUsageTone(contextUsage)}>{formatComposerContext(contextUsage, contextState)}</span>
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
        {onSelectProviderModel ? (
          <button
            type="button"
            className="composer-provider-model"
            onClick={onSelectProviderModel}
            disabled={providerSelectionDisabled}
            aria-label={`Choose model and thinking for ${providerModel}`}
          >
            {providerModel}
          </button>
        ) : <span>{providerModel}</span>}
      </div>
    </div>
  );
}

function contextUsageTone(usage?: RuntimeContextUsage): string | undefined {
  if (usage?.percent !== null && usage?.percent !== undefined) {
    if (usage.percent > 90) {
      return "composer-context-error";
    }
    if (usage.percent > 70) {
      return "composer-context-warning";
    }
  }
  return undefined;
}

function formatComposerContext(
  usage: RuntimeContextUsage | undefined,
  state: PiContextState,
): string {
  if (state === "not_initialized") return "Pi context not initialized";
  if (state === "checking") return "Checking context stats…";
  if (state === "updating" && usage) return `${formatAvailableContext(usage)} · updating…`;
  if (state === "unknown_after_compaction") return "Context unknown after compaction";
  if (state === "session_missing") return "Pi context session unavailable";
  if (state === "model_mismatch") return "Waiting for usage from selected model…";
  if (state === "inspection_failed") return "Context stats unavailable";
  if (!usage || (usage.tokens === null && usage.contextWindow === null)) {
    return "Waiting for first context usage…";
  }
  return formatAvailableContext(usage);
}

function formatAvailableContext(usage: RuntimeContextUsage): string {
  if (usage.contextWindow === null) {
    return `Context ${formatTokenCount(usage.tokens as number)} · window unavailable`;
  }
  const contextWindow = formatTokenCount(usage.contextWindow);
  const percent = usage.percent === null ? "—" : `${usage.percent.toFixed(1)}%`;
  return `${percent}/${contextWindow}`;
}

function formatTokenCount(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : String(value);
}
