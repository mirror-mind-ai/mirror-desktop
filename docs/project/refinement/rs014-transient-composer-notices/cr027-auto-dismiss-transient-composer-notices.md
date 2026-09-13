[< RS014 — Transient Composer Notices](index.md)

# CR027 — Auto-dismiss transient composer notices

**Status:** done

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

## Implementation Evidence

- `src/app/transientComposerNotice.ts` defines one 8,000 ms duration, cancellable scheduling, stale-value protection and exact Journey/run/warning presentation keys.
- `src/app/App.tsx` now expires local-reference errors, attachment errors, terminal warning presentation and successful recovery information independently.
- Replacement effects cancel their prior timers, and functional state updates prevent an older callback from clearing newer text.
- Journey changes clear transient local presentation state. Runtime warning arrays remain unchanged; only the exact rendered terminal warning key is suppressed after expiry.
- Persistent runtime binding, Agent Settings, blocked recovery, occupancy, capacity, durable interruption, retained lease and Mirror synchronization notices remain condition-driven.
- Four focused fake-timer and identity tests pass alongside 37 related runtime/navigation/restart tests.
- The complete frontend suite passes with 700 tests across 128 files. `npm run build` and `npm run roadmap:check` pass; the existing Vite chunk-size advisory is unchanged.
- Isolated `Mirror Desktop Dev`, bundle ID `ai.mirrormind.desktop.dev`, is running for Navigator validation.

## Validation Route

Use fake timers for deterministic lifecycle tests. Verify each transient producer, repeated warnings, Journey switching, unmount cleanup and unchanged persistent-condition rendering. Preserve existing composer and Journey navigation tests, run the complete frontend suite and validate the screenshot scenario in isolated `Mirror Desktop Dev`.

Pass when the screenshot notice disappears after eight seconds without restart and persistent actionable notices remain visible while their conditions remain true. Fail if a stale timer clears newer feedback, a Journey inherits another Journey's transient event, runtime warning data is mutated for visual dismissal or any actionable condition becomes time-limited.

## Driver And Delivery Decision

- Driver: `@alissonvale`
- Delivery: `refinement/rs014-cr027-transient-composer-notices`
- Navigator confirmed both coordinates and authorized implementation on 2026-09-13.

## Navigator Validation

Accepted on 2026-09-13 in isolated `Mirror Desktop Dev`. The Navigator produced the original outside-Journey reference failure through `../mirrormind-site/README.md`, observed `File could not be opened`, and confirmed that the notice disappeared automatically after the bounded interval without restarting the app.

## Proportionality And Debt Review

The change adds one small timer primitive and local presentation effects rather than a global toast framework. Semantic runtime warnings and persistent condition authority remain unchanged. Replacement, cancellation, repeated warning and cross-Journey behavior are bounded explicitly. No relevant new debt was identified; release packaging and publication remain separate decisions.

## Boundaries

- Visual dismissal does not cancel, retry, acknowledge or mutate an underlying operation.
- No generic global toast system, notification history or settings preference is implied.
- No release, push, publication or protected Mirror/Journey/app-data mutation is authorized.

## Outcome

Completed on 2026-09-13. Transient composer-end feedback now expires after eight seconds, replacement and Journey boundaries are safe, runtime warning evidence remains intact, and persistent actionable conditions remain visible. The Navigator reproduced and accepted the original file-open scenario in isolated Mirror Desktop Dev.

## Provenance

Captured from Navigator pre-release feedback on 2026-09-13 using an attached screenshot of the persistent file-open error.
