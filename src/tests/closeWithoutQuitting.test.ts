import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import quitStorageSource from "../app/desktopQuitStorage.ts?raw";
import desktopCapabilitySource from "../../src-tauri/capabilities/default.json?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const backendSource = readFileSync("src-tauri/src/main.rs", "utf8");

describe("CR085 close without quitting", () => {
  it("hides the window on close instead of destroying it", () => {
    expect(appSource).toContain("hideWindowAfterDraftFlush");
    expect(appSource).toContain("await appWindow.hide()");
    expect(appSource).not.toContain("await appWindow.destroy()");
    expect(appSource).not.toContain("await appWindow.close()");
  });

  it("permits the window hide command the close path now depends on", () => {
    expect(desktopCapabilitySource).toContain('"core:window:allow-hide"');
  });

  it("asks nothing when closing, because hiding never interrupts agent work", () => {
    const closeHandler = appSource.slice(
      appSource.indexOf("appWindow.onCloseRequested"),
      appSource.indexOf("Could not install the Composer draft close boundary."),
    );
    expect(closeHandler).toContain("hideWindowAfterDraftFlush");
    expect(closeHandler).not.toContain("setCloseConfirmationOpen");
  });

  it("confirms only on a real quit, using the active agent operation count", () => {
    expect(quitStorageSource).toContain('"mirror-desktop-quit-requested"');
    expect(quitStorageSource).toContain('invoke("confirm_desktop_quit")');
    expect(quitStorageSource).toContain('invoke("cancel_desktop_quit")');
    expect(appSource).toContain("listenForDesktopQuitRequest");
    expect(appSource).toContain("hasActiveOrFinalizingJourneyRuntime(journeyRuntimeStateRef.current)");
    expect(appSource).toContain("setCloseConfirmationOpen(true)");
    expect(appSource).toContain("Quit while agents are working?");
    expect(appSource).toContain("Quit anyway");
    expect(appSource).toContain("quitAfterDraftFlush");
    expect(appSource).toContain("cancelDesktopQuitRequest");
  });

  it("routes a user quit through the window before shutting down local Pi work", () => {
    expect(backendSource).toContain("DESKTOP_QUIT_REQUESTED_EVENT");
    expect(backendSource).toContain("fn confirm_desktop_quit");
    expect(backendSource).toContain("fn cancel_desktop_quit");
    expect(backendSource).toContain("api.prevent_exit()");
    expect(backendSource).not.toContain("WindowEvent::CloseRequested");
  });

  it("owns the macOS Quit menu item, because the predefined one terminates the process", () => {
    expect(backendSource).toContain("DESKTOP_QUIT_MENU_ID");
    expect(backendSource).toContain("Menu::default(app)");
    expect(backendSource).toContain("is_predefined_quit_text");
    expect(backendSource).toContain("submenu.remove_at(index)");
    expect(backendSource).toContain(".on_menu_event(");
    expect(backendSource).toContain("fn request_desktop_quit");
  });

  it("brings a hidden window back before asking, so the confirmation is never invisible", () => {
    expect(appSource).toContain("revealWindowForQuitConfirmation");
    expect(appSource).toContain("await appWindow.show()");
    const quitListener = appSource.slice(
      appSource.indexOf("listenForDesktopQuitRequest"),
      appSource.indexOf("Could not install the quit confirmation boundary."),
    );
    expect(quitListener).toContain("revealWindowForQuitConfirmation");
  });
});
