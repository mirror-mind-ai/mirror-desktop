[< RS014 — Transient Composer Notices](index.md)

# CR027 — Auto-dismiss transient composer notices

**Status:** captured

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

## Acceptance Direction

- The screenshot case clears automatically after approximately eight seconds.
- Replacing a transient notice restarts its full readable interval.
- Journey switching prevents a transient notice from leaking into the newly selected Journey.
- Timers are cleaned up on replacement and unmount.
- Persistent condition notices remain tied to their actual state and do not receive time-based dismissal.
- Alert and status semantics remain accessible, and no hidden operational state is cleared with the visual notice.

## Initial Validation Route

Use fake timers for deterministic lifecycle tests, preserve existing composer and Journey navigation tests, run the complete frontend suite and validate the screenshot scenario in isolated `Mirror Desktop Dev`.

## Boundaries

- Visual dismissal does not cancel, retry, acknowledge or mutate an underlying operation.
- No generic global toast system, notification history or settings preference is implied.
- No release, push, publication or protected Mirror/Journey/app-data mutation is authorized.

## Provenance

Captured from Navigator pre-release feedback on 2026-09-13 using an attached screenshot of the persistent file-open error.
