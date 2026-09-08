import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelfUpdatePanel } from "../app/SelfUpdatePanel";

const neverCheck = () => new Promise<never>(() => undefined);
const neverInstall = () => new Promise<void>(() => undefined);

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

  it("warns and blocks while runtime work is active", () => {
    const html = renderToStaticMarkup(
      <SelfUpdatePanel runtimeBusy checkUpdates={neverCheck} installUpdate={neverInstall} />,
    );
    expect(html).toContain("Finish the active runtime operation before updating.");
  });
});
