import type { RuntimeContextUsage, RuntimeProjectionState } from "./runtimeActivityModel";
import { mirrorModeDisplay, type MirrorOperatingMode } from "./mirrorModeState";

type ComposerRuntimeFooterProps = {
  projection: RuntimeProjectionState;
  runActive: boolean;
  contextUsage?: RuntimeContextUsage;
  activeMode?: MirrorOperatingMode;
  contextState?: "checking" | "waiting" | "available" | "not_initialized";
  providerModel: string;
  canInitializeContext?: boolean;
  initializingContext?: boolean;
  onInitializeContext?: () => void;
  onSelectProviderModel?: () => void;
  providerSelectionDisabled?: boolean;
};

const ACTIVE_STATUS_LABEL = {
  starting: "Working",
  working: "Working",
} as const;

export function ComposerRuntimeFooter({
  projection,
  runActive,
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
  const showActiveStatus = runActive
    && (projection.status === "starting" || projection.status === "working");

  return (
    <div className="composer-runtime-footer" aria-label="Agent session status">
      <div className="composer-runtime-primary">
        {showActiveStatus ? (
          <div className="composer-runtime-status" role="status" aria-live="polite">
            <span className="runtime-live-dot" aria-hidden="true" />
            <strong>{ACTIVE_STATUS_LABEL[projection.status as "starting" | "working"]}</strong>
            <span className="runtime-working-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
          </div>
        ) : null}
      </div>
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
  state: "checking" | "waiting" | "available" | "not_initialized",
): string {
  if (state === "not_initialized") {
    return "Pi context not initialized";
  }
  if (state === "checking") {
    return "Checking context stats…";
  }
  if (!usage || (usage.tokens === null && usage.contextWindow === null)) {
    return "Waiting for context stats…";
  }
  if (usage.contextWindow === null) {
    return `Context ${formatTokenCount(usage.tokens as number)}`;
  }
  const contextWindow = formatTokenCount(usage.contextWindow);
  const percent = usage.percent === null ? "—" : `${usage.percent.toFixed(1)}%`;
  return `${percent}/${contextWindow}`;
}

function formatTokenCount(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : String(value);
}
