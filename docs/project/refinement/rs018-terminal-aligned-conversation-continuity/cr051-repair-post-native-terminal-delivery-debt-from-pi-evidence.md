[< RS018](index.md)

# CR051 — Repair Post-Native Terminal Delivery Debt from Pi Evidence

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

CR049 captured the exact post-native/pre-delivery termination window. Pi durably recorded the admitted user and a successful assistant leaf with `stopReason: stop`, then the watcher terminated Mirror Desktop before harness settlement or Mirror debt materialization. After relaunch, the Pi-backed surface correctly reconstructed the complete exchange, no provider retry ran and the Composer remained available.

The journal record nevertheless remained `running`, its harness/Pi/Mirror authorities remained pending, and no outbox item existed for that turn. After Mirror availability was restored, the explicit `Retry Mirror synchronization` action failed with `mirror_append_message_authority_mismatch`. The reconstructed Pi-backed Surface uses native aliases (`pi-<entry-id>`) while the stale journal authority retains pre-agent harness message IDs, so the current repair route attempts to recover delivery through incompatible projected message identity instead of materializing debt from exact Pi evidence.

## Expected Behavior

- A successful terminal Pi turn remains complete after termination, regardless of harness settlement state.
- Relaunch never retries the provider.
- Exact Pi user/assistant entries can finalize stale journal authority and materialize self-contained Mirror delivery debt.
- The repair route does not require Desktop projection message IDs to match pre-agent harness IDs.
- `Retry Mirror synchronization` replays only durable Mirror delivery.
- Composer availability remains independent from repair success.
- Exact Journey, thread, generation, Pi session, entry and Mirror destination bindings are preserved.
- Contradictory, incomplete or mismatched Pi evidence fails closed.

## Evidence

Private-data-free CR049 sandbox on 2026-09-18:

- baseline Pi leaf before the watched turn: `a72c3802`;
- terminal assistant leaf: `bb452d3f` with `stopReason: stop`;
- watcher observed 12 active entries and sent `SIGTERM`;
- journal remained `running` for `turn-agent-run-2026-09-18T21:30:21.389Z`;
- outbox remained at the three earlier outage turns;
- relaunch reconstructed the terminal response exactly once with no retry and an available Composer;
- explicit repair failed with `mirror_append_message_authority_mismatch`.

The rehearsal archive contains 11 private-data-free app-data files. Ordinary DEV state was restored to the verified 63-file digest `0a9cd312e4a8624c99a12a24bab367f77ccea879159e6fe9abcd794153df3e27`; production was untouched.

## Candidate Plan

1. Add a failing integration fixture for a stale `running` journal record whose exact Pi active branch contains the successful admitted user/assistant pair but whose projection is reconstructed with Pi aliases.
2. Reuse exact Pi inspection/evidence to finalize the stale native turn without consuming projection or Segment content.
3. Materialize a self-contained outbox item using the journal authority plus exact Pi text and entry IDs, preserving Mirror destination binding.
4. Route explicit Mirror repair through that materialized debt before replay.
5. Reject session, generation, ordering, stop-reason, text or destination contradictions.
6. Verify no provider invocation, one durable Mirror append, idempotent replay and non-blocking Composer behavior.
7. Reopen the captured fixture in isolated DEV, restore Mirror, run explicit repair and verify the terminal turn is delivered without rerunning the agent.

## Authority Boundary

CR051 was captured from a product defect in the explicitly authorized CR049 sandbox. Selection, planning approval, Driver, Delivery, implementation, validation, CR049 resumption, push, merge, publication, release, production mutation and RS018 closure remain explicit Navigator decisions.
