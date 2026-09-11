import { stripAnsiControlSequences } from "../agent/terminalText";
import type { ProjectedRuntimeOperation, RuntimeProjectionState } from "./runtimeActivityModel";

export type AgentActionGroup = {
  id: string;
  label: string;
  summaryId?: string;
  operations: ProjectedRuntimeOperation[];
  active: boolean;
};

export function projectAgentActionGroups(projection: RuntimeProjectionState): AgentActionGroup[] {
  const groups: AgentActionGroup[] = [];
  let currentSummaryGroup: AgentActionGroup | undefined;

  for (const reference of projection.activityOrder) {
    if (reference.type === "reasoning_summary") {
      const summary = projection.reasoningSummaries.find((candidate) => candidate.id === reference.id);
      if (!summary?.content.trim()) continue;
      currentSummaryGroup = {
        id: `summary:${summary.id}`,
        label: formatSummary(summary.content),
        summaryId: summary.id,
        operations: [],
        active: summary.status === "streaming",
      };
      groups.push(currentSummaryGroup);
      continue;
    }

    const operation = projection.operations.find((candidate) => candidate.id === reference.id);
    if (!operation) continue;
    if (currentSummaryGroup) {
      currentSummaryGroup.operations.push(operation);
      currentSummaryGroup.active ||= isOperationActive(operation);
      continue;
    }
    groups.push({
      id: `operation:${operation.id}`,
      label: operationLabel(operation),
      operations: [operation],
      active: isOperationActive(operation),
    });
  }

  return groups;
}

export function isOperationActive(operation: Pick<ProjectedRuntimeOperation, "status">): boolean {
  return operation.status === "preparing" || operation.status === "running";
}

export function operationLabel(operation: Pick<ProjectedRuntimeOperation, "name" | "arguments">): string {
  const preview = firstArgumentPreview(operation.arguments);
  return preview ? `${operation.name} · ${preview}` : operation.name;
}

function formatSummary(content: string): string {
  return content.trim().split("\n").map((line) => line.replace(/^(\s*)(\*\*|__)(.+)\2(\s*)$/, "$1$3$4")).join("\n");
}

function firstArgumentPreview(value: unknown): string | undefined {
  let first: unknown;
  if (typeof value === "string") first = value;
  else if (Array.isArray(value)) first = value[0];
  else if (value && typeof value === "object") first = Object.values(value)[0];
  if (first === undefined) return undefined;
  const text = stripAnsiControlSequences(typeof first === "string" ? first : JSON.stringify(first)).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= 58) return text;
  return `${text.slice(0, 29)}…${text.slice(-(58 - 30))}`;
}
