import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import {
  describePostTerminalRecoveryOutcome,
  postTerminalRecoveryRefusal,
  type PostTerminalRecoveryRefusal,
} from "../app/postTerminalRecoveryGate";

/**
 * CR166: on 2026-11-01 the stranded-turn notice offered *Recover this turn*, the Navigator pressed
 * it, and nothing happened: no journal transition, no recovery skip, no word on the screen. The
 * notice is shown while the turn is believed streaming **or** finishing, and the action it runs
 * returned without a trace on four guards. Which one fired is not known, because none of them said.
 * An exit that is offered either acts or says why it cannot.
 */

const clear = { inFlight: false, occupancyKnown: true, nativeExecutionActive: false, rendererStreaming: false };

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("CR166: the post-terminal recovery names the guard that holds it", () => {
  it("lets recovery run when no guard holds", () => {
    expect(postTerminalRecoveryRefusal(clear)).toBeUndefined();
  });

  it.each([
    [{ inFlight: true }, "recovery_in_flight"],
    [{ occupancyKnown: false }, "occupancy_unknown"],
    [{ nativeExecutionActive: true }, "native_execution_active"],
    [{ rendererStreaming: true }, "renderer_streaming"],
  ] as const)("refuses by name: %o", (override, reason) => {
    expect(postTerminalRecoveryRefusal({ ...clear, ...override })).toBe(reason);
  });

  it("keeps the order the guards always had, so a refusal never changes which state is protected", () => {
    expect(postTerminalRecoveryRefusal({
      inFlight: true, occupancyKnown: false, nativeExecutionActive: true, rendererStreaming: true,
    })).toBe("recovery_in_flight");
    expect(postTerminalRecoveryRefusal({ ...clear, occupancyKnown: false, nativeExecutionActive: true }))
      .toBe("occupancy_unknown");
    expect(postTerminalRecoveryRefusal({ ...clear, nativeExecutionActive: true, rendererStreaming: true }))
      .toBe("native_execution_active");
  });

  it("gives every refusal its own sentence", () => {
    const reasons: PostTerminalRecoveryRefusal[] = [
      "recovery_in_flight", "occupancy_unknown", "native_execution_active", "renderer_streaming",
    ];
    const sentences = reasons.map((reason) => describePostTerminalRecoveryOutcome({ kind: "refused", reason }, true));
    expect(new Set(sentences).size).toBe(reasons.length);
    for (const sentence of sentences) expect(sentence).toMatch(/^Recovery did not run/);
  });

  it("says so when recovery ran and the turn's record is still open", () => {
    expect(describePostTerminalRecoveryOutcome({ kind: "converged" }, true))
      .toMatch(/^Recovery ran.*still open/);
    expect(describePostTerminalRecoveryOutcome({ kind: "converged" }, false)).toBeUndefined();
  });

  it("says why when recovery failed", () => {
    expect(describePostTerminalRecoveryOutcome({ kind: "failed", message: "mirror_append_hung" }, true))
      .toContain("mirror_append_hung");
  });
});

describe("CR166: the App wires the outcome to the exit", () => {
  const stripped = withoutComments(appSource);
  const body = stripped.slice(
    stripped.indexOf("async function recoverPostTerminalPersistence("),
    stripped.indexOf("function publishSteeringConversation("),
  );

  it("asks the gate instead of returning silently", () => {
    expect(body).toContain("postTerminalRecoveryRefusal(");
    expect(body).toContain("Promise<PostTerminalRecoveryOutcome>");
    expect(body).not.toMatch(/\breturn;/);
  });

  it("shows the outcome under Recover this turn", () => {
    const notice = stripped.slice(
      stripped.indexOf("{strandedTurnNotice ? ("),
      stripped.indexOf("{showBlockingTurnRecoveryNotice ? ("),
    );
    expect(notice).toContain("Recover this turn");
    expect(notice).toContain("setStrandedRecoveryOutcome(");
    expect(notice).toContain("strandedRecoveryMessage");
  });
});
