import { describe, expect, it } from "vitest";
import {
  boundReasoningBlocks,
  REASONING_BLOCK_MAX_CHARS,
  REASONING_TURN_MAX_CHARS,
} from "../domain/reasoningBounds";

describe("reasoning bounds", () => {
  it("passes ordinary blocks through untouched", () => {
    expect(boundReasoningBlocks(["short thought", "another one"])).toEqual([
      { content: "short thought" },
      { content: "another one" },
    ]);
  });

  it("truncates a block at the 8 KB limit and marks it", () => {
    const [block] = boundReasoningBlocks(["a".repeat(REASONING_BLOCK_MAX_CHARS + 1)]);
    expect(block.content.length).toBe(REASONING_BLOCK_MAX_CHARS);
    expect(block.truncated).toBe(true);
  });

  it("does not mark a block that fits exactly", () => {
    const [block] = boundReasoningBlocks(["a".repeat(REASONING_BLOCK_MAX_CHARS)]);
    expect(block.content.length).toBe(REASONING_BLOCK_MAX_CHARS);
    expect(block.truncated).toBeUndefined();
  });

  it("elides blocks after the turn ceiling and caps the crossing block", () => {
    const fullBlocks = REASONING_TURN_MAX_CHARS / REASONING_BLOCK_MAX_CHARS - 1;
    const texts = [
      ...Array.from({ length: fullBlocks }, () => "a".repeat(REASONING_BLOCK_MAX_CHARS)),
      "b".repeat(5000),
      "c".repeat(REASONING_BLOCK_MAX_CHARS),
      "d".repeat(10),
    ];
    const bounded = boundReasoningBlocks(texts);
    const crossing = bounded[fullBlocks + 1];
    expect(crossing.content.length).toBe(REASONING_BLOCK_MAX_CHARS - 5000);
    expect(crossing.truncated).toBe(true);
    expect(bounded.at(-1)).toEqual({ content: "", elided: true });
    const total = bounded.reduce((sum, block) => sum + block.content.length, 0);
    expect(total).toBe(REASONING_TURN_MAX_CHARS);
  });
});
