[< Refinement Workbench](../index.md)

# CR012 — Replace completion messages with Finishing status

## Problem

During Mirror Desktop alpha usage, after a turn finishes, several finalization messages appear at the bottom of the app. This creates visible noise in the chat surface.

## Expected Behavior

Routine successful finalization should not add completion notices around the composer. While post-answer persistence and release procedures are still processing, the existing `Working…` status should become `Finishing…`. Once finalization settles, the status should disappear without showing a persistent `Completed` message.

Actionable failures, blocked recovery, and explicit retry controls must remain visible. Routine internal milestones may stay silent; if they later prove necessary for diagnosis, they should live behind one discreet details link rather than appearing as multiple notices.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Assessment

The current UI projects the same successful lifecycle through overlapping composer surfaces:

- `ComposerRuntimeStatus` keeps `Working` during both agent execution and finalization, then leaves a persistent `Completed` state;
- `reconciliationBlocksInvocation` adds a full `Recording the completed turn` notice;
- `isFinalizingTurn` adds another `Recording the completed turn…` line;
- the Journey runtime indicator calls the same finalizing phase `Recording`.

These messages represent useful internal lifecycle distinctions, but exposing all of them makes a successful answer feel unfinished and competes with the next composer action. The state should remain explicit in the runtime model while its routine presentation is reduced to one status.

## Proposed Plan

This plan is proposed for Navigator approval; CR012 remains `captured` and unassigned until an explicit execution decision.

1. Change `ComposerTurnStatus` from `working | completed` to `working | finishing`.
2. Derive `working` only while Pi is actively starting/running/streaming, and derive `finishing` while the selected turn is in post-answer finalization or routine reconciliation release.
3. Render the same status component in place: `Working…` transitions to `Finishing…`; after release it renders nothing. Do not add a transient or persistent `Completed` badge.
4. Remove the routine `Recording the completed turn` notice and the separate `turn-finalization-status` line from the composer.
5. Rename the Journey sidebar's finalizing indicator from `Recording` to `Finishing` so one lifecycle vocabulary is used consistently.
6. Keep warnings, interrupted-turn notices, retained-lease blocks, Mirror repair controls, settings failures, and other actionable exceptions visible. CR012 must not silence failures.
7. Prefer silence for successful internal completion milestones in this slice. Do not add a disclosure link unless concrete diagnostics remain that users need to inspect; this avoids replacing several noisy messages with a new permanent control.
8. Update state, component, integration, accessibility, and source-boundary tests before isolated Dev validation.

## Proposed Acceptance

- During provider execution, exactly one composer status says `Working…`.
- After the answer is visible but before durable finalization releases, that same status says `Finishing…`.
- Routine finalization does not render `Recording the completed turn`, its explanatory paragraph, or a second finalization line.
- After successful release, neither `Completed` nor another completion message remains beside the composer.
- The Journey sidebar uses `Finishing`, not `Recording`, for the same phase.
- Actionable failure, recovery, and retry surfaces remain unchanged and visible.
- Navigation cannot project one Journey's working or finishing state into another Journey.
- Screen-reader status text follows the visible `Working` → `Finishing` → silent sequence.

## Implementation

Navigator approved the plan and authorized implementation. Driver is `@alissonvale`; Delivery is `refinement/rs009-cr010-shift-enter-line-breaks`.

Implemented the quiet lifecycle presentation:

- composer status now derives `working`, `finishing`, or no status;
- active execution remains `Working…`;
- post-answer persistence and release become `Finishing…`;
- successful release becomes silent instead of leaving `Completed`;
- the routine reconciliation notice and separate finalization line were removed;
- sidebar visible and accessible finalization vocabulary now uses `Finishing`;
- actionable warning, recovery, retained-lease, and retry surfaces were left intact;
- obsolete completion/finalization styles were removed.

## Evidence

Refinement traced the current presentation through:

- `src/app/composerTurnStatus.ts`;
- `src/app/ComposerRuntimeFooter.tsx`;
- `src/app/JourneyRuntimeIndicator.tsx`;
- the routine finalization notices in `src/app/App.tsx`;
- `src/tests/composerTurnStatus.test.ts`, `src/tests/runtimeProjectionComponent.test.tsx`, and `src/tests/journeyRuntimeIndicator.test.tsx`.

Implementation validation:

- 633 frontend tests passed across 114 files;
- focused status, component, sidebar, theme, lifecycle, and source-boundary tests passed;
- `npm run build` passed;
- `npm run tauri:build:dev` produced the isolated Dev app and DMG;
- the restarted Dev process loaded the exact inode of the newly built executable;
- `git diff --check` passed.

Navigator validation remains pending in the isolated Dev bundle.

## Outcome

No terminal outcome has been recorded.

## Migration Provenance

- Legacy record: `43b9af18`.
- Created: `2026-09-09T10:45:43.290159Z`.
- Last updated: `2026-09-09T10:45:43.290159Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
