[< RS016](index.md)

# CR037: Confirm App Closure While Agents Are Working

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Mirror Desktop can close while one or more agents are still in the `working` state without warning the user. An ordinary window-close or application-quit action can therefore interrupt visible work before the user has consciously chosen to abandon it.

## Expected Behavior

When an ordinary close or quit is requested while any agent is `working`, Mirror Desktop warns that agent work is still in progress and asks the user to confirm whether the application should really close. Cancelling keeps the app and active work open. Explicit confirmation proceeds with closure. When no agent is working, the existing close behavior remains direct.

## Impact

Silent closure during active work can discard progress, interrupt provider execution or leave users uncertain about whether finalization completed. A bounded confirmation makes the destructive consequence visible without obstructing ordinary closure when the app is idle.

## Plan Or Decision

Captured under RS016 from direct Navigator request. Selection, planning, assignment and implementation remain pending.

## Evidence

Navigator report on 2026-09-17: the app should not close without warning when agents are in `working`; it should disclose the active work and require explicit confirmation before proceeding.

## Outcome

Pending.
