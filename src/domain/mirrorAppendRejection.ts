// CR093: Mirror's explicit append contract rejects a request for bounded, named reasons.
// Some of those reasons are facts about the request or the durable record, so repeating the
// same delivery can never change the outcome. The 2026-09-26 incident retried
// `journey_mismatch` indefinitely and reported only a generic partial convergence, which hid
// a cross-Journey contamination for 44 minutes.
//
// This module is the single place that decides whether a rejection is worth repeating, and
// the single place that turns a reason code into a sentence a Navigator can act on.

export type MirrorAppendRejectionClass = "terminal_contract" | "transient";

// Bounded contract rejections from Mirror (`memory/services/conversation_append.py`) plus the
// Desktop's own binding-defence verdicts. A failed repair attempt is deliberately absent: the
// repair route itself can fail transiently and deserves another attempt.
const TERMINAL_CONTRACT_REASONS = [
  "mirror_append_journey_mismatch",
  "mirror_append_conversation_not_found",
  "mirror_append_idempotency_conflict",
  "mirror_append_malformed_request",
  "mirror_append_unsupported_schema_version",
  "mirror_append_limit_exceeded",
  "mirror_append_duplicate_request_message_id",
  "mirror_append_journey_binding_not_owned",
  "mirror_append_journey_binding_unrepaired",
] as const;

const EXPLANATIONS: ReadonlyArray<readonly [string, string]> = [
  [
    "mirror_append_journey_mismatch",
    "Mirror holds this Conversation under a different Journey than the one Mirror Desktop"
    + " asserts, so the append contract refuses it. Restoring the binding could not be"
    + " completed automatically.",
  ],
  [
    "mirror_append_journey_binding_not_owned",
    "The Journey binding diverged, but Mirror Desktop did not create this Conversation and"
    + " will not move it.",
  ],
  [
    "mirror_append_journey_binding_unrepaired",
    "Mirror reported a Journey mismatch while already holding the Journey Mirror Desktop"
    + " asserts, so there was nothing to restore.",
  ],
  [
    "mirror_append_conversation_not_found",
    "Mirror no longer holds this Conversation. Mirror Desktop will not recreate it silently.",
  ],
  [
    "mirror_append_idempotency_conflict",
    "Mirror already holds a message with this identity and different content, so appending it"
    + " again would rewrite history.",
  ],
];

function reasonBoundaryMatch(reason: string, code: string): boolean {
  let from = 0;
  for (;;) {
    const at = reason.indexOf(code, from);
    if (at < 0) return false;
    const next = reason.charAt(at + code.length);
    // A bare reason, or one delimited inside a convergence envelope, must not be confused
    // with a longer code that merely begins with the same characters.
    if (next === "" || !/[A-Za-z0-9_]/.test(next)) return true;
    from = at + 1;
  }
}

export function classifyMirrorAppendRejection(reason: string): MirrorAppendRejectionClass {
  return TERMINAL_CONTRACT_REASONS.some((code) => reasonBoundaryMatch(reason, code))
    ? "terminal_contract"
    : "transient";
}

export function hasTerminalMirrorAppendRejection(reason: string): boolean {
  if (!reason) return false;
  return classifyMirrorAppendRejection(reason) === "terminal_contract";
}

export function describeMirrorAppendRejection(reason: string): string | undefined {
  if (!reason) return undefined;
  return EXPLANATIONS.find(([code]) => reasonBoundaryMatch(reason, code))?.[1];
}
