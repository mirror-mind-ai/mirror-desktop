import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  POST_TERMINAL_FRONTIERS,
  POST_TERMINAL_OUTCOMES,
  validatePostTerminalMatrix,
} from "../../scripts/rs019_post_terminal_matrix.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function completeEvidence() {
  return {
    schemaVersion: "1.0.0",
    kind: "rs019_post_terminal_continuity_matrix",
    appIdentifier: "ai.mirrormind.desktop.dev",
    sourceRevision: "abcdef1",
    capturedAt: "2026-09-20T10:00:00.000Z",
    scenarios: POST_TERMINAL_OUTCOMES.flatMap((terminalOutcome) => (
      POST_TERMINAL_FRONTIERS.map((failedFrontier) => ({
        id: `${terminalOutcome}:${failedFrontier}`,
        terminalOutcome,
        failedFrontier,
        piTranscriptIntact: true,
        priorProcessInactive: true,
        composerAvailableWithoutRestart: true,
        successorAdmitted: true,
        successorSettled: true,
        oldDebtVisible: true,
        oldDebtRecoverable: true,
        lateCleanupPreservesSuccessor: true,
        providerCallsBefore: 1,
        providerCallsAfter: 1,
        relaunchComposerAvailable: true,
        relaunchTranscriptMatches: true,
      }))
    )),
    crossJourney: {
      terminalDebtConsumesCapacity: false,
      activeExecutionBlocksSameJourney: true,
      activeExecutionCountsTowardGlobalCapacity: true,
      lateCleanupPreservesSuccessor: true,
    },
  };
}

describe("RS019 post-terminal matrix evidence", () => {
  it("accepts the exact 4 x 7 private-data-free matrix and emits only bounded summary evidence", () => {
    const result = validatePostTerminalMatrix(completeEvidence());
    expect(result).toMatchObject({
      schemaVersion: "1.0.0",
      kind: "rs019_post_terminal_continuity_matrix_validation",
      scenarioCount: 28,
      outcomeCount: 4,
      frontierCount: 7,
      sourceRevision: "abcdef1",
    });
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("providerCalls");
  });

  it("rejects missing and duplicate coordinates", () => {
    const missing = completeEvidence();
    missing.scenarios.pop();
    expect(() => validatePostTerminalMatrix(missing)).toThrow("matrix_incomplete");

    const duplicate = completeEvidence();
    duplicate.scenarios[27] = { ...duplicate.scenarios[0] };
    expect(() => validatePostTerminalMatrix(duplicate)).toThrow("matrix_coordinate_duplicate");
  });

  it("rejects active predecessors, provider reruns, lost debt, relaunch drift, and successor mutation", () => {
    for (const [field, value] of [
      ["priorProcessInactive", false],
      ["providerCallsAfter", 2],
      ["oldDebtVisible", false],
      ["oldDebtRecoverable", false],
      ["relaunchTranscriptMatches", false],
      ["lateCleanupPreservesSuccessor", false],
    ]) {
      const evidence = completeEvidence();
      evidence.scenarios[0][field] = value;
      expect(() => validatePostTerminalMatrix(evidence), field).toThrow("matrix_invariant_failed");
    }
  });

  it("rejects production coordinates, arbitrary content, and contradictory capacity evidence", () => {
    const production = completeEvidence();
    production.appIdentifier = "ai.mirrormind.desktop";
    expect(() => validatePostTerminalMatrix(production)).toThrow("matrix_app_identifier_invalid");

    const privateContent = completeEvidence();
    privateContent.scenarios[0].prompt = "private prompt";
    expect(() => validatePostTerminalMatrix(privateContent)).toThrow("matrix_shape_invalid");

    const capacity = completeEvidence();
    capacity.crossJourney.terminalDebtConsumesCapacity = true;
    expect(() => validatePostTerminalMatrix(capacity)).toThrow("matrix_invariant_failed");
  });

  it("validates a bounded file through the release-review CLI without echoing scenario data", () => {
    const root = mkdtempSync(join(tmpdir(), "rs019-matrix-"));
    roots.push(root);
    const evidencePath = join(root, "evidence.json");
    writeFileSync(evidencePath, `${JSON.stringify(completeEvidence())}\n`);
    const output = execFileSync(process.execPath, [
      "scripts/rs019_post_terminal_matrix.mjs",
      "validate",
      "--evidence",
      evidencePath,
    ], { cwd: process.cwd(), encoding: "utf8" });
    const result = JSON.parse(output);
    expect(result.scenarioCount).toBe(28);
    expect(output).not.toContain("completed:projection");
  });
});
