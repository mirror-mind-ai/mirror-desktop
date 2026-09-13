[< RS014 — Transient Composer Notices](index.md)

# CR027 — Auto-dismiss transient composer notices

**Status:** planned

## Problem

An event-like notice rendered after the conversation output can remain above the composer indefinitely. The observed case shows `File could not be opened` with `Artifact path is outside the visible Journey workspace.` and remains until Mirror Desktop is closed and reopened. The stale notice competes with subsequent conversation work even though the failed open attempt has already ended.

## Expected Behavior

Event-like composer notices appear promptly, remain readable for a bounded interval and clear themselves without requiring application restart. A newer event restarts the interval, and changing Journey clears notice state owned by the previous context.

Persistent notices continue to reflect live conditions and never disappear merely because time passed.

## Captured Classification

Transient candidates:

- file or local-reference open failures;
- file-attachment failures;
- terminal send warnings;
- successful informational recovery notices;
- comparable point-in-time feedback with no remaining user action.

Persistent conditions:

- runtime binding is unavailable;
- Agent Settings are invalid;
- conversation recovery is blocked or actionable;
- native occupancy or global capacity blocks admission;
- a durable interruption or retained Journey lease requires attention;
- Mirror synchronization or legacy repair remains pending;
- any notice containing an action the user may still need.

## Implementation Plan

1. Add `src/app/transientComposerNotice.ts` with one exported eight-second duration and a cancellable scheduling primitive. The scheduler owns no React or operational state and supports injected/fake timers.
2. Add focused tests in `src/tests/transientComposerNotice.test.ts` proving no early dismissal, exact bounded dismissal, cancellation on replacement/unmount and a fresh full interval for a replacement event.
3. Apply independent scheduler effects in `src/app/App.tsx` to `localReferenceError`, `fileAttachmentError` and the existing `turnRecoveryNotice`. Each effect clears only the exact state value that scheduled it, so an older timer cannot erase a newer message.
4. Keep runtime `streamWarnings` semantically intact. Derive an exact visual key from Journey, warning count and final warning; temporarily suppress only that rendered terminal notice after eight seconds. A newly appended warning receives a new key and a fresh interval.
5. Extend the existing selected-Journey effect to clear transient local-reference, attachment and visual warning state on Journey change. Do not clear persistent runtime, recovery, lease or synchronization authority.
6. Preserve the current notice placement, English copy, `role="alert"` or `role="status"` semantics and composer behavior. Do not introduce a global toast system or persistence.
7. Run focused fake-timer and App source/integration tests, the complete frontend suite, `npm run build`, `npm run roadmap:check`, and validate the screenshot reproduction in isolated `Mirror Desktop Dev`.

## Expected Files

- `src/app/transientComposerNotice.ts` (new)
- `src/app/App.tsx`
- `src/tests/transientComposerNotice.test.ts` (new)
- Existing App/Journey tests only where needed for integration regression
- This CR and the file-first Refinement Workbench status

## Acceptance Direction

- The screenshot case remains visible before 8,000 ms and clears at 8,000 ms.
- Replacing a transient notice cancels the older timer and starts a full new 8,000 ms interval; an older callback cannot erase the replacement.
- Journey switching prevents a transient notice from leaking into the newly selected Journey.
- Timers are cleaned up on replacement and unmount.
- Persistent condition notices remain tied to their actual state and do not receive time-based dismissal.
- Alert and status semantics remain accessible, and no hidden operational state is cleared with the visual notice.

## Validation Route

Use fake timers for deterministic lifecycle tests. Verify each transient producer, repeated warnings, Journey switching, unmount cleanup and unchanged persistent-condition rendering. Preserve existing composer and Journey navigation tests, run the complete frontend suite and validate the screenshot scenario in isolated `Mirror Desktop Dev`.

Pass when the screenshot notice disappears after eight seconds without restart and persistent actionable notices remain visible while their conditions remain true. Fail if a stale timer clears newer feedback, a Journey inherits another Journey's transient event, runtime warning data is mutated for visual dismissal or any actionable condition becomes time-limited.

## Driver And Delivery Decision

Planning does not assign implementation authority. Driver and Delivery remain unset until the Navigator explicitly authorizes them and moves CR027 to `in_progress`.

## Boundaries

- Visual dismissal does not cancel, retry, acknowledge or mutate an underlying operation.
- No generic global toast system, notification history or settings preference is implied.
- No release, push, publication or protected Mirror/Journey/app-data mutation is authorized.

## Provenance

Captured from Navigator pre-release feedback on 2026-09-13 using an attached screenshot of the persistent file-open error.
