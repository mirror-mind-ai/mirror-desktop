export type DurableTurnJournalEvidence = {
  turnId: string;
  phase: "admitted" | "running" | "terminal_durable" | "projected" | "outbox_enqueued" | "settled" | "interrupted";
  terminalOutcome?: "completed" | "cancelled" | "spawn_failed" | "process_died" | null;
};

export type DurableOutboxEvidence = {
  itemId: string;
};

export type DurableSynchronizationDebt = {
  turnId: string;
  source: "outbox" | "journal_post_projection";
};

export function deriveDurableSynchronizationDebt(input: {
  journalRecords: readonly DurableTurnJournalEvidence[];
  outboxItems: readonly DurableOutboxEvidence[];
}): DurableSynchronizationDebt | undefined {
  const outboxItem = input.outboxItems.at(-1);
  if (outboxItem) return { turnId: outboxItem.itemId, source: "outbox" };
  const pendingRecord = [...input.journalRecords].reverse().find((record) =>
    record.terminalOutcome === "completed"
    && (record.phase === "projected" || record.phase === "outbox_enqueued"),
  );
  return pendingRecord
    ? { turnId: pendingRecord.turnId, source: "journal_post_projection" }
    : undefined;
}
