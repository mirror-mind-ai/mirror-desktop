import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MirrorHomeSetup } from "../app/MirrorHomeSetup";
import appSource from "../app/App.tsx?raw";

// CV-010.DS-005 phase 2, slice 2d-1: the 0.3 setup screen asks for a Mirror home made for Mirror
// Desktop TS. It never offers to find or connect a Python Mirror.

describe("the 0.3 setup screen", () => {
  it("asks for a Mirror home, and offers nothing that reaches a Python Mirror", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup development={false} binding={false} onChoose={vi.fn()} />);
    expect(html).toContain("Mirror Desktop TS");
    expect(html).toContain("Open your Mirror home");
    expect(html).toContain("Choose Mirror home…");
    expect(html).not.toMatch(/Find my Mirror|Mirror source directory|Mirror user/);
    expect(html).not.toContain("dev_ts_home");
  });

  it("names the development script only in the development channel", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup development binding={false} onChoose={vi.fn()} />);
    expect(html).toContain("node scripts/dev_ts_home.mjs");
  });

  it("shows a refusal as an alert, and disables the button while binding", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup development={false} binding error="This home is not a marked 0.3 home." onChoose={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("This home is not a marked 0.3 home.");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Opening…<\/button>/);
  });

  it("is what the app shows when it needs a connection, and the Python flow is gone from it", () => {
    expect(appSource).toContain("runtimeSetupNeedsConnection ? (\n            <MirrorHomeSetup");
    expect(appSource).toContain("onChoose={() => void chooseAndBindMirrorHome()}");
    expect(appSource).not.toContain("<ExistingMirrorDiscovery");
    expect(appSource).not.toContain("runtimeDiscoveryVisible");
    const start = appSource.indexOf("async function chooseAndBindMirrorHome(");
    expect(start).toBeGreaterThan(0);
    const body = appSource.slice(start, appSource.indexOf("\n  }\n", start));
    expect(body).toContain('chooseRuntimeDirectory("mirrorHome")');
    expect(body).toContain("bindMirrorHome(");
    expect(body).toContain("importJourneysAfterBinding()");
    expect(body).not.toMatch(/saveRuntimeBinding|discoverExistingMirror/);
  });
});
