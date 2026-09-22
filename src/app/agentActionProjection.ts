import { stripAnsiControlSequences } from "../agent/terminalText";
import type { ProjectedRuntimeOperation, RuntimeProjectionState } from "./runtimeActivityModel";

export type AgentActionGroup = {
  id: string;
  label: string;
  kind?: "reasoning";
  reasoningText?: string;
  truncated?: boolean;
  elided?: boolean;
  summaryId?: string;
  operations: ProjectedRuntimeOperation[];
  active: boolean;
};

const REASONING_TITLE_MAX_CHARS = 80;
const ACTION_CHIP_MAX_CHARS = 120;

export function projectAgentActionGroups(projection: RuntimeProjectionState): AgentActionGroup[] {
  const groups: AgentActionGroup[] = [];
  let currentSummaryGroup: AgentActionGroup | undefined;

  for (const reference of projection.activityOrder) {
    if (reference.type === "reasoning_summary") {
      currentSummaryGroup = undefined;
      const summary = projection.reasoningSummaries.find((candidate) => candidate.id === reference.id);
      if (!summary) continue;
      if (summary.elided) {
        const group: AgentActionGroup = {
          id: `summary:${summary.id}`,
          label: "further reasoning elided at the turn limit",
          kind: "reasoning",
          elided: true,
          summaryId: summary.id,
          operations: [],
          active: summary.status === "streaming",
        };
        groups.push(group);
        currentSummaryGroup = group;
        continue;
      }
      const source = summary.content.trim();
      if (!source) continue;
      const titles = standaloneTitles(source);
      if (titles) {
        titles.forEach((label, index) => {
          const group: AgentActionGroup = {
            id: titles.length > 1 ? `summary:${summary.id}:${index}` : `summary:${summary.id}`,
            label,
            summaryId: summary.id,
            operations: [],
            active: summary.status === "streaming" && index === titles.length - 1,
          };
          groups.push(group);
          currentSummaryGroup = group;
        });
        continue;
      }
      const formatted = formatSummary(source);
      const group: AgentActionGroup = isChipShaped(formatted)
        ? {
            id: `summary:${summary.id}`,
            label: formatted,
            summaryId: summary.id,
            operations: [],
            active: summary.status === "streaming",
          }
        : {
            id: `summary:${summary.id}`,
            label: deriveReasoningTitle(formatted),
            kind: "reasoning",
            reasoningText: formatted,
            ...(summary.truncated ? { truncated: true } : {}),
            summaryId: summary.id,
            operations: [],
            active: summary.status === "streaming",
          };
      groups.push(group);
      currentSummaryGroup = group;
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

function standaloneTitles(source: string): string[] | undefined {
  const paragraphs = source.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return undefined;
  const titles = paragraphs.map((paragraph) => {
    const match = paragraph.match(/^(\*\*|__)([^\n]+)\1$/);
    return match?.[2].trim();
  });
  return titles.every((title): title is string => Boolean(title)) ? titles : undefined;
}

function isChipShaped(formatted: string): boolean {
  return !formatted.includes("\n") && formatted.length <= ACTION_CHIP_MAX_CHARS;
}

export function deriveReasoningTitle(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  if (firstLine.length <= REASONING_TITLE_MAX_CHARS) return firstLine;
  const sentence = firstLine.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? firstLine;
  if (sentence.length <= REASONING_TITLE_MAX_CHARS) return sentence;
  return `${sentence.slice(0, REASONING_TITLE_MAX_CHARS - 1).trimEnd()}…`;
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
