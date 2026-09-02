import { describe, expect, it } from "vitest";
import {
  parseJourneyAppearanceById,
  sanitizeJourneyAppearanceById,
  systemIconGlyph,
} from "../domain/journeyAppearance";
import type { JourneyRegistry } from "../domain/journeyRegistry";

const registry: JourneyRegistry = {
  schemaVersion: "0.2.0",
  source: "mirror",
  sourceVersion: "a".repeat(64),
  syncedAt: "now",
  roots: [{ id: "one", name: "One" }],
};

describe("Journey appearance overlay", () => {
  it("accepts only curated system icons and bounded custom-image markers", () => {
    expect(parseJourneyAppearanceById({ one: { kind: "system", icon: "book" }, two: { kind: "custom" } })).toEqual({
      one: { kind: "system", icon: "book" },
      two: { kind: "custom" },
    });
    expect(parseJourneyAppearanceById({ one: { kind: "system", icon: "arbitrary" } })).toBeUndefined();
    expect(parseJourneyAppearanceById({ "../escape": { kind: "custom" } })).toBeUndefined();
    expect(parseJourneyAppearanceById({ one: { kind: "custom", path: "/tmp/image.png" } })).toBeUndefined();
    expect(parseJourneyAppearanceById(Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`custom-${index}`, { kind: "custom" }])))).toBeUndefined();
  });

  it("drops overlays for Journeys no longer present in the canonical registry", () => {
    expect(sanitizeJourneyAppearanceById({ one: { kind: "system", icon: "book" }, missing: { kind: "custom" } }, registry)).toEqual({
      one: { kind: "system", icon: "book" },
    });
  });

  it("projects curated glyphs without arbitrary display content", () => {
    expect(systemIconGlyph("book")).toBe("▤");
  });
});
