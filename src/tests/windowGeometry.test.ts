import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import desktopCapabilitySource from "../../src-tauri/capabilities/default.json?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const backendSource: string = readFileSync("src-tauri/src/main.rs", "utf8");
const geometrySource: string = readFileSync("src-tauri/src/window_geometry.rs", "utf8");
const capabilities = JSON.parse(desktopCapabilitySource) as { permissions: string[] };

const channels = ["tauri.conf.json", "tauri.dev.conf.json", "tauri.eval.conf.json"] as const;

describe("CR101 — window geometry is restored natively", () => {
  it("places the window before it is shown, so restoring is not a visible jump", () => {
    for (const channel of channels) {
      const config = JSON.parse(readFileSync(`src-tauri/${channel}`, "utf8")) as {
        app: { windows: { visible?: boolean; minWidth: number; minHeight: number }[] };
      };
      const [window] = config.app.windows;
      expect(window.visible, `${channel} must open its window invisible`).toBe(false);
      // The corruption floor in the domain is read against these, so they must not drift apart.
      expect(window.minWidth).toBe(860);
      expect(window.minHeight).toBe(620);
    }
    // Geometry is applied from `Ready`, not from `setup`: window commands are messages to the event
    // loop, and in `setup` nothing is processing them yet. Measured directly — a window placed from
    // `Ready` reports the restored bounds, so this is where the restore actually takes effect.
    const ready = backendSource.slice(
      backendSource.indexOf("tauri::RunEvent::Ready"),
      backendSource.indexOf("tauri::RunEvent::Reopen"),
    );
    expect(ready).toContain("apply_startup_window_geometry(&window, &app_data_root)");
    // Showing is unconditional: a geometry problem must never leave the app with no window.
    expect(ready.indexOf("apply_startup_window_geometry")).toBeLessThan(ready.indexOf("window.show()"));
    expect(backendSource.slice(
      backendSource.indexOf(".setup(|app| {"),
      backendSource.indexOf(".manage(PiProcessState::default())"),
    )).not.toContain("apply_startup_window_geometry");
  });

  it("records only the two facts geometry is made of", () => {
    expect(backendSource).toContain("tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)");
    expect(backendSource).toContain("record_window_geometry(window)");
    // CR085 owns closing, and it stays owned by the frontend.
    expect(backendSource).not.toContain("WindowEvent::CloseRequested");
  });

  it("commits the last arrangement when the app exits, not only on the interval", () => {
    const exitHandler = backendSource.slice(
      backendSource.indexOf("tauri::RunEvent::ExitRequested"),
      backendSource.indexOf("shutdown_pi_invocations(&app_handle.state::<PiProcessState>())"),
    );
    expect(exitHandler).toContain("flush_window_geometry(app_handle)");
  });

  it("keeps geometry a native preference, with no new frontend window authority", () => {
    // The frontend never reads or writes geometry, so it needs none of these permissions.
    for (const permission of [
      "core:window:allow-set-position",
      "core:window:allow-set-size",
      "core:window:allow-outer-position",
      "core:window:allow-outer-size",
    ]) {
      expect(capabilities.permissions).not.toContain(permission);
    }
    expect(appSource).not.toContain("outerPosition");
    expect(appSource).not.toContain("setPosition");
  });

  it("never mixes geometry with Journey, Conversation or Mirror state", () => {
    // Comments are stripped: the module's own header declares the separation in these words, and
    // the claim being guarded is about code, not prose.
    const code = geometrySource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .toLowerCase();
    for (const foreign of ["journey", "conversation", "mirror", "turn_journal", "pi_session"]) {
      expect(code).not.toContain(foreign);
    }
  });

  it("names a reason whenever it declines to restore", () => {
    expect(geometrySource).toContain("pub fn reason_code");
    for (const reason of [
      "nothing_stored",
      "unreadable",
      "malformed",
      "unsupported_schema",
      "implausible_size",
      "no_monitors_reported",
      "no_visible_monitor_overlap",
    ]) {
      expect(geometrySource).toContain(`"${reason}"`);
    }
  });

  it("judges reachability against the usable area, not the whole display", () => {
    // A window under the macOS menu bar is visible but cannot be dragged out.
    expect(backendSource).toContain("monitor.work_area()");
  });
});
