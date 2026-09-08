import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelfUpdateNotification } from "../app/SelfUpdateNotification";
import type { SelfUpdateCheckResult } from "../app/selfUpdateStorage";

const update: SelfUpdateCheckResult & { status: "available" } = {
  status: "available",
  version: "0.1.1",
  currentVersion: "0.1.0",
  update: {} as never,
};

const neverCheck = () => new Promise<SelfUpdateCheckResult>(() => undefined);
const neverVersion = () => new Promise<string>(() => undefined);
const neverInstall = () => new Promise<void>(() => undefined);

describe("SelfUpdateNotification", () => {
  it("renders the current app version when up to date", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification runtimeBusy={false} initialCurrentVersion="0.1.1" checkUpdates={neverCheck} getCurrentVersion={neverVersion} installUpdate={neverInstall} onReview={() => undefined} />,
    );
    expect(html).toContain("Mirror Desktop 0.1.1");
    expect(html).not.toContain("Update available");
  });

  it("composes the current version with the update badge", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification runtimeBusy={false} initialUpdate={update} checkUpdates={neverCheck} getCurrentVersion={neverVersion} installUpdate={neverInstall} onReview={() => undefined} />,
    );
    expect(html).toContain("self-update-chip");
    expect(html).toContain("Mirror Desktop 0.1.0");
    expect(html).toContain("Update available");
    expect(html).not.toContain("Atualização disponível");
    expect(html).not.toContain("self-update-banner");
  });
});
