[< RS021](index.md)

# CR085: Close Without Quitting

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Acceptance

- Red close button removes the window from view without quitting the app process.
- Explicit Quit still quits.
- Active runs are not silently terminated by window close.
- Reopening the app window restores the expected UI state.

## Exclusions

- No background agent continuation policy change beyond not killing existing work accidentally.
- No system tray/menu bar redesign unless needed for reopen behavior.
