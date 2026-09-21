[< RS020](index.md)

# CR064: Encode the Multi-Turn Happy Path as an Executable Contract

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs020-cr064-happy-path-contract`

## Problem

Twenty-five Change Requests validated components while the essential journey kept failing. Two consecutive false positives (CR063 evidence, 2026-09-20 and 2026-09-21) shipped through 902 green tests because no test exercises consecutive turns in one Conversation across finalization, automatic repair, runtime publication and renewed admission. Several existing tests assert `App.tsx` source text instead of behavior.

## Expected Behavior

An automated integration contract drives the real state sequence for one Journey generation:

```text
active turn → Pi terminal → local projection → outbox → Mirror append
→ acknowledgement → journal settled → runtime publication → presentation
→ next turn
```

for five consecutive turns, explicitly modeling the coexistence of base renderer state, runtime `conversationSnapshot` and persisted projection. After every turn the contract asserts: response visible, Composer available, no synchronization notice, journal `settled / completed / complete`, empty Journey outbox, exact message IDs delivered, presented and persisted projections committed.

The contract also covers: navigation away and back mid-sequence, simulated restart (rehydration from durable state), automatic repair after injected append failure, and delayed convergence for an older run while a successor is active.

## Acceptance Horizon

- The contract fails against the current architecture by reproducing the stale-snapshot false positive before any production change.
- Fault injection uses deterministic in-memory adapters for journal, outbox, Mirror append and Pi inspection; no provider execution and no production data.
- The contract becomes the primary acceptance gate for CR065–CR067.
- Grep-the-source assertions added by CR063 are marked for deletion once CR066 removes the code they inspect.

## Boundaries

No production code change beyond what is strictly required to inject test seams. No new durable schema. No provider or model route.

## Implementation Outcome

The contract lives in `src/tests/convergentTurnContract.test.ts` over the world fixture `src/tests/fixtures/convergentTurnWorld.ts`. The world composes the real production modules (runtime reducer, navigation presentation, `pendingMirrorTurnRepair`, notice and availability derivation, `executeCompletedSettlement`, outbox creation, receipt application, run/settlement authority construction) around deterministic in-memory durable stores for journal, outbox, Mirror and projection files. Publication follows `App.tsx` semantics faithfully, including the `projectionCurrentTurnMatchesAuthority` publication guard and the base/runtime-snapshot split. No production file changed; no test seams were required.

Eight scenarios:

1. five consecutive frictionless turns — green;
2. navigation away and back mid-sequence — green;
3. restart rehydration — green;
4. genuine delivery debt after injected append failure — green;
5. idle repair clears the notice — green;
6. repair converging while a successor turn is active — **red**, encoded as `it.fails`;
7. conversation clean after restart when repair raced a successor — **red**, encoded as `it.fails`;
8. older-run convergence never alters successor content — green.

## Red-Phase Evidence

Scenarios 6 and 7 reproduce the production false-positive class exactly: `durableEvidenceSettled()` asserts true (journal `settled/completed`, empty outbox, exact user and assistant IDs in Mirror for every turn) while `syncNoticeVisible` is `true`. The stale mirror-pending state propagates through successor staging into the persisted projection, which is why scenario 7 shows the notice surviving restart, matching the Navigator's report of recurrence in the same Conversation several turns later.

The defect mechanism pinned by the fixture: repair publishes only through `publishSettledProjectionIfCurrent`, whose current-turn guard fails once a successor is staged, so no in-memory replica ever receives the converged state; the successor then carries the stale pending turn into every later projection.

`it.fails` inverts on correction: when CR065–CR067 make these scenarios pass, the suite fails until each is flipped to `it`, forcing the explicit green transition.

## Validation

- Focused contract: 8 scenarios pass (6 green, 2 reproduced-red under `it.fails`).
- Temporary inversion run confirmed both red scenarios fail on the notice assertion with settled durable evidence, not on incidental fixture errors.
- Complete frontend suite: 160 files, 910 tests.
- TypeScript/Vite build passed; roadmap consistency `READY`; `git diff --check` clean.
