[< Story](index.md)

# Test Guide — DS-012.US-3 Restore Bounded Concurrent Journey Turns

## Focused Native Gates

- production capacity constant equals exactly two;
- two different Journey reservations coexist and a third rejects;
- duplicate same-Journey reservation rejects;
- A cancellation/process death/cleanup leaves B unchanged;
- stale callbacks cannot mutate replacement or sibling authority;
- shutdown snapshots and controls at most two exact children;
- independent Journey journal files support interleaved transitions without byte mutation across siblings;
- each Journey journal still rejects a second unsettled turn.

## Focused Frontend Gates

- occupancy inspection accepts exactly the bounded production limit;
- Journey selection remains presentation-only;
- A runtime update cannot mutate B;
- projection, settlement and outbox operations retain exact Journey/run/generation authority;
- dispatcher route quarantine remains exact and bounded;
- one Journey may finalize while another remains streaming.

## Commands

During implementation:

```bash
cd src-tauri
cargo test pi_process_registry
cargo test turn_journal
cd ..
npm test -- src/tests/piInvocationOccupancy.test.ts src/tests/journeyRuntimeIntegration.test.ts src/tests/journeyRuntimeState.test.ts src/tests/journeySettlement.test.ts src/tests/piProcessEventDispatcher.test.ts
```

At child completion:

```bash
npm test
npm run build
cd src-tauri
cargo test
cargo check
cd ..
git diff --check
npm run tauri:build:dev
```

## Final DEV Smoke

Run only after automated gates pass and after announcing screen occupation.

- Use two isolated DEV Journeys with exact known generation authority.
- Start a bounded long-running turn in A.
- Navigate to B and start a second turn while A remains live.
- Observe two exact native children and two independent `running` journal records.
- Allow one Journey to settle while the other remains active.
- Let or direct the sibling to terminal settlement; desktop cancellation is optional because deterministic directed-control tests already cover it.
- Verify both exact projection records, journal phases, Mirror delivery and empty DEV outbox.
- Verify no residual DEV children or Harness process after closure.
- Stop immediately if production identity or coordinates appear.

## Pass Condition

Capacity is exactly two; A and B execute and settle through the same journal-owned coordinator without cross-mutation; same-Journey overlap and a third concurrent Journey fail atomically; full automated gates and the final DEV smoke pass; production remains untouched.
