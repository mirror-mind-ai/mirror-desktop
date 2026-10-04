import { invoke } from "@tauri-apps/api/core";
import type { SettlementTimingRecord } from "./settlementPhaseTiming";

/**
 * CR119: exactly one append per settled turn, after the record is complete. A failure here is
 * reported to the caller's `onFailure` and otherwise swallowed: a diagnostic that could fail a
 * settlement would be a worse defect than the slowness it measures.
 */
export async function appendSettlementTiming(
  record: SettlementTimingRecord,
  onFailure?: (reason: string) => void,
): Promise<void> {
  try {
    await invoke<void>("append_settlement_timing", { journeyId: record.journeyId, record });
  } catch (error) {
    onFailure?.(error instanceof Error ? error.message : String(error));
  }
}
