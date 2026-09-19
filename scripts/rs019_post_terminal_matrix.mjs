#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const POST_TERMINAL_OUTCOMES = Object.freeze([
  "completed",
  "cancelled",
  "provider_failed",
  "process_died",
]);

export const POST_TERMINAL_FRONTIERS = Object.freeze([
  "projection",
  "journal",
  "segment",
  "outbox",
  "mirror",
  "acknowledgement",
  "presentation",
]);

const ROOT_KEYS = [
  "schemaVersion",
  "kind",
  "appIdentifier",
  "sourceRevision",
  "capturedAt",
  "scenarios",
  "crossJourney",
];
const SCENARIO_KEYS = [
  "id",
  "terminalOutcome",
  "failedFrontier",
  "piTranscriptIntact",
  "priorProcessInactive",
  "composerAvailableWithoutRestart",
  "successorAdmitted",
  "successorSettled",
  "oldDebtVisible",
  "oldDebtRecoverable",
  "lateCleanupPreservesSuccessor",
  "providerCallsBefore",
  "providerCallsAfter",
  "relaunchComposerAvailable",
  "relaunchTranscriptMatches",
];
const CROSS_JOURNEY_KEYS = [
  "terminalDebtConsumesCapacity",
  "activeExecutionBlocksSameJourney",
  "activeExecutionCountsTowardGlobalCapacity",
  "lateCleanupPreservesSuccessor",
];
const MAX_EVIDENCE_BYTES = 64 * 1024;
const REVISION_PATTERN = /^[a-f0-9]{7,40}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function assertScenarioInvariant(scenario) {
  const requiredTrue = [
    "piTranscriptIntact",
    "priorProcessInactive",
    "composerAvailableWithoutRestart",
    "successorAdmitted",
    "successorSettled",
    "oldDebtVisible",
    "oldDebtRecoverable",
    "lateCleanupPreservesSuccessor",
    "relaunchComposerAvailable",
    "relaunchTranscriptMatches",
  ];
  if (requiredTrue.some((key) => scenario[key] !== true)
    || !isNonNegativeInteger(scenario.providerCallsBefore)
    || scenario.providerCallsAfter !== scenario.providerCallsBefore) {
    throw new Error("matrix_invariant_failed");
  }
}

export function validatePostTerminalMatrix(value) {
  if (!hasExactKeys(value, ROOT_KEYS)
    || value.schemaVersion !== "1.0.0"
    || value.kind !== "rs019_post_terminal_continuity_matrix") {
    throw new Error("matrix_shape_invalid");
  }
  if (value.appIdentifier !== "ai.mirrormind.desktop.dev") {
    throw new Error("matrix_app_identifier_invalid");
  }
  if (!REVISION_PATTERN.test(value.sourceRevision) || !isIsoTimestamp(value.capturedAt)) {
    throw new Error("matrix_coordinate_invalid");
  }
  if (!Array.isArray(value.scenarios)) throw new Error("matrix_shape_invalid");

  const requiredCoordinates = new Set(POST_TERMINAL_OUTCOMES.flatMap((outcome) => (
    POST_TERMINAL_FRONTIERS.map((frontier) => `${outcome}:${frontier}`)
  )));
  const observedCoordinates = new Set();
  for (const scenario of value.scenarios) {
    if (!hasExactKeys(scenario, SCENARIO_KEYS)) throw new Error("matrix_shape_invalid");
    if (!POST_TERMINAL_OUTCOMES.includes(scenario.terminalOutcome)
      || !POST_TERMINAL_FRONTIERS.includes(scenario.failedFrontier)) {
      throw new Error("matrix_coordinate_invalid");
    }
    const coordinate = `${scenario.terminalOutcome}:${scenario.failedFrontier}`;
    if (scenario.id !== coordinate) throw new Error("matrix_coordinate_invalid");
    if (observedCoordinates.has(coordinate)) throw new Error("matrix_coordinate_duplicate");
    observedCoordinates.add(coordinate);
    assertScenarioInvariant(scenario);
  }
  if (observedCoordinates.size !== requiredCoordinates.size
    || [...requiredCoordinates].some((coordinate) => !observedCoordinates.has(coordinate))) {
    throw new Error("matrix_incomplete");
  }

  if (!hasExactKeys(value.crossJourney, CROSS_JOURNEY_KEYS)) throw new Error("matrix_shape_invalid");
  if (value.crossJourney.terminalDebtConsumesCapacity !== false
    || value.crossJourney.activeExecutionBlocksSameJourney !== true
    || value.crossJourney.activeExecutionCountsTowardGlobalCapacity !== true
    || value.crossJourney.lateCleanupPreservesSuccessor !== true) {
    throw new Error("matrix_invariant_failed");
  }

  const digest = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return {
    schemaVersion: "1.0.0",
    kind: "rs019_post_terminal_continuity_matrix_validation",
    sourceRevision: value.sourceRevision,
    capturedAt: value.capturedAt,
    scenarioCount: observedCoordinates.size,
    outcomeCount: POST_TERMINAL_OUTCOMES.length,
    frontierCount: POST_TERMINAL_FRONTIERS.length,
    digest,
  };
}

function readEvidence(path) {
  const resolved = resolve(path);
  const metadata = lstatSync(resolved);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > MAX_EVIDENCE_BYTES) {
    throw new Error("matrix_evidence_file_invalid");
  }
  let value;
  try {
    value = JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    throw new Error("matrix_evidence_json_invalid");
  }
  return value;
}

function parseArgs(argv) {
  if (argv[0] !== "validate" || argv[1] !== "--evidence" || !argv[2] || argv.length !== 3) {
    throw new Error("Usage: rs019_post_terminal_matrix.mjs validate --evidence PATH");
  }
  return argv[2];
}

function main(argv) {
  const result = validatePostTerminalMatrix(readEvidence(parseArgs(argv)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
