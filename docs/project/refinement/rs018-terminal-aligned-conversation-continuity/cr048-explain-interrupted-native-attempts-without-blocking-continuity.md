[< RS018](index.md)

# CR048 — Explain Interrupted Native Attempts Without Blocking Continuity

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

CR047 proved that terminating Mirror Desktop during an admitted native Pi execution preserves the user entry, fabricates no assistant response, performs no implicit retry, releases vanished-process occupancy and allows a successor. After relaunch, however, the Conversation shows the unanswered user entry without a dedicated explanation that the attempt was interrupted.

The state is operationally correct but visually ambiguous. A Navigator may not know whether the agent is still working, the response is delayed, or the attempt ended and a new message is safe.

## Expected Behavior

- An inactive admitted attempt with no terminal assistant response is explained honestly after relaunch.
- The explanation distinguishes interruption from provider completion and from active execution.
- The Composer remains available whenever no exact native execution owns occupancy.
- The notice never retries the provider implicitly.
- Any action offered by the notice names its exact model-free consequence.
- The incomplete native user entry remains part of the Pi-backed Conversation Surface.
- Mirror delivery, projection, Segment and journal debt cannot turn the notice into an availability blocker.

## Evidence

During CR047 guided DEV validation on 2026-09-18:

1. the app was terminated after an explicitly submitted provider turn began;
2. relaunch preserved the admitted user entry and showed no assistant response;
3. no provider retry occurred;
4. the Composer was available and a successor completed normally;
5. no dedicated interruption or recovery notice appeared.

## Initial Scope Boundary

Likely surfaces:

- inactive-attempt classification derived from exact Pi inspection plus native occupancy;
- Conversation-level explanatory notice;
- source and component tests for relaunch, active-run distinction and non-blocking availability.

The solution must not make the turn journal, Desktop projection, Segment or Mirror receipt transcript authority. Exact classification and action semantics require planning before implementation.

## Exclusions

- No automatic provider retry.
- No fabricated assistant response.
- No blocking of a successor without exact native occupancy.
- No production data repair.
- No Mirror Core change.
- No implementation until focus, plan, Driver and Delivery are explicitly approved.

## Authority Boundary

The Navigator explicitly requested capture of this follow-up after accepting CR047 on 2026-09-18. Capture does not select, plan, assign or authorize implementation.

## Outcome

Captured for refinement.
