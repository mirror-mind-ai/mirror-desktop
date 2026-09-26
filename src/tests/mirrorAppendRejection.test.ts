import { describe, expect, it } from "vitest";
import {
  classifyMirrorAppendRejection,
  describeMirrorAppendRejection,
  hasTerminalMirrorAppendRejection,
} from "../domain/mirrorAppendRejection";

// CR093: a Mirror append rejection is either a bounded contract rejection, which repetition
// can never resolve, or a transient failure worth retrying. The 2026-09-26 incident retried
// `journey_mismatch` indefinitely because the Desktop drew no such line.

describe("classifyMirrorAppendRejection", () => {
  it("treats contract rejections that repetition cannot change as terminal", () => {
    for (const reason of [
      "mirror_append_journey_mismatch",
      "mirror_append_conversation_not_found",
      "mirror_append_idempotency_conflict",
      "mirror_append_malformed_request",
      "mirror_append_unsupported_schema_version",
      "mirror_append_limit_exceeded",
      "mirror_append_duplicate_request_message_id",
    ]) {
      expect(classifyMirrorAppendRejection(reason)).toBe("terminal_contract");
    }
  });

  it("treats the Desktop's own binding-defence verdicts as terminal", () => {
    expect(classifyMirrorAppendRejection("mirror_append_journey_binding_not_owned"))
      .toBe("terminal_contract");
    expect(classifyMirrorAppendRejection("mirror_append_journey_binding_unrepaired"))
      .toBe("terminal_contract");
  });

  it("keeps a failed repair attempt transient, because the repair route itself can fail", () => {
    expect(classifyMirrorAppendRejection("mirror_append_journey_binding_repair_failed"))
      .toBe("transient");
  });

  it("keeps operational and process failures transient", () => {
    for (const reason of [
      "mirror_append_process_failed",
      "mirror_append_outbox_unavailable",
      "mirror_append_outbox_full",
      "mirror_append_item_missing",
      "mirror_append_pi_recovery_active_lease",
      "settlement_pre_frontier_authority_stale",
    ]) {
      expect(classifyMirrorAppendRejection(reason)).toBe("transient");
    }
  });

  it("does not confuse a longer reason that merely starts with a terminal prefix", () => {
    expect(classifyMirrorAppendRejection("mirror_append_limit_exceeded_probe")).toBe("transient");
  });
});

describe("hasTerminalMirrorAppendRejection", () => {
  it("recognises a terminal rejection inside a convergence failure envelope", () => {
    const envelope = "synchronization_convergence_partial:"
      + "turn-agent-run-2026-09-26T12:58:07.106Z:mirror_append_journey_mismatch";
    expect(hasTerminalMirrorAppendRejection(envelope)).toBe(true);
  });

  it("recognises a terminal rejection among several failed items", () => {
    const envelope = "synchronization_convergence_partial:"
      + "turn-one:mirror_append_process_failed,"
      + "turn-two:mirror_append_journey_binding_not_owned";
    expect(hasTerminalMirrorAppendRejection(envelope)).toBe(true);
  });

  it("stays false for an envelope of purely transient failures", () => {
    const envelope = "synchronization_convergence_partial:turn-one:mirror_append_process_failed";
    expect(hasTerminalMirrorAppendRejection(envelope)).toBe(false);
  });

  it("stays false for an empty or unrelated reason", () => {
    expect(hasTerminalMirrorAppendRejection("")).toBe(false);
    expect(hasTerminalMirrorAppendRejection("journey_thread_unavailable")).toBe(false);
  });
});

describe("describeMirrorAppendRejection", () => {
  it("names the Journey divergence instead of restating the code", () => {
    const explanation = describeMirrorAppendRejection(
      "synchronization_convergence_partial:turn-one:mirror_append_journey_mismatch",
    );
    expect(explanation).toContain("Journey");
    expect(explanation).not.toContain("mirror_append");
  });

  it("explains a refused rebind as an ownership boundary", () => {
    expect(describeMirrorAppendRejection("mirror_append_journey_binding_not_owned"))
      .toContain("did not create");
  });

  it("returns nothing for reasons it cannot explain", () => {
    expect(describeMirrorAppendRejection("mirror_append_process_failed")).toBeUndefined();
    expect(describeMirrorAppendRejection("")).toBeUndefined();
  });
});
