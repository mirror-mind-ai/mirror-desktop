import { describe, expect, it } from "vitest";
import { formatContextTokens, projectContextReading } from "../domain/contextReading";

const window272k = 272_000;

describe("context reading", () => {
  it("states a measured reading without a marker", () => {
    const reading = projectContextReading({
      state: "available",
      tokens: 111_520,
      contextWindow: window272k,
    });
    expect(reading.text).toBe("41%/272K");
    expect(reading.confidence).toBe("measured");
  });

  // The Navigator's chosen vocabulary: an approximation is marked, never withheld.
  it("marks an approximation with a tilde instead of hiding it", () => {
    const reading = projectContextReading({
      state: "available",
      tokens: 111_520,
      contextWindow: window272k,
      approximate: true,
    });
    expect(reading.text).toBe("~41%/272K");
    expect(reading.confidence).toBe("approximate");
  });

  // The window is known from the model catalog even when nothing has measured the
  // Conversation yet, so the reading degrades to a glyph rather than to prose.
  it("keeps the window on screen when the token count is unknown", () => {
    for (const state of ["checking", "waiting", "updating", "unknown_after_compaction", "model_mismatch", "inspection_failed"] as const) {
      const reading = projectContextReading({ state, tokens: null, contextWindow: window272k });
      expect(reading.text).toBe("?/272K");
      expect(reading.confidence).toBe("unknown");
    }
  });

  it("uses a dash when there is no session to measure at all", () => {
    for (const state of ["not_initialized", "session_missing"] as const) {
      const reading = projectContextReading({ state, tokens: null, contextWindow: window272k });
      expect(reading.text).toBe("–/272K");
      expect(reading.confidence).toBe("absent");
    }
  });

  it("never renders a waiting sentence as the visible label", () => {
    const states = [
      "checking", "waiting", "available", "updating", "not_initialized",
      "unknown_after_compaction", "session_missing", "model_mismatch", "inspection_failed",
    ] as const;
    for (const state of states) {
      for (const tokens of [null, 111_520]) {
        const { text } = projectContextReading({ state, tokens, contextWindow: window272k });
        expect(text).not.toMatch(/waiting|checking|unavailable|initialized/i);
        expect(text).toContain("/");
      }
    }
  });

  // The sentences are not deleted, only moved off the one line the Navigator scans.
  it("keeps the diagnostic sentence available as detail", () => {
    expect(projectContextReading({ state: "model_mismatch", tokens: 10, contextWindow: window272k }).detail)
      .toContain("another model");
    expect(projectContextReading({ state: "unknown_after_compaction", tokens: null, contextWindow: window272k }).detail)
      .toContain("compaction");
    expect(projectContextReading({ state: "not_initialized", tokens: null, contextWindow: window272k }).detail)
      .toContain("not initialized");
  });

  it("carries the tone thresholds the footer colours", () => {
    expect(projectContextReading({ state: "available", tokens: 200_000, contextWindow: window272k }).tone).toBe("warning");
    expect(projectContextReading({ state: "available", tokens: 260_000, contextWindow: window272k }).tone).toBe("error");
    expect(projectContextReading({ state: "available", tokens: 10_000, contextWindow: window272k }).tone).toBeUndefined();
  });

  it("falls back to a token count when even the window is unknown", () => {
    expect(projectContextReading({ state: "available", tokens: 111_520, contextWindow: null }).text).toBe("112K/?");
    expect(projectContextReading({ state: "waiting", tokens: null, contextWindow: null }).text).toBe("?/?");
  });

  it("formats windows the way the terminal footer does", () => {
    expect(formatContextTokens(272_000)).toBe("272K");
    expect(formatContextTokens(1_000_000)).toBe("1.0M");
    expect(formatContextTokens(940)).toBe("940");
  });

  it("keeps small percentages legible instead of rounding them to zero", () => {
    expect(projectContextReading({ state: "available", tokens: 1_100, contextWindow: window272k }).text).toBe("0.4%/272K");
  });
});
