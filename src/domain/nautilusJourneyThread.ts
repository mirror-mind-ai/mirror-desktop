import { verifyJourneyActivationReceipt, type JourneyActivationReceipt } from "./journeyThreadProvisioning";

export type NautilusThreadGenerationStatus = "provisioning" | "activating" | "ready" | "inactive" | "failed";

export type NautilusThreadGeneration = {
  generation: number;
  status: NautilusThreadGenerationStatus;
  piSessionId: string;
  piSessionFile?: string;
  mirrorConversationId: string;
  piSessionName?: string;
  mirrorConversationName?: string;
  activationReceipt?: JourneyActivationReceipt;
  createdAt: string;
  activatedAt?: string;
  closedAt?: string;
};

export type NautilusJourneyThread = {
  schemaVersion: "1.0.0";
  threadId: string;
  journeyId: string;
  createdAt: string;
  activeGeneration: number;
  generations: NautilusThreadGeneration[];
};

export type NautilusThreadReasonCode =
  | "invalid_record"
  | "journey_mismatch"
  | "generation_sequence_invalid"
  | "active_generation_missing"
  | "active_generation_not_ready"
  | "multiple_ready_generations"
  | "activation_receipt_invalid"
  | "native_id_reused"
  | "history_rewritten"
  | "generation_not_appended"
  | "active_generation_regressed";

export type NautilusJourneyThreadReadiness =
  | { kind: "absent" }
  | { kind: "ready"; thread: NautilusJourneyThread; activeGeneration: NautilusThreadGeneration }
  | { kind: "inconsistent"; reasonCodes: NautilusThreadReasonCode[] };

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const isId = (value: unknown): value is string => typeof value === "string" && ID_PATTERN.test(value);
const isTimestamp = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

export function parseNautilusJourneyThread(value: unknown): NautilusJourneyThread | undefined {
  if (!value || typeof value !== "object") return undefined;
  const thread = value as Record<string, unknown>;
  if (
    thread.schemaVersion !== "1.0.0"
    || !isId(thread.threadId)
    || !isId(thread.journeyId)
    || !isTimestamp(thread.createdAt)
    || !Number.isInteger(thread.activeGeneration)
    || Number(thread.activeGeneration) < 1
    || !Array.isArray(thread.generations)
    || thread.generations.length === 0
  ) return undefined;
  const generations: NautilusThreadGeneration[] = [];
  for (const value of thread.generations) {
    if (!value || typeof value !== "object") return undefined;
    const generation = value as Record<string, unknown>;
    if (
      !Number.isInteger(generation.generation)
      || Number(generation.generation) < 1
      || !["provisioning", "activating", "ready", "inactive", "failed"].includes(String(generation.status))
      || !isId(generation.piSessionId)
      || !isId(generation.mirrorConversationId)
      || !isTimestamp(generation.createdAt)
      || (generation.activatedAt !== undefined && !isTimestamp(generation.activatedAt))
      || (generation.closedAt !== undefined && !isTimestamp(generation.closedAt))
    ) return undefined;
    generations.push(generation as unknown as NautilusThreadGeneration);
  }
  return { ...(thread as unknown as NautilusJourneyThread), generations };
}

export function classifyNautilusJourneyThread(
  value: unknown,
  journeyId: string,
): NautilusJourneyThreadReadiness {
  if (value === undefined || value === null) return { kind: "absent" };
  const thread = parseNautilusJourneyThread(value);
  if (!thread) return { kind: "inconsistent", reasonCodes: ["invalid_record"] };
  const reasons: NautilusThreadReasonCode[] = [];
  if (thread.journeyId !== journeyId) reasons.push("journey_mismatch");
  const ordered = [...thread.generations].sort((a, b) => a.generation - b.generation);
  if (ordered.some((generation, index) => generation.generation !== index + 1)) reasons.push("generation_sequence_invalid");
  const active = thread.generations.find((generation) => generation.generation === thread.activeGeneration);
  if (!active) reasons.push("active_generation_missing");
  else if (active.status !== "ready") reasons.push("active_generation_not_ready");
  else if (!verifyJourneyActivationReceipt(active.activationReceipt, {
    journeyId: thread.journeyId,
    threadId: thread.threadId,
    generation: active.generation,
    piSessionId: active.piSessionId,
    mirrorConversationId: active.mirrorConversationId,
  })) reasons.push("activation_receipt_invalid");
  if (thread.generations.filter((generation) => generation.status === "ready").length > 1) reasons.push("multiple_ready_generations");
  const piIds = new Set<string>();
  const mirrorIds = new Set<string>();
  for (const generation of thread.generations) {
    if (piIds.has(generation.piSessionId) || mirrorIds.has(generation.mirrorConversationId)) {
      reasons.push("native_id_reused");
      break;
    }
    piIds.add(generation.piSessionId);
    mirrorIds.add(generation.mirrorConversationId);
  }
  if (reasons.length || !active) return { kind: "inconsistent", reasonCodes: [...new Set(reasons)] };
  return { kind: "ready", thread, activeGeneration: active };
}

export function validateNautilusThreadTransition(
  previous: NautilusJourneyThread,
  next: NautilusJourneyThread,
): { valid: boolean; reasonCodes: NautilusThreadReasonCode[] } {
  const reasons: NautilusThreadReasonCode[] = [];
  if (previous.threadId !== next.threadId || previous.journeyId !== next.journeyId) reasons.push("history_rewritten");
  if (next.generations.length < previous.generations.length) reasons.push("history_rewritten");
  for (let index = 0; index < previous.generations.length; index += 1) {
    const before = previous.generations[index];
    const after = next.generations[index];
    if (!after) continue;
    const allowedClosure = before.generation === previous.activeGeneration
      && next.activeGeneration > previous.activeGeneration
      && after.status === "inactive"
      && before.piSessionId === after.piSessionId
      && before.mirrorConversationId === after.mirrorConversationId
      && before.createdAt === after.createdAt;
    if (JSON.stringify(before) !== JSON.stringify(after) && !allowedClosure) reasons.push("history_rewritten");
  }
  if (next.generations.length > previous.generations.length) {
    const appended = next.generations.slice(previous.generations.length);
    if (appended.some((generation, offset) => generation.generation !== previous.generations.length + offset + 1)) reasons.push("generation_not_appended");
  }
  if (next.activeGeneration < previous.activeGeneration) reasons.push("active_generation_regressed");
  return { valid: reasons.length === 0, reasonCodes: [...new Set(reasons)] };
}

export function validateNautilusThreadRegistry(records: NautilusJourneyThread[]): { valid: boolean; reasonCodes: NautilusThreadReasonCode[] } {
  const piIds = new Set<string>();
  const mirrorIds = new Set<string>();
  for (const thread of records) {
    for (const generation of thread.generations) {
      if (piIds.has(generation.piSessionId) || mirrorIds.has(generation.mirrorConversationId)) {
        return { valid: false, reasonCodes: ["native_id_reused"] };
      }
      piIds.add(generation.piSessionId);
      mirrorIds.add(generation.mirrorConversationId);
    }
  }
  return { valid: true, reasonCodes: [] };
}
