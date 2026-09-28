import { describe, expect, it } from "vitest";
import { parsePiCompactionResult } from "../app/compactionStorage";

// CR080: the compact response is the chapter that just closed. The wrapper validates it
// the way every other native response is validated, so a malformed payload never reaches
// the surface as a half-formed chapter.
describe("Pi compaction result", () => {
  it("accepts the chapter Pi returned, with absent token estimates as null", () => {
    expect(parsePiCompactionResult({
      summary: "## Goal\nShip it",
      firstKeptEntryId: "abc123",
      tokensBefore: 150000,
      estimatedTokensAfter: null,
    })).toEqual({
      summary: "## Goal\nShip it",
      firstKeptEntryId: "abc123",
      tokensBefore: 150000,
      estimatedTokensAfter: null,
    });
  });

  it("refuses a payload without a summary or without the retained-tail authority", () => {
    expect(() => parsePiCompactionResult({ summary: "   ", firstKeptEntryId: "abc" })).toThrow(/summary/);
    expect(() => parsePiCompactionResult({ summary: "## Goal", firstKeptEntryId: "" })).toThrow(/retained/);
    expect(() => parsePiCompactionResult({ summary: "## Goal" })).toThrow(/retained/);
  });

  it("refuses anything that is not an object, and non-numeric token estimates", () => {
    expect(() => parsePiCompactionResult(null)).toThrow();
    expect(() => parsePiCompactionResult("text")).toThrow();
    expect(() => parsePiCompactionResult({ summary: "## Goal", firstKeptEntryId: "a", tokensBefore: "many" })).toThrow(/token/);
  });
});
