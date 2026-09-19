import { describe, expect, it } from "vitest";
import {
  projectJourneySettlementErrors,
  updateExactSettlementError,
  type ExactSettlementError,
} from "../app/settlementDiagnostics";

const a = { journeyId: "journey-a", runId: "run-a1", turnId: "turn-a1" };
const b = { journeyId: "journey-a", runId: "run-a2", turnId: "turn-a2" };

function update(
  current: Record<string, ExactSettlementError>,
  identity: typeof a,
  message: string | undefined,
) {
  return updateExactSettlementError(current, identity, message);
}

describe("exact settlement diagnostics", () => {
  it("clears only the completing run and preserves a successor failure", () => {
    let errors: Record<string, ExactSettlementError> = {};
    errors = update(errors, a, "A failed");
    errors = update(errors, b, "B failed");
    errors = update(errors, a, undefined);

    expect(Object.values(errors)).toEqual([
      expect.objectContaining({ runId: "run-a2", turnId: "turn-a2", message: "B failed" }),
    ]);
    expect(projectJourneySettlementErrors({}, errors)).toEqual({ "journey-a": "B failed" });
  });

  it("aggregates concurrent exact debts without allowing late A to replace B", () => {
    let errors: Record<string, ExactSettlementError> = {};
    errors = update(errors, b, "B failed");
    errors = update(errors, a, "A failed late");

    expect(projectJourneySettlementErrors({}, errors)).toEqual({
      "journey-a": "2 Mirror settlement operations need attention.",
    });
  });

  it("keeps journey-level inspection failures independent from exact run debt", () => {
    const errors = update({}, a, "A failed");
    expect(projectJourneySettlementErrors({ "journey-a": "Outbox unavailable" }, errors)).toEqual({
      "journey-a": "Outbox unavailable 1 exact Mirror settlement operation also needs attention.",
    });
  });
});
