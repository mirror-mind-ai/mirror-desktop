[< RS021](index.md)

# CR085: Close Without Quitting

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr085-close-without-quitting`

## Problem

On macOS, many applications remain running when the red window close button is clicked. Mirror Desktop currently behaves too much like closing the window ends the app, which feels surprising for a daily desktop application.

## Expected Behavior

Clicking the macOS red close button closes or hides the window without terminating the application process. The app can be reopened from the Dock/menu without losing its ordinary application state.

## Proposed Scope

- Characterize current close/quit behavior and any existing close-confirmation logic.
- Implement macOS window close behavior that keeps the app process alive when appropriate.
- Preserve explicit Quit semantics.
- Decide behavior while an agent is running: hide/close window should not silently kill a process.
- Validate relaunch/reopen behavior and app-data continuity.


## Investigation — 2026-09-28

Current backend lifecycle lives in `src-tauri/src/main.rs` at the final `tauri::Builder`
chain. The app currently handles only:

- `RunEvent::Ready`, to apply the runtime-channel macOS Dock icon; and
- `RunEvent::ExitRequested`, to call `shutdown_pi_invocations`.

There is no `RunEvent::WindowEvent` or `WindowEvent::CloseRequested` handling. The default
Tauri/Wry behavior destroys the window on close. When the destroyed window is the last window,
Tauri emits `ExitRequested`; Mirror Desktop then runs `shutdown_pi_invocations`, which kills
running Pi child processes. This explains why red-window-close can behave like app quit and why
it is unsafe while an agent is running.

Tauri 2.11 exposes the exact primitives needed for a narrow macOS fix:

- `WindowEvent::CloseRequested { api }` with `api.prevent_close()`;
- `WebviewWindow::hide()` / `show()`;
- macOS-only `RunEvent::Reopen { has_visible_windows }`, emitted when Dock/app reopen is
  requested.

Preferred implementation shape:

1. On macOS `CloseRequested` for the main window, call `prevent_close()` and `hide()` the window.
   The window remains alive, so no last-window destruction and no `ExitRequested` shutdown occurs.
2. On macOS `Reopen { has_visible_windows: false }`, show, unminimize and focus the main window.
3. Keep `ExitRequested` as the explicit quit path, so Cmd-Q/menu quit still shuts down local Pi
   processes intentionally.
4. Keep the behavior scoped to macOS unless tests prove a cross-platform close-to-hide policy is
   desired.

Testing seam should be a small pure decision/helper model in Rust, because the actual Tauri event
APIs are runtime callbacks. Pin the policy before wiring it:

- macOS close-request on `main` means `prevent_close + hide`, not shutdown;
- non-main or non-macOS close remains normal close;
- explicit exit remains `shutdown_pi_invocations`;
- macOS reopen without visible windows means `show + unminimize + focus`.

## Acceptance

- Red close button removes the window from view without quitting the app process.
- Explicit Quit still quits.
- Active runs are not silently terminated by window close.
- Reopening the app window restores the expected UI state.

## Exclusions

- No background agent continuation policy change beyond not killing existing work accidentally.
- No system tray/menu bar redesign unless needed for reopen behavior.
