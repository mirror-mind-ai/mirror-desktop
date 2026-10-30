import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PiInstallStep, piInstallProgressLabel } from "../app/PiInstallStep";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/runtimeChannelStorage.ts?raw";
import installSource from "../../src-tauri/src/pi_install.rs?raw";

// CV-010.DS-005 slice 3b: on a home whose app has no Pi yet, setup installs the app's own Pi before
// anything that needs it, with visible progress and a way to try again.

describe("the Pi install step", () => {
  it("offers to install, says what it downloads, and that an existing Pi is left alone", () => {
    const html = renderToStaticMarkup(<PiInstallStep view={{ kind: "idle" }} onInstall={vi.fn()} />);
    expect(html).toContain("<h1>Install Pi</h1>");
    expect(html).toContain("about 24 MB");
    expect(html).toContain("A Pi you already have is left alone.");
    expect(html).toContain(">Install Pi</button>");
  });

  it("shows progress instead of the button while installing", () => {
    const html = renderToStaticMarkup(<PiInstallStep view={{ kind: "installing", phase: "download", done: 40, total: 121 }} onInstall={vi.fn()} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('<progress max="121" value="40">');
    expect(html).toContain("Downloading Pi · 40 of 121 packages");
    expect(html).not.toContain("<button");
    expect(piInstallProgressLabel({ kind: "installing", done: 0, total: 0 })).toBe("Starting…");
    expect(piInstallProgressLabel({ kind: "installing", phase: "unpack", done: 3, total: 121 })).toBe("Unpacking Pi · 3 of 121 packages");
    expect(piInstallProgressLabel({ kind: "installing", phase: "check", done: 0, total: 1 })).toBe("Checking that Pi starts…");
  });

  it("names a failure and offers to try again", () => {
    const html = renderToStaticMarkup(<PiInstallStep view={{ kind: "failed", message: "Pi could not be downloaded." }} onInstall={vi.fn()} />);
    expect(html).toContain('role="alert">Pi could not be downloaded.</p>');
    expect(html).toContain(">Try again</button>");
  });

  it("comes after the home and before Journeys and the model, and reloads once Pi is in place", () => {
    expect(appSource).toContain('const runtimeSetupNeedsPi = !runtimeSetupNeedsConnection && runtimeChannel?.piInstalled === false;');
    expect(appSource).toMatch(/\|\| runtimeSetupNeedsConnection\n\s+\|\| runtimeSetupNeedsPi/);
    const step = appSource.indexOf("<PiInstallStep");
    expect(appSource.indexOf("<MirrorHomeSetup")).toBeLessThan(step);
    expect(step).toBeLessThan(appSource.indexOf('runtimeOnboardingState === "error" || runtimeOnboardingState === "empty" ? ('));
    expect(step).toBeLessThan(appSource.indexOf("<h1>Choose your model</h1>"));
    const install = appSource.slice(appSource.indexOf("async function installAppPi("));
    const body = install.slice(0, install.indexOf("\n  }\n"));
    expect(body.indexOf("await installPi(")).toBeLessThan(body.indexOf("reloadForBoundHome()"));
    expect(body.slice(body.indexOf("} catch (error) {"))).not.toContain("reloadForBoundHome()");
    expect(body.slice(body.indexOf("} catch (error) {"))).toContain('kind: "failed"');
  });

  it("listens to the event the native command emits, and stops listening when it ends", () => {
    expect(installSource).toContain('PI_INSTALL_PROGRESS_EVENT: &str = "pi-install-progress";');
    expect(storageSource).toContain('listen<PiInstallProgress>("pi-install-progress"');
    const install = storageSource.slice(storageSource.indexOf("export async function installPi("));
    expect(install.indexOf('await invoke("install_pi")')).toBeLessThan(install.indexOf("} finally {"));
    expect(install.slice(install.indexOf("} finally {"))).toContain("unlisten();");
  });
});
