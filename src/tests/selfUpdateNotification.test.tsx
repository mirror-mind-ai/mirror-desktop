import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelfUpdateNotification, displayMirrorDesktopVersion } from "../app/SelfUpdateNotification";
import type { SelfUpdateCheckResult } from "../app/selfUpdateStorage";

const update: SelfUpdateCheckResult & { status: "available" } = {
  status: "available",
  version: "0.1.1",
  currentVersion: "0.1.0",
  update: {} as never,
  releaseReading: {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version: "0.1.1",
    title: "A clearer update",
    digest: "Explains the release before installation.",
    highlights: ["Shows exact release highlights.", "Keeps full notes in Settings."],
    body: "# v0.1.1 - A clearer update",
    bodySha256: "0".repeat(64),
    releaseNotesUrl: "https://updates.mirrormind.sh/mirror-desktop/releases/v0.1.1.md",
  },
};

const neverCheck = () => new Promise<SelfUpdateCheckResult>(() => undefined);
const neverVersion = () => new Promise<string>(() => undefined);
const neverInstall = () => new Promise<void>(() => undefined);

describe("SelfUpdateNotification", () => {
  it("shortens prerelease versions for persistent UI labels", () => {
    expect(displayMirrorDesktopVersion("0.2.0-alpha.1")).toBe("0.2.0-a1");
    expect(displayMirrorDesktopVersion("0.1.1-test.1")).toBe("0.1.1-t1");
    expect(displayMirrorDesktopVersion("0.2.0")).toBe("0.2.0");
  });

  it("renders the current app version when up to date", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification runtimeBusy={false} initialCurrentVersion="0.1.1" initialOpen={true} checkUpdates={neverCheck} getCurrentVersion={neverVersion} installUpdate={neverInstall} onReview={() => undefined} />,
    );
    expect(html).toContain("0.1.1");
    expect(html).toContain("Mirror Desktop 0.1.1 is up to date");
    expect(html).toContain("Version: 0.1.1");
    expect(html).not.toContain("• update");
  });

  it("offers a non-blocking What's New reminder after exact-version relaunch", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification
        runtimeBusy={false}
        initialCurrentVersion="0.1.1"
        installedReleaseReading={update.releaseReading}
        installedReminder
        initialOpen
        checkUpdates={neverCheck}
        getCurrentVersion={neverVersion}
        installUpdate={neverInstall}
        onReview={() => undefined}
        onAcknowledge={() => undefined}
      />,
    );
    expect(html).toContain("what&#x27;s new");
    expect(html).toContain("What&#x27;s New in Mirror Desktop 0.1.1");
    expect(html).toContain("Later");
    expect(html).toContain("Details");
    expect(html).toContain("Got it");
    expect(html).not.toContain("Update</button>");
  });

  it("composes the current version with the update badge", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification runtimeBusy={false} initialUpdate={update} initialOpen={true} checkUpdates={neverCheck} getCurrentVersion={neverVersion} installUpdate={neverInstall} onReview={() => undefined} />,
    );
    expect(html).toContain("self-update-chip");
    expect(html).toContain("0.1.0");
    expect(html).toContain("self-update-chip-status");
    expect(html).toContain(">update</span>");
    expect(html).toContain("Version: 0.1.0");
    expect(html).toContain("Available: 0.1.1.");
    expect(html).toContain("A clearer update");
    expect(html).toContain("Shows exact release highlights.");
    expect(html).not.toContain("Atualização disponível");
    expect(html).not.toContain("self-update-banner");
  });
});
