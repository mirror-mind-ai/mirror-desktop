import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelfUpdatePanel } from "../app/SelfUpdatePanel";
import type { SelfUpdateCheckResult } from "../app/selfUpdateStorage";

const neverCheck = () => new Promise<never>(() => undefined);
const neverInstall = () => new Promise<void>(() => undefined);
const reviewedUpdate: SelfUpdateCheckResult & { status: "available" } = {
  status: "available",
  version: "0.2.0-alpha.5",
  currentVersion: "0.2.0-alpha.4",
  update: {} as never,
  releaseReading: {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version: "0.2.0-alpha.5",
    title: "Release clarity",
    digest: "Explains this exact release.",
    highlights: ["Shows complete notes before consent."],
    body: "## Highlights\n\n- Shows complete notes before consent.\n\n## Next Horizon\n\nValidate relaunch.",
    bodySha256: "0".repeat(64),
    releaseNotesUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md",
  },
};

describe("SelfUpdatePanel", () => {
  it("renders the trusted update boundary and manual check action", () => {
    const html = renderToStaticMarkup(
      <SelfUpdatePanel runtimeBusy={false} checkUpdates={neverCheck} installUpdate={neverInstall} />,
    );
    expect(html).toContain("Mirror Desktop updates");
    expect(html).toContain("Check for updates");
    expect(html).toContain("signed trusted update channel");
    expect(html).toContain("memory.db");
    expect(html).toContain("Journey content");
  });

  it("renders the complete authoritative reading selected from the update chip", () => {
    const html = renderToStaticMarkup(
      <SelfUpdatePanel runtimeBusy={false} reviewedUpdate={reviewedUpdate} checkUpdates={neverCheck} installUpdate={neverInstall} />,
    );
    expect(html).toContain("Release clarity");
    expect(html).toContain("Shows complete notes before consent.");
    expect(html).toContain("Validate relaunch.");
    expect(html).toContain("https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md");
  });

  it("explains when an offered update has no authoritative reading", () => {
    const html = renderToStaticMarkup(
      <SelfUpdatePanel runtimeBusy={false} reviewedUpdate={{ ...reviewedUpdate, releaseReading: undefined }} checkUpdates={neverCheck} installUpdate={neverInstall} />,
    );
    expect(html).toContain("What&#x27;s New details are unavailable for this release.");
  });

  it("warns and blocks while runtime work is active", () => {
    const html = renderToStaticMarkup(
      <SelfUpdatePanel runtimeBusy checkUpdates={neverCheck} installUpdate={neverInstall} />,
    );
    expect(html).toContain("Finish the active runtime operation before updating.");
  });
});
