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
const neverInstall = () => new Promise<void>(() => undefined);

describe("SelfUpdateNotification", () => {
  it("renders a discreet update chip instead of a global banner", () => {
    const html = renderToStaticMarkup(
      <SelfUpdateNotification runtimeBusy={false} initialUpdate={update} checkUpdates={neverCheck} installUpdate={neverInstall} onReview={() => undefined} />,
    );
    expect(html).toContain("self-update-chip");
    expect(html).toContain("Atualização disponível");
    expect(html).not.toContain("self-update-banner");
  });
});
