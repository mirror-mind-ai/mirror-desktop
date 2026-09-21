import { describe, expect, it } from "vitest";
import { deriveDurableSynchronizationDebt } from "../domain/durableSynchronizationStatus";

describe("durable synchronization debt derivation", () => {
  it("reports no debt when every journal record is settled and the outbox is empty", () => {
    expect(deriveDurableSynchronizationDebt({
      journalRecords: [
        { turnId: "turn-1", phase: "settled", terminalOutcome: "completed" },
        { turnId: "turn-2", phase: "settled", terminalOutcome: "completed" },
      ],
      outboxItems: [],
    })).toBeUndefined();
  });

  it("reports outbox debt for a retained item", () => {
    expect(deriveDurableSynchronizationDebt({
      journalRecords: [{ turnId: "turn-1", phase: "outbox_enqueued", terminalOutcome: "completed" }],
      outboxItems: [{ itemId: "turn-1" }],
    })).toEqual({ turnId: "turn-1", source: "outbox" });
  });

  it("keeps outbox authority when the journal already claims settled", () => {
    expect(deriveDurableSynchronizationDebt({
      journalRecords: [{ turnId: "turn-1", phase: "settled", terminalOutcome: "completed" }],
      outboxItems: [{ itemId: "turn-1" }],
    })).toEqual({ turnId: "turn-1", source: "outbox" });
  });

  it("reports post-projection journal debt without an outbox item", () => {
    expect(deriveDurableSynchronizationDebt({
      journalRecords: [{ turnId: "turn-1", phase: "projected", terminalOutcome: "completed" }],
      outboxItems: [],
    })).toEqual({ turnId: "turn-1", source: "journal_post_projection" });
  });

  it("ignores non-completed and pre-projection records", () => {
    expect(deriveDurableSynchronizationDebt({
      journalRecords: [
        { turnId: "turn-1", phase: "interrupted", terminalOutcome: "cancelled" },
        { turnId: "turn-2", phase: "terminal_durable", terminalOutcome: "completed" },
        { turnId: "turn-3", phase: "admitted", terminalOutcome: null },
      ],
      outboxItems: [],
    })).toBeUndefined();
  });
});
