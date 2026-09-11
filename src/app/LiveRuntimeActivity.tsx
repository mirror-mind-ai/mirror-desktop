import { useEffect, useReducer, type SyntheticEvent } from "react";
import type { ProjectedRuntimeOperation, RuntimeProjectionState } from "./runtimeActivityModel";
import { isRuntimeProjectionActive } from "./runtimeActivityModel";
import { stripAnsiControlSequences } from "../agent/terminalText";
import { LinkifiedText } from "./LinkifiedText";
import { projectAgentActionGroups, isOperationActive, type AgentActionGroup } from "./agentActionProjection";
import { reduceActionDisclosure, resolveActionOpen } from "./actionDisclosureState";
import {
  extractMirrorModeEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  ImportedActivity,
  normalizeMirrorSurfaceContent,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
} from "./ImportedActivity";

type LiveRuntimeActivityProps = {
  projection: RuntimeProjectionState;
  basePath?: string;
  suppressedSurfaceContents?: string[];
  showRegionLabel?: boolean;
  showSuccessfulTerminalStatus?: boolean;
};

const OPERATION_STATUS_LABEL: Record<RuntimeProjectionState["operations"][number]["status"], string> = {
  preparing: "preparing",
  running: "running",
  completed: "completed",
  failed: "failed",
  interrupted: "interrupted",
};

const RUN_STATUS_LABEL: Record<RuntimeProjectionState["status"], string> = {
  starting: "Working",
  working: "Working",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function LiveRuntimeActivity({
  projection,
  basePath,
  suppressedSurfaceContents = [],
  showRegionLabel = true,
  showSuccessfulTerminalStatus = true,
}: LiveRuntimeActivityProps) {
  const active = isRuntimeProjectionActive(projection);

  return (
    <section className={`live-runtime-activity ${active ? "is-active" : `is-settled status-${projection.status}`}`} aria-label="Pi runtime activity">
      {projection.activityOrder.length > 0 ? (
        <section className="runtime-activity-region" aria-label="Ordered agent activity">
          {showRegionLabel ? <span className="runtime-region-label">Runtime activity</span> : null}
          <div className="runtime-operation-list">
            {projectAgentActionGroups(projection).map((action) => (
              <RuntimeAgentAction
                key={action.id}
                action={action}
                basePath={basePath}
                suppressedSurfaceContents={suppressedSurfaceContents}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!active && (projection.status !== "completed" || showSuccessfulTerminalStatus) ? (
        <div className="runtime-terminal-status" role="status">
          <strong>{RUN_STATUS_LABEL[projection.status]}</strong>
          {projection.terminalMessage ? <span>{projection.terminalMessage}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function RuntimeAgentAction({
  action,
  basePath,
  suppressedSurfaceContents,
}: {
  action: AgentActionGroup;
  basePath?: string;
  suppressedSurfaceContents: string[];
}) {
  const disclosure = useRuntimeDisclosure(action.active);
  if (action.operations.length === 0) {
    return (
      <p className={`runtime-agent-action-statement${action.active ? " is-active" : ""}`}>
        {action.label}
      </p>
    );
  }
  return (
    <details
      className={`runtime-agent-action${action.active ? " is-active" : " is-settled"}`}
      open={disclosure.open}
      onToggle={disclosure.onToggle}
    >
      <summary>
        <strong>{action.label}</strong>
        <span>{action.active ? "running" : `${action.operations.length} ${action.operations.length === 1 ? "tool" : "tools"}`}</span>
      </summary>
      <div className="runtime-agent-action-body">
        {action.operations.map((operation) => operation.kind === "compaction"
          ? <RuntimeCompaction key={operation.id} operation={operation} basePath={basePath} />
          : <RuntimeOperation
              key={operation.id}
              operation={operation}
              basePath={basePath}
              suppressedSurfaceContents={suppressedSurfaceContents}
            />)}
      </div>
    </details>
  );
}

function useRuntimeDisclosure(active: boolean): {
  open: boolean;
  onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
} {
  const [state, dispatch] = useReducer(reduceActionDisclosure, {
    manuallyOpen: false,
    wasActive: active,
  });
  useEffect(() => {
    dispatch({ type: "activity_changed", active });
  }, [active]);
  return {
    open: resolveActionOpen({ manuallyOpen: state.manuallyOpen, active }),
    onToggle: (event) => {
      if (event.target !== event.currentTarget) return;
      if (active) {
        event.currentTarget.open = true;
        return;
      }
      dispatch({ type: "toggle_requested", open: event.currentTarget.open });
    },
  };
}

function RuntimeCompaction({ operation, basePath }: { operation: ProjectedRuntimeOperation; basePath?: string }) {
  const reason = compactionReason(operation.arguments);
  const output = operation.output === undefined
    ? undefined
    : stripAnsiControlSequences(operation.output);

  return (
    <div className={`runtime-compaction status-${operation.status}`}>
      <span className="runtime-compaction-icon" aria-hidden="true">↻</span>
      <div className="runtime-compaction-copy">
        <div className="runtime-compaction-heading">
          <strong>Context compaction</strong>
          <span>{OPERATION_STATUS_LABEL[operation.status]}</span>
        </div>
        {reason ? <small>{reason}</small> : null}
        {output ? <p><LinkifiedText text={output} basePath={basePath} /></p> : null}
      </div>
    </div>
  );
}

function compactionReason(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("reason" in value)) {
    return undefined;
  }
  const reason = String(value.reason);
  return reason ? `${reason} trigger` : undefined;
}

function RuntimeOperation({
  operation,
  basePath,
  suppressedSurfaceContents,
}: {
  operation: ProjectedRuntimeOperation;
  basePath?: string;
  suppressedSurfaceContents: string[];
}) {
  const active = isOperationActive(operation);
  const disclosure = useRuntimeDisclosure(active);
  const argumentTitle = operation.kind === "skill" ? undefined : firstOperationArgument(operation.arguments);
  const argumentPreview = operation.kind === "skill" ? undefined : summarizeOperationArgument(operation.arguments);
  const sanitizedOutput = operation.output === undefined
    ? undefined
    : stripAnsiControlSequences(operation.output);
  const allSurfaceEvents = sanitizedOutput
    ? extractMirrorSurfaceEventsFromContent({
        content: sanitizedOutput,
        messageId: `runtime-${operation.id}`,
        createdAt: "live",
      }).map((event) => ({
        ...event,
        source: { system: "mirror" as const, table: "runtime", id: operation.id },
      }))
    : [];
  const suppressedSurfaces = new Set(suppressedSurfaceContents.map(normalizeMirrorSurfaceContent));
  const surfaceEvents = allSurfaceEvents.filter(
    (event) => !event.content || !suppressedSurfaces.has(normalizeMirrorSurfaceContent(event.content)),
  );
  const outputWithoutSurfaces = sanitizedOutput === undefined
    ? undefined
    : stripMirrorSurfaceBlocks(sanitizedOutput);
  const allModeEvents = outputWithoutSurfaces
    ? extractMirrorModeEventsFromContent({
        content: outputWithoutSurfaces,
        messageId: `runtime-${operation.id}`,
        createdAt: "live",
      }).map((event) => ({
        ...event,
        source: { system: "mirror" as const, table: "runtime", id: operation.id },
      }))
    : [];
  const modeEvents = allModeEvents.filter(
    (event) => !event.content || !suppressedSurfaces.has(normalizeMirrorSurfaceContent(event.content)),
  );
  const activityEvents = [...modeEvents, ...surfaceEvents];
  const visibleOutput = outputWithoutSurfaces === undefined
    ? undefined
    : allModeEvents.length > 0
      ? stripMirrorModeBlocks(outputWithoutSurfaces).trim()
      : outputWithoutSurfaces;

  return (
    <div className="runtime-operation-entry">
      <details
        className={`runtime-operation kind-${operation.kind ?? "tool"} status-${operation.status}`}
        open={disclosure.open}
        onToggle={disclosure.onToggle}
      >
        <summary>
          <span
            className="runtime-operation-name"
            title={argumentTitle}
          >
            {operation.kind === "skill" ? "Skill · " : operation.kind === "compaction" ? "Pi · " : ""}{operation.name}
            {argumentPreview ? ` · ${argumentPreview}` : ""}
          </span>
          <span className="runtime-operation-status">{OPERATION_STATUS_LABEL[operation.status]}</span>
        </summary>
        <div className="runtime-operation-body">
          {operation.arguments !== undefined ? (
            <div className="runtime-operation-section">
              <small>Arguments</small>
              <pre><LinkifiedText text={formatArguments(operation.arguments)} basePath={basePath} /></pre>
            </div>
          ) : null}
          {visibleOutput !== undefined && (visibleOutput || activityEvents.length === 0) ? (
            <div className="runtime-operation-section">
              <small>{operation.isError ? "Error" : "Output"}</small>
              <pre><LinkifiedText text={visibleOutput || "No output"} basePath={basePath} /></pre>
            </div>
          ) : null}
        </div>
      </details>
      {activityEvents.length > 0 ? <ImportedActivity events={activityEvents} basePath={basePath} /> : null}
    </div>
  );
}

const OPERATION_ARGUMENT_PREVIEW_LENGTH = 58;

export function summarizeOperationArgument(value: unknown): string | undefined {
  const argument = firstOperationArgument(value);
  if (!argument) {
    return undefined;
  }
  if (argument.length <= OPERATION_ARGUMENT_PREVIEW_LENGTH) {
    return argument;
  }

  const startLength = Math.ceil((OPERATION_ARGUMENT_PREVIEW_LENGTH - 1) / 2);
  const endLength = OPERATION_ARGUMENT_PREVIEW_LENGTH - 1 - startLength;
  return `${argument.slice(0, startLength)}…${argument.slice(-endLength)}`;
}

function firstOperationArgument(value: unknown): string | undefined {
  let firstValue: unknown;
  if (typeof value === "string") {
    firstValue = value;
  } else if (Array.isArray(value)) {
    firstValue = value[0];
  } else if (value && typeof value === "object") {
    firstValue = Object.values(value)[0];
  }

  if (firstValue === undefined) {
    return undefined;
  }
  const text = typeof firstValue === "string" ? firstValue : JSON.stringify(firstValue);
  return typeof text === "string"
    ? stripAnsiControlSequences(text).replace(/\s+/g, " ").trim() || undefined
    : undefined;
}

function formatArguments(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}
