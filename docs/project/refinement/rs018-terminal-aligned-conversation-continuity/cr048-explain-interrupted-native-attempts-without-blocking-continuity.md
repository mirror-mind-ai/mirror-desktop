[< RS018](index.md)

# CR048 — Explain Interrupted Native Attempts Without Blocking Continuity

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr048-interrupted-attempt-notice`

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

## Plan

### Exact candidate derivation

Add a pure inactive-attempt classifier. A candidate exists only when exact Pi inspection reports the same native entry as both `leafEntryId` and `incompleteUserEntryId`, and that entry is a visible user message. Bind the candidate to Journey, thread, generation and Pi session. Inconsistent inspection evidence fails closed.

### Runtime distinction

Retain the candidate as ephemeral presentation state after inactive Conversation restore. Show it only when native occupancy inspection is known, no exact lease exists for the selected Journey, no selected runtime is busy and no stream is active. Clear stale candidates on Journey switch and when a successor reaches exact agent-start evidence. Pre-agent rejection therefore preserves the notice; successful admission removes it.

### Presentation

Render one passive Conversation notice immediately above the Composer. It explains that the previous attempt ended before producing a response, that no retry was started and that the Navigator may continue with a new message. It provides no retry action and does not alter availability.

### TDD

Add pure classifier tests, component accessibility/copy tests and source integration tests proving restore derivation, exact inactive gating, agent-start clearing and absence of provider/recovery actions. Re-run the full frontend and Rust gates before guided DEV interruption/relaunch validation.

The solution must not make the turn journal, Desktop projection, Segment or Mirror receipt transcript authority.

## Exclusions

- No automatic provider retry.
- No fabricated assistant response.
- No blocking of a successor without exact native occupancy.
- No production data repair.
- No Mirror Core change.
- No recovery action, journal mutation or provider invocation from the notice.

## Authority Boundary

The Navigator explicitly requested capture after CR047, then selected, planned and authorized implementation with Driver `@alissonvale` and Delivery `refinement/rs018-cr048-interrupted-attempt-notice` on 2026-09-18. Navigator Validation, push, merge, publication, release, production mutation and RS018 closure remain separate decisions.

## Outcome

Implementation is complete and awaiting guided DEV validation.

A pure `deriveInactiveNativeAttemptCandidate()` now accepts only an exact Pi inspection where the same visible user entry is both active leaf and `incompleteUserEntryId`. The ephemeral candidate carries Journey, thread, generation and Pi-session coordinates; malformed or contradictory evidence fails closed.

`shouldPresentInactiveNativeAttempt()` requires exact selected-Conversation coordinates, known native occupancy, no selected-Journey lease, no selected runtime work and no active stream. Journey or Conversation selection clears stale presentation state. A successor hides the notice while reserved and clears the exact candidate only after native `working` agent-start evidence, so pre-agent rejection preserves the honest explanation.

`InterruptedNativeAttemptNotice` is passive: it explains that the previous attempt was interrupted before producing a response, states that no retry was started and names a new message as the continuation route. It exposes no button, provider call or recovery mutation and does not participate in `ConversationAvailability`.

### Automated Validation Evidence

- Pure classifier tests cover exact derivation, complete transcript absence, malformed evidence and every active-occupancy suppression condition.
- Component coverage verifies accessible passive status copy and absence of retry controls.
- Source integration coverage proves exact restore derivation, known inactive occupancy gating, agent-start clearing and passive rendering.
- Focused CR048 suite: 36 tests passed.
- Complete frontend suite: 824 passed.
- Complete Rust suite: 152 passed, 1 ignored; `cargo check` passed.
- TypeScript, production web build, roadmap consistency and `git diff --check` passed.
- No provider was invoked. No production app data, Mirror database or Mirror Core source was read or mutated.

The first isolated Rust run exhausted the nearly full local disk while creating a redundant per-worktree target directory. That partial build output was deleted, and the full Rust gates passed using the existing shared development target. No source or durable application data was removed.
