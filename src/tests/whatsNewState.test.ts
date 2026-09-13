import { describe, expect, it } from "vitest";
import { acknowledgeWhatsNew, emptyWhatsNewState, resolveWhatsNewState, stagePendingRelease } from "../domain/whatsNewState";
import type { ReleaseReading } from "../domain/releaseReading";

const reading: ReleaseReading = {
  schemaVersion: "1.0.0",
  product: "Mirror Desktop",
  version: "0.2.0-alpha.5",
  title: "Release clarity",
  digest: "Explains the exact release.",
  highlights: ["Shows What's New after relaunch."],
  body: "## Highlights\n",
  bodySha256: "0".repeat(64),
  releaseNotesUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md",
};

describe("What's New state", () => {
  it("activates a pending reading only for the exact running version", () => {
    const pending = stagePendingRelease(emptyWhatsNewState(), reading);
    const installed = resolveWhatsNewState(pending, reading.version);
    expect(installed.pending).toBeUndefined();
    expect(installed.installed?.version).toBe(reading.version);
    expect(installed.reminder).toBe(true);
  });

  it("drops a mismatched pending intent without claiming installation", () => {
    const pending = stagePendingRelease(emptyWhatsNewState(), reading);
    const resolved = resolveWhatsNewState(pending, "0.2.0-alpha.4");
    expect(resolved.pending).toBeUndefined();
    expect(resolved.installed).toBeUndefined();
    expect(resolved.reminder).toBe(false);
  });

  it("acknowledges only the exact installed version while retaining its reading", () => {
    const installed = resolveWhatsNewState(stagePendingRelease(emptyWhatsNewState(), reading), reading.version);
    const acknowledged = acknowledgeWhatsNew(installed, reading.version);
    expect(acknowledged.acknowledgedVersion).toBe(reading.version);
    expect(resolveWhatsNewState(acknowledged, reading.version).reminder).toBe(false);
    expect(resolveWhatsNewState(acknowledged, reading.version).installed).toEqual(reading);
    expect(acknowledgeWhatsNew(installed, "0.2.0-alpha.4")).toEqual(installed);
  });
});
