import type { ProjectedRuntimeOperation, RuntimeProjectionState } from "./runtimeActivityModel";
import { isRuntimeProjectionActive } from "./runtimeActivityModel";
import { stripAnsiControlSequences } from "../agent/terminalText";
import { LinkifiedText } from "./LinkifiedText";
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
};

const OPERATION_STATUS_LABEL: Record<RuntimeProjectionState["operations"][number]["status"], string> = {
  preparing: "preparing",
  running: "running",
  completed: "completed",
  failed: "failed",
  interrupted: "interrupted",
};

const RUN_STATUS_LABEL: Record<RuntimeProjectionState["status"], string> = {
  starting: "Starting",
  working: "Working",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function LiveRuntimeActivity({ projection, basePath, suppressedSurfaceContents = [] }: LiveRuntimeActivityProps) {
  const active = isRuntimeProjectionActive(projection);

  return (
    <section className={`live-runtime-activity ${active ? "is-active" : `is-settled status-${projection.status}`}`} aria-label="Pi runtime activity">
      {!active ? (
        <div className="runtime-terminal-status" role="status">
          <strong>{RUN_STATUS_LABEL[projection.status]}</strong>
          {projection.terminalMessage ? <span>{projection.terminalMessage}</span> : null}
        </div>
      ) : null}

      {projection.activityOrder.length > 0 ? (
        <section className="runtime-activity-region" aria-label="Ordered agent activity">
          <span className="runtime-region-label">Runtime activity</span>
          <div className="runtime-operation-list">
            {projection.activityOrder.map((entry) => {
              if (entry.type === "reasoning_summary") {
                const summary = projection.reasoningSummaries.find((candidate) => candidate.id === entry.id);
                if (!summary?.content) {
                  return null;
                }
                return (
                  <p
                    key={summary.id}
                    className={`runtime-reasoning-summary status-${summary.status}`}
                    aria-live={summary.status === "streaming" ? "polite" : undefined}
                  >
                    {formatReasoningSummary(summary.content)}
                  </p>
                );
              }

              const operation = projection.operations.find((candidate) => candidate.id === entry.id);
              if (!operation) {
                return null;
              }
              return operation.kind === "compaction"
                ? <RuntimeCompaction key={operation.id} operation={operation} basePath={basePath} />
                : <RuntimeOperation
                    key={operation.id}
                    operation={operation}
                    basePath={basePath}
                    suppressedSurfaceContents={suppressedSurfaceContents}
                  />;
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
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
  const expanded = operation.status === "preparing" || operation.status === "running";
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
  const modeEvents = outputWithoutSurfaces
    ? extractMirrorModeEventsFromContent({
        content: outputWithoutSurfaces,
        messageId: `runtime-${operation.id}`,
        createdAt: "live",
      }).map((event) => ({
        ...event,
        source: { system: "mirror" as const, table: "runtime", id: operation.id },
      }))
    : [];
  const activityEvents = [...modeEvents, ...surfaceEvents];
  const visibleOutput = outputWithoutSurfaces === undefined
    ? undefined
    : modeEvents.length > 0
      ? stripMirrorModeBlocks(outputWithoutSurfaces).trim()
      : outputWithoutSurfaces;

  return (
    <div className="runtime-operation-entry">
      <details className={`runtime-operation kind-${operation.kind ?? "tool"} status-${operation.status}`} open={expanded}>
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

function formatReasoningSummary(value: string): string {
  return value
    .trim()
    .split("\n")
    .map((line) => line.replace(/^(\s*)(\*\*|__)(.+)\2(\s*)$/, "$1$3$4"))
    .join("\n");
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
