import { invoke } from "@tauri-apps/api/core";
import type { AgentProviderConfig } from "../agent/providerConfig";

// CR080: the chapter a manual compaction just closed, as the native command returns it.
export type PiCompactionResult = {
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number | null;
  estimatedTokensAfter: number | null;
};

function optionalCount(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Pi compaction ${label} token estimate is invalid.`);
  }
  return value;
}

export function parsePiCompactionResult(value: unknown): PiCompactionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Pi compaction result is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string" || !record.summary.trim()) {
    throw new Error("Pi compaction result has no summary.");
  }
  if (typeof record.firstKeptEntryId !== "string" || !record.firstKeptEntryId) {
    throw new Error("Pi compaction result has no retained-tail authority.");
  }
  return {
    summary: record.summary,
    firstKeptEntryId: record.firstKeptEntryId,
    tokensBefore: optionalCount(record.tokensBefore, "before"),
    estimatedTokensAfter: optionalCount(record.estimatedTokensAfter, "after"),
  };
}

/**
 * Compacts the selected Journey's active generation while it is idle. The native command
 * refuses if a turn is active or another compaction is in flight, and turn admission
 * refuses while this runs, so the two can never overlap on one session.
 */
export async function compactJourneySession(input: {
  journeyId: string;
  threadId: string;
  config: AgentProviderConfig;
  customInstructions?: string;
}): Promise<PiCompactionResult> {
  const value = await invoke<unknown>("compact_pi_session", {
    journeyId: input.journeyId,
    threadId: input.threadId,
    config: input.config,
    customInstructions: input.customInstructions ?? null,
  });
  return parsePiCompactionResult(value);
}
