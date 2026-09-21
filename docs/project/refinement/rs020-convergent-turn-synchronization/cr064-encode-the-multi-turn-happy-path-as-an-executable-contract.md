[< RS020](index.md)

# CR064: Encode the Multi-Turn Happy Path as an Executable Contract

**Status:** captured
**Driver:** —
**Delivery:** —

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
