import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import processStreamSource from "../agent/piProcessStream.ts?raw";
import nativeSource from "../../src-tauri/src/main.rs?raw";
import {
  deliverSteeringWhenReady,
  settleSteeringDelivery,
  STEERING_READINESS_DEADLINE_MS,
  type SteeringDeliveryOutcome,
} from "../app/steeringDelivery";
import { appendPendingSteering, transitionSteering } from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";

/**
 * CR187: a correction sent in the first seconds of a turn was rejected, one sent later was taken.
 * Pi queues a steer at any point once it reads it; the refusal was the Desktop's own. Between Send
 * and the moment the native invocation has written the turn's prompt to Pi, `steer_pi_invocation`
 * found no invocation, or an invocation without a child, and refused. A correction that arrives
 * that early now waits, still pending, and is delivered once the invocation can take it.
 */
function fixture() {
  const thread = readyThread("journey-one");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const conversation = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "Start", createdAt: "2026-11-04T09:59:00Z" },
    { id: "assistant-1", role: "assistant", content: "", createdAt: "2026-11-04T09:59:00Z" },
  );
  const authority = createRunAuthority(correlation, base.liveIdentity, thread.generations[0]);
  return { conversation, authority };
}

function clock() {
  let now = 0;
  const sleeps: number[] = [];
  return {
    now: () => now,
    sleep: async (ms: number) => { sleeps.push(ms); now += ms; },
    sleeps,
  };
}

describe("CR187 a correction that arrives before the invocation can take it", () => {
  it("waits while the invocation is not ready and is delivered when it is", async () => {
    const time = clock();
    const answers = ["waiting", "waiting", "waiting", "accepted"] as const;
    let calls = 0;
    const outcome = await deliverSteeringWhenReady({
      steer: async () => ({ status: answers[calls++] }),
      runStillLive: () => true,
      sleep: time.sleep,
      now: time.now,
    });

    expect(outcome).toEqual({ kind: "admitted", status: "accepted" });
    expect(calls).toBe(4);
    expect(time.sleeps).toHaveLength(3);
  });

  it("stops waiting, without rejecting, when the run ends first", async () => {
    const time = clock();
    let live = true;
    let calls = 0;
    const outcome = await deliverSteeringWhenReady({
      steer: async () => { calls += 1; live = false; return { status: "waiting" }; },
      runStillLive: () => live,
      sleep: time.sleep,
      now: time.now,
    });

    expect(outcome).toEqual({ kind: "run_ended" });
    expect(calls).toBe(1);
  });

  it("rejects with a reason when the invocation never becomes ready", async () => {
    const time = clock();
    const outcome = await deliverSteeringWhenReady({
      steer: async () => ({ status: "waiting" }),
      runStillLive: () => true,
      sleep: time.sleep,
      now: time.now,
    });

    expect(outcome.kind).toBe("rejected");
    expect(outcome.kind === "rejected" && outcome.reason).toMatch(/not ready/);
    expect(time.now()).toBeGreaterThanOrEqual(STEERING_READINESS_DEADLINE_MS);
  });

  it("carries a native refusal as the rejection reason", async () => {
    const time = clock();
    const outcome = await deliverSteeringWhenReady({
      steer: async () => { throw new Error("Steering authority does not match the exact active turn."); },
      runStillLive: () => true,
      sleep: time.sleep,
      now: time.now,
    });

    expect(outcome).toEqual({ kind: "rejected", reason: "Steering authority does not match the exact active turn." });
  });
});

describe("CR187 settling a delivery on the freshest conversation", () => {
  it("keeps the rejection reason in the durable evidence", () => {
    const { conversation, authority } = fixture();
    const staged = appendPendingSteering(conversation, authority, "npm", new Date("2026-11-04T10:00:00Z"));
    const outcome: SteeringDeliveryOutcome = { kind: "rejected", reason: "The targeted Pi invocation is not running." };

    const next = settleSteeringDelivery(staged.conversation, authority, staged.evidence.requestId, outcome);

    expect(next?.steeringEvidence?.[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "The targeted Pi invocation is not running.",
    });
    const persisted = parsePersistedJourneyConversation(JSON.parse(JSON.stringify(createPersistedJourneyConversation(next!))));
    expect(persisted?.conversation.steeringEvidence?.[0].rejectionReason).toBe("The targeted Pi invocation is not running.");
  });

  it("moves an accepted correction and leaves a pending one as it is", () => {
    const { conversation, authority } = fixture();
    const staged = appendPendingSteering(conversation, authority, "npm");
    const id = staged.evidence.requestId;

    expect(settleSteeringDelivery(staged.conversation, authority, id, { kind: "admitted", status: "accepted" })
      ?.steeringEvidence?.[0].status).toBe("accepted");
    expect(settleSteeringDelivery(staged.conversation, authority, id, { kind: "admitted", status: "pending" })).toBeUndefined();
    expect(settleSteeringDelivery(staged.conversation, authority, id, { kind: "run_ended" })).toBeUndefined();
  });

  it("does not touch a correction the settlement already decided while it waited", () => {
    const { conversation, authority } = fixture();
    const staged = appendPendingSteering(conversation, authority, "npm");
    const settled = transitionSteering(staged.conversation, authority, staged.evidence.requestId, "terminally_unconsumed",
      new Date(), { terminalReason: "settled_without_application" });

    expect(settleSteeringDelivery(settled, authority, staged.evidence.requestId, { kind: "admitted", status: "accepted" })).toBeUndefined();
    expect(settleSteeringDelivery(settled, authority, staged.evidence.requestId, { kind: "rejected", reason: "late" })).toBeUndefined();
  });

  it("drops a rejection reason that is not text", () => {
    const { conversation, authority } = fixture();
    const staged = appendPendingSteering(conversation, authority, "npm");
    const broken = {
      ...staged.conversation,
      steeringEvidence: staged.conversation.steeringEvidence?.map((item) => ({ ...item, rejectionReason: 42 })),
    } as unknown as typeof staged.conversation;

    const restored = parsePersistedJourneyConversation(JSON.parse(JSON.stringify(createPersistedJourneyConversation(broken))));
    expect(restored?.conversation.id).toBe(broken.id);
    expect(restored?.conversation.steeringEvidence ?? []).toHaveLength(0);
  });
});

describe("CR187 wiring", () => {
  it("lets the native side answer that the invocation is not ready yet", () => {
    expect(processStreamSource).toMatch(/status: "pending" \| "accepted" \| "waiting"/);
    const steer = nativeSource.split("fn steer_pi_invocation(")[1].split("\n}\n")[0];
    expect(steer).toMatch(/steering_target_readiness\(/);
    expect(steer).toMatch(/!process\.prompt_sent/);
    expect(steer).toMatch(/"waiting"/);
  });

  it("marks the prompt as sent in the same locked write that sends it", () => {
    const turn = nativeSource.split("fn run_pi_process_unguarded(")[1];
    const write = turn.split("let write_result = initial_commands")[1].split("if let Err(error) = write_result")[0];
    expect(write).toMatch(/stdin\.flush\(\)[\s\S]*process\.prompt_sent = true/);
  });

  it("routes the Composer's correction through the waiting delivery", () => {
    const submit = appSource.split("async function submitActiveSteering()")[1].split("async function cancelActiveRun()")[0];
    expect(submit).toMatch(/deliverSteeringWhenReady\(/);
    expect(submit).toMatch(/settleSteeringDelivery\(/);
  });
});
