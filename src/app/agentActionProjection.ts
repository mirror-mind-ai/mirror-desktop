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
      currentSummaryGroup = undefined;
      const summary = projection.reasoningSummaries.find((candidate) => candidate.id === reference.id);
      if (!summary) continue;
      const labels = actionLabels(summary.content);
      labels.forEach((label, index) => {
        const group: AgentActionGroup = {
          id: labels.length > 1 ? `summary:${summary.id}:${index}` : `summary:${summary.id}`,
          label,
          summaryId: summary.id,
          operations: [],
          active: summary.status === "streaming" && index === labels.length - 1,
        };
        groups.push(group);
        currentSummaryGroup = group;
      });
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

function actionLabels(content: string): string[] {
  const source = content.trim();
  if (!source) return [];
  const paragraphs = source.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    const standaloneTitles = paragraphs.map((paragraph) => {
      const match = paragraph.match(/^(\*\*|__)([^\n]+)\1$/);
      return match?.[2].trim();
    });
    if (standaloneTitles.every((title): title is string => Boolean(title))) return standaloneTitles;
  }
  return [formatSummary(source)];
}

function formatSummary(content: string): string {
  return content.split("\n").map((line) => line.replace(/^(\s*)(\*\*|__)(.+)\2(\s*)$/, "$1$3$4")).join("\n");
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
