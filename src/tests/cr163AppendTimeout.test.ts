import { describe, expect, it } from "vitest";
import nativeSource from "../../src-tauri/src/main.rs?raw";
import {
  classifyMirrorAppendRejection,
  describeMirrorAppendRejection,
  hasTerminalMirrorAppendRejection,
} from "../domain/mirrorAppendRejection";

// CR163: a hung Mirror append is now cut at 30 s and returns `mirror_append_timed_out`. The
// delivery is safe to repeat — Mirror appends in one transaction and classifies a repeated
// message as `existing` — so the reason must stay transient, and it must read as itself rather
// than as a generic failure.

const TIMED_OUT = "mirror_append_timed_out";

describe("CR163 mirror_append_timed_out", () => {
  it("is transient, so recovery delivers the turn again", () => {
    expect(classifyMirrorAppendRejection(TIMED_OUT)).toBe("transient");
    expect(hasTerminalMirrorAppendRejection(TIMED_OUT)).toBe(false);
  });

  it("stays transient inside a convergence envelope", () => {
    const envelope = `synchronization_convergence_partial:turn-agent-run-2026-10-22T13:34:35.721Z:${TIMED_OUT}`;
    expect(hasTerminalMirrorAppendRejection(envelope)).toBe(false);
  });

  it("says what happened, that nothing was lost, and that it will be tried again", () => {
    const sentence = describeMirrorAppendRejection(TIMED_OUT);
    expect(sentence).toBeDefined();
    expect(sentence).toMatch(/did not answer within 30 seconds/);
    expect(sentence).toMatch(/kept on this machine/);
    expect(sentence).toMatch(/tried again/);
  });

  it("is described inside an envelope too, because that is how a Repair surface receives it", () => {
    const envelope = `synchronization_convergence_partial:turn-one:${TIMED_OUT}`;
    const sentence = describeMirrorAppendRejection(envelope);
    expect(sentence).toBeDefined();
    expect(sentence).toBe(describeMirrorAppendRejection(TIMED_OUT));
  });

  it("does not describe a longer reason that merely begins with it", () => {
    expect(describeMirrorAppendRejection(`${TIMED_OUT}_probe`)).toBeUndefined();
  });
});

describe("CR163 the sentence and the native bound name the same number", () => {
  it("keeps '30 seconds' tied to MIRROR_APPEND_TIMEOUT", () => {
    const declarations = nativeSource.match(/^const MIRROR_APPEND_TIMEOUT: Duration = Duration::from_secs\((\d+)\);$/gm) ?? [];
    expect(declarations).toHaveLength(1);
    const seconds = /from_secs\((\d+)\)/.exec(declarations[0] ?? "")?.[1];
    expect(seconds).toBe("30");
    expect(describeMirrorAppendRejection(TIMED_OUT)).toContain(`within ${seconds} seconds`);
  });
});
