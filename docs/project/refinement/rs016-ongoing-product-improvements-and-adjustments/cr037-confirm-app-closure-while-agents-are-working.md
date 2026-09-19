[< RS016](index.md)

# CR037: Confirm App Closure While Agents Are Working

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr037-confirm-app-closure`

## Problem

Mirror Desktop can close while one or more agents are still in the `working` state without warning the user. An ordinary window-close or application-quit action can therefore interrupt visible work before the user has consciously chosen to abandon it.

The current close behavior also has a defect in the same interaction boundary: clicking the main window `x` does not close the app. The app only closes through `Command+Q` or an explicit app-bar quit action. The CR therefore covers both the missing active-work confirmation and restoration of ordinary main-window close behavior.

## Expected Behavior

When an ordinary close or quit is requested while any agent is `working`, Mirror Desktop warns that agent work is still in progress and asks the user to confirm whether the application should really close. Cancelling keeps the app and active work open. Explicit confirmation proceeds with closure.

When no agent is working, ordinary closure remains direct and works from every standard close route, including the main window `x`, `Command+Q`, and explicit app-bar quit. The close guard must not turn the main window `x` into a no-op.

## Impact

Silent closure during active work can discard progress, interrupt provider execution or leave users uncertain about whether finalization completed. A bounded confirmation makes the destructive consequence visible without obstructing ordinary closure when the app is idle.

The broken main-window close path also undermines ordinary desktop expectations and hides the closure route most users will try first. Fixing it in the same CR keeps the close/quit contract coherent instead of validating a confirmation flow on top of a broken close primitive.

## Plan Or Decision

Pulled as the current focused CR under RS016. Scope was adjusted by Navigator request to include the current main-window `x` defect: closing via the window chrome must work when idle and must participate in the same active-agent confirmation boundary when agents are working.

Plan approved on 2026-09-19:

- Centralize the close-request path behind one application-owned close boundary.
- Flush Composer draft persistence before any confirmed close.
- When no Journey runtime is active or finalizing, allow ordinary close routes to complete after the flush, including the main window `x`.
- When any Journey runtime is active or finalizing, prevent the requested close and show an in-app alert dialog that names active work and asks for explicit confirmation.
- Cancelling keeps the app open and leaves runtime state untouched.
- Confirming flushes drafts and proceeds with native window destruction without recursively re-triggering the guarded close path.
- Keep the change scoped to close/quit handling; do not alter cancellation, settlement, Mirror synchronization, runtime admission or turn persistence semantics.

## Evidence

Navigator report on 2026-09-17: the app should not close without warning when agents are in `working`; it should disclose the active work and require explicit confirmation before proceeding.

Navigator report on 2026-09-19: the main window `x` currently does not close the app; the app only closes with `Command+Q` or explicit quit from the app bar.

Implementation evidence on 2026-09-19:

- `npm test -- --run src/tests/composerDraftIntegration.test.ts` — passed, 4 tests.
- `npm run build` — passed (`tsc && vite build`).
- `npm run tauri:build:dev` — passed and rebuilt `Mirror Desktop Dev.app` for validation.

Navigator validation on 2026-09-19: accepted. The rebuilt dev app restored ordinary close behavior through the main window `x`, preserved Composer draft flushing, showed explicit active-work confirmation when needed, and the light-theme explanation box contrast was corrected.

Debt review on 2026-09-19: no action required. The change remains scoped to close/quit handling and does not alter cancellation, settlement, Mirror synchronization, runtime admission or turn persistence semantics.

## Outcome

Done. Mirror Desktop now closes through the ordinary main-window close route when idle, and active/finalizing Journey runtime work triggers an application-owned confirmation dialog before closing. Explicit confirmation flushes Composer drafts and closes the app; cancellation leaves active work untouched.
