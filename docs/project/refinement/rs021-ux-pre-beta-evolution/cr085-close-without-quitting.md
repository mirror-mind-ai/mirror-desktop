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

There is no `RunEvent::WindowEvent` or `WindowEvent::CloseRequested` handling **in Rust**.

> **Correction (superseded below).** This investigation looked only at the Rust layer and then
> generalized its finding to the whole app. That was wrong: the close path was already owned by
> the frontend. See `Root Cause` below. The first implementation attempt failed in the Dev bundle
> because of this gap.

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


## Root Cause — 2026-09-28

The close decision never lived in Rust. It lived in the frontend, and it destroyed the window.

`src/app/App.tsx` already installed a close listener:

```ts
void appWindow.onCloseRequested((event) => {
  event.preventDefault();
  if (hasActiveOrFinalizingJourneyRuntime(...)) { setCloseConfirmationOpen(true); return; }
  void closeAfterDraftFlush();
})
```

and `closeAfterDraftFlush` ended with `await appWindow.destroy()`.

The real sequence on a red-button close was:

1. Because a JS listener exists, Tauri itself already calls `api.prevent_close()`
   (`tauri/src/manager/window.rs`), then forwards the event to the window.
2. The first attempt's Rust `prevent_close()` was therefore redundant.
3. The Rust `hide()` did run, but the JS handler continued and called `destroy()`.
4. Destroying the last window emitted `ExitRequested`, which ran `shutdown_pi_invocations`.

So the Rust fix was executed and then immediately undone by the actual owner of the decision.

Why the first attempt went wrong, recorded so the pattern is not repeated:

- Only one layer was characterized. A broad repository search failed early on unrelated noise and
  was narrowed to `src-tauri/` instead of being repaired; the frontend was never read.
- A Rust-layer finding was written up as an app-wide claim, even though this CR's own Proposed
  Scope asked for "any existing close-confirmation logic" — which existed, modal included.
- The tests could not fail. A new pure policy function was tested against itself, with no
  connection to the real close path. Four green Rust tests validated a fiction and produced false
  confidence across two Dev-bundle validation rounds.

## Implementation — 2026-09-28

Close and quit are now two different decisions, each owned by the layer that has the knowledge.

**Closing the window hides it, and asks nothing.** The frontend close handler flushes Composer
drafts and calls `appWindow.hide()`. No confirmation is shown, because hiding cannot interrupt an
agent. This required adding `core:window:allow-hide` (plus `allow-show`, `allow-unminimize`,
`allow-set-focus`) to the desktop capability; `core:window:default` does not include them, so the
hide call would otherwise have failed silently.

**Quitting is the only path that asks.** A Navigator-initiated `ExitRequested` is now handed back
to the window once: Rust calls `api.prevent_exit()` and emits `mirror-desktop-quit-requested`. The
window then either quits directly or, when agent work is active, shows the confirmation naming the
active operation count. Confirming flushes drafts and calls `confirm_desktop_quit`; cancelling
calls `cancel_desktop_quit`.

**Programmatic exits are never intercepted.** `desktop_exit_decision` proceeds whenever an exit
code is present, which covers our own confirmed quit, the runtime-channel icon failure exit and
the verified-update restart (`RESTART_EXIT_CODE`).

**An unresponsive window cannot trap the app.** A repeated user quit while a confirmation is
already outstanding proceeds without asking again. This deliberately trades one draft flush for the
guarantee that Quit always works.

Side effect worth naming: Cmd-Q previously did not flush Composer drafts at all, because draft
flushing was attached only to window close. It now does.

## Acceptance

- Red close button removes the window from view without quitting the app process.
- Explicit Quit still quits.
- Active runs are not silently terminated by window close.
- Reopening the app window restores the expected UI state.

## Exclusions

- No background agent continuation policy change beyond not killing existing work accidentally.
- No system tray/menu bar redesign unless needed for reopen behavior.
