import { describe, expect, it } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import { resolveJourneyConversationRestore } from "../app/journeyNavigationCoordinator";
import {
  createInitialJourneyRuntimeState,
  journeyRuntimeReducer,
  type JourneyRunIdentity,
} from "../app/journeyRuntimeState";
import type { DedicatedPiTranscriptEntry } from "../app/journeyThreadStorage";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { readProviderRefusalAfterLiveFailure } from "../domain/inactiveNativeAttempt";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";
import appSource from "../app/App.tsx?raw";

/**
 * CR159 reopened: its field falsifier failed on 2026-10-22, production alpha.55, Journey
 * mirror-desktop. Three turns were refused — an expired OAuth session, a 400 for exhausted extra
 * usage, four timeouts — and the Navigator was shown none of the three reasons.
 *
 * The reading was not the defect. The real session, cut at the instant of each failure, passed
 * through the real Rust inspector and the real candidate derivation yields every message exactly.
 * The defect is when the reading runs: only on restore, and restore skips the transcript while the
 * run is finalizing, which is precisely when the lease release that triggers it happens.
 */

function liveIdentity(runId: string): JourneyRunIdentity {
  const thread = readyThread("mirror-desktop");
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return {
    kind: "live",
    authority: createRunAuthority(
      createDedicatedTurnAuthority(thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`),
      conversation.liveIdentity,
      thread.generations[0],
    ),
  };
}

function registered(identity: JourneyRunIdentity) {
  if (identity.kind !== "live") throw new Error("expected live identity");
  const base = createDedicatedJourneyConversation({ thread: readyThread("mirror-desktop"), initialMessages: [] });
  const conversation = stageCorrelatedTurn(
    base,
    identity.authority.correlation,
    { id: identity.authority.harnessUserMessageId, role: "user", content: "Olá", createdAt: "2026-10-22T13:21:02.493Z" },
    { id: identity.authority.harnessAssistantMessageId, role: "assistant", content: "", createdAt: "2026-10-22T13:21:02.493Z" },
  );
  return journeyRuntimeReducer(createInitialJourneyRuntimeState(), {
    type: "register",
    identity,
    run: startAgentRun({ content: "Olá", mode: "live", now: new Date("2026-10-22T13:21:02Z") }),
    assistantMessageId: identity.authority.harnessAssistantMessageId,
    conversationSnapshot: conversation,
  });
}

describe("CR159 reopened: why the restore path never read the refusal", () => {
  /**
   * The order the stream delivers on a provider refusal: Pi's assistant `error` event, then
   * `agent_end`, which `piProcessStream` maps to `run_status: completed`, then `done`. The
   * completed status marks the entry finalizing — and a finalizing entry hands restore its
   * in-memory conversation, so restore takes no transcript reading at all.
   */
  it("hands restore the in-memory conversation while a refused run is finalizing", () => {
    const owner = liveIdentity("agent-run-2026-10-22T13:21:02.493Z");
    let state = registered(owner);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "run_status", status: "working" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "error", message: "Request timed out." } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "run_status", status: "completed" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "done" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: owner });

    const restore = resolveJourneyConversationRestore(state, "mirror-desktop", 1);
    expect(restore.runtimeConversation).toBeDefined();
    expect(restore.allowPersistedRecovery).toBe(false);
  });

  // Control: the same instrument returns the other answer once finalization ends — so the `false`
  // above is a measured state, not an instrument that can only say one thing.
  it("lets restore read the transcript once finalization has finished", () => {
    const owner = liveIdentity("agent-run-2026-10-22T13:21:02.493Z");
    let state = registered(owner);
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "run_status", status: "working" } });
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "run_status", status: "completed" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: owner });
    state = journeyRuntimeReducer(state, { type: "finalization_finished", identity: owner });

    const restore = resolveJourneyConversationRestore(state, "mirror-desktop", 1);
    expect(restore.runtimeConversation).toBeUndefined();
    expect(restore.allowPersistedRecovery).toBe(true);
  });
});

const authority = {
  journeyId: "mirror-desktop",
  threadId: "nautilus-thread-mirror-desktop",
  generation: 4,
  piSessionId: "nautilus-mirror-desktop-g4-18d72b1980244960",
};

function entry(partial: Partial<DedicatedPiTranscriptEntry> & Pick<DedicatedPiTranscriptEntry, "entryId" | "role">) {
  return { visibleText: "", stopReason: null, ...partial };
}

function refused(userEntryId: string, errorIds: string[], errorMessage: string) {
  return {
    leafEntryId: errorIds[errorIds.length - 1],
    incompleteUserEntryId: userEntryId,
    entries: [
      entry({ entryId: "6c36ecdc", role: "assistant", visibleText: "an earlier answer", stopReason: "stop" }),
      entry({ entryId: userEntryId, role: "user", visibleText: "Olá" }),
      ...errorIds.map((entryId) => entry({ entryId, role: "assistant", stopReason: "error", errorMessage })),
    ],
  };
}

// The three refusals of 2026-10-22, with the ids and messages the real inspector returned.
const usageMessage = "400 {\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"Third-party apps now draw from your extra usage, not your plan limits. Add more at claude.ai/settings/usage and keep going.\"},\"request_id\":\"req_011CgHGuzU8fr3q6fgE9TFbK\"}";
const fieldRefusals = [
  { name: "exhausted extra usage", inspection: refused("a749b014", ["e3b5994b"], usageMessage), message: usageMessage },
  { name: "four timeouts", inspection: refused("263b0a5c", ["c8b00fb9", "87fa0ff8", "214b381e", "3b31b1a5"], "Request timed out."), message: "Request timed out." },
  { name: "expired OAuth", inspection: refused("236c1368", ["9e179a64"], "Failed to authenticate: OAuth session expired and could not be refreshed"), message: "Failed to authenticate: OAuth session expired and could not be refreshed" },
];

describe("CR159 reopened: the live failure reads the refusal itself", () => {
  it.each(fieldRefusals)("names the provider's words for $name", async ({ inspection, message }) => {
    const refusal = await readProviderRefusalAfterLiveFailure(authority, async () => inspection);
    expect(refusal?.providerFailure).toBe(message);
    expect(refusal?.leafEntryId).toBe(inspection.leafEntryId);
  });

  /**
   * A failure with no provider words keeps today's surface: the durable interruption notice. Only a
   * refusal that can be named changes what the Navigator sees.
   */
  it("returns nothing for a failure the provider did not explain", async () => {
    const crashed = {
      leafEntryId: "u1",
      incompleteUserEntryId: "u1",
      entries: [entry({ entryId: "u1", role: "user", visibleText: "Olá" })],
    };
    expect(await readProviderRefusalAfterLiveFailure(authority, async () => crashed)).toBeUndefined();
  });

  it("never fails the turn when the transcript cannot be read", async () => {
    await expect(readProviderRefusalAfterLiveFailure(authority, async () => {
      throw new Error("Dedicated Pi session JSONL is unavailable.");
    })).resolves.toBeUndefined();
  });

  // The derivation refuses evidence it cannot trust by throwing; after a failure that refusal must
  // cost the Navigator nothing beyond the words, never the Conversation.
  it("never fails the turn when the evidence is invalid", async () => {
    const answered = {
      leafEntryId: "a1",
      incompleteUserEntryId: "u1",
      entries: [
        entry({ entryId: "u1", role: "user", visibleText: "Olá" }),
        entry({ entryId: "a1", role: "assistant", visibleText: "an answer", stopReason: "stop" }),
      ],
    };
    await expect(readProviderRefusalAfterLiveFailure(authority, async () => answered)).resolves.toBeUndefined();
  });
});

describe("CR159 reopened: the App reads the refusal on the failure path", () => {
  const branchStart = appSource.indexOf("} else if (runWasCancelled || runFailed) {");
  const branchEnd = appSource.indexOf("dispatchJourneyRuntime({ type: \"finalization_finished\", identity: runtimeIdentity });", branchStart);
  const branch = appSource.slice(branchStart, branchEnd);

  // Presence before order: a missing anchor reports -1, and -1 would make every slice below vacuous.
  it("finds the interrupted branch it guards", () => {
    expect(branchStart).toBeGreaterThan(0);
    expect(branchEnd).toBeGreaterThan(branchStart);
  });

  it("reads the refusal exactly once, inside the interrupted branch", () => {
    expect((appSource.match(/readProviderRefusalAfterLiveFailure\(/g) ?? []).length).toBe(1);
    expect(branch).toContain("readProviderRefusalAfterLiveFailure(");
  });

  // A cancelled turn is reported as cancelled, never as a provider refusal.
  it("reads it only for a failed live run, never for a cancelled one", () => {
    expect(branch).toMatch(/if \(runFailed && mode === "live" && failedRunAuthority\)/);
  });

  it("hands the words over only while the same Conversation is still in view", () => {
    const handover = branch.slice(branch.indexOf("readProviderRefusalAfterLiveFailure("));
    expect(handover).toMatch(/selectedJourneyRef\.current === ownerJourneyId\s*&& conversationRef\.current\.id === baseConversation\.id\s*&& conversationRef\.current\.liveIdentity\.generation === ownerGeneration\)\s*\{\s*setInactiveNativeAttempt\(refusal\);/);
  });

  // Census: the four existing writers plus this one. A sixth would need this guard read again.
  it("keeps the candidate's writers counted", () => {
    expect((appSource.match(/setInactiveNativeAttempt\(/g) ?? []).length).toBe(5);
  });
});
