import { describe, expect, it } from "vitest";
import {
  deriveLatestCertifiedModeTransition,
  extractCertifiedModeTransition,
  mirrorModeDisplay,
} from "../app/mirrorModeState";

const message = (id: string, content: string, createdAt: string) => ({
  id,
  role: "assistant" as const,
  content,
  createdAt,
});

describe("certified Mirror mode state", () => {
  it("accepts canonical activation and deactivation surfaces", () => {
    expect(extractCertifiedModeTransition("│ ■ BUILDER MODE ACTIVE │")).toEqual({
      kind: "activate",
      mode: "builder",
    });
    expect(extractCertifiedModeTransition("│ △ EXPLORER MODE DEACTIVATED │")).toEqual({
      kind: "deactivate",
      mode: "explorer",
    });
  });

  it("does not infer a mode from ordinary prose or a skill name", () => {
    expect(extractCertifiedModeTransition("Builder mode is active when a story is implemented.")).toBeUndefined();
    expect(extractCertifiedModeTransition("Skill · mm-build")).toBeUndefined();
  });

  it("derives the latest certified transition across persisted conversation evidence", () => {
    expect(deriveLatestCertifiedModeTransition([
      message("one", "│ ◌ MIRROR MODE ACTIVE │", "2026-08-24T10:00:00.000Z"),
      message("two", "│ ☾ SOUL MODE ACTIVE │", "2026-08-24T10:01:00.000Z"),
    ])).toEqual({ kind: "activate", mode: "soul" });
  });

  it("uses canonical icon plus Mode display labels", () => {
    expect(mirrorModeDisplay("mirror")).toEqual({ icon: "◌", label: "Mirror Mode" });
    expect(mirrorModeDisplay("builder")).toEqual({ icon: "■", label: "Builder Mode" });
    expect(mirrorModeDisplay("explorer")).toEqual({ icon: "△", label: "Explorer Mode" });
    expect(mirrorModeDisplay("soul")).toEqual({ icon: "☾", label: "Soul Mode" });
  });
});
