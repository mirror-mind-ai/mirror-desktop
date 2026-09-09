import { describe, expect, it } from "vitest";
import {
  indexEntry,
  parseReleaseVersion,
  releaseNotePath,
  releaseNotesUrl,
  renderReleaseNote,
  upsertIndexEntry,
  validateReleaseNoteSource,
} from "../../scripts/release_notes.mjs";

const validNote = renderReleaseNote({
  version: "v0.2.0",
  title: "Trusted Release Notes",
  date: "2026-09-08",
  digest: "v0.2.0 adds release notes for Mirror Desktop.",
  highlights: ["Adds versioned notes."],
  whereWeStarted: "Mirror Desktop needed release notes.",
  whatChanged: "A release note was generated.",
  consciousExclusions: ["No publication authority."],
  whatWeLearned: "Release notes are part of the update boundary.",
  nextHorizon: "Connect notes to release manifests.",
});

describe("Mirror Desktop release notes", () => {
  it("requires v-prefixed semantic versions", () => {
    expect(parseReleaseVersion("v0.2.0")).toBe("v0.2.0");
    expect(() => parseReleaseVersion("0.2.0")).toThrow(/vX.Y.Z/);
  });

  it("derives versioned local paths and HTTPS update URLs", () => {
    expect(releaseNotePath("v0.2.0")).toBe("docs/releases/v0.2.0.md");
    expect(releaseNotesUrl("v0.2.0")).toBe("https://updates.mirrormind.sh/mirror-desktop/releases/v0.2.0.md");
    expect(() => releaseNotesUrl("v0.2.0", "http://example.invalid/releases")).toThrow(/https/);
  });

  it("validates the Mirror Core style release-note structure", () => {
    expect(validateReleaseNoteSource(validNote)).toEqual({ status: "ready", findings: [] });
    expect(validateReleaseNoteSource("# v0.2.0").status).toBe("blocked");
  });

  it("renders and upserts release index entries", () => {
    const entry = indexEntry({ version: "v0.2.0", title: "Trusted Release Notes", digest: "adds release notes" });
    const index = "# Releases\n\n## Releases\n\n- [v0.1.0 — Alpha](v0.1.0.md) — first note\n";
    const updated = upsertIndexEntry(index, entry);
    expect(updated).toContain(entry);
    expect(updated.indexOf("v0.2.0")).toBeLessThan(updated.indexOf("v0.1.0"));
  });
});
