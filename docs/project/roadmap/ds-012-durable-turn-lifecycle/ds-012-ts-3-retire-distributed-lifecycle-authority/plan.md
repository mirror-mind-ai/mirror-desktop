[< Story](index.md)

# Plan — DS-012.TS-3 Retire Distributed Lifecycle Authority

**Plan state:** validated for local implementation
**Capacity gate:** remains exactly 1

## Objective

Complete the serial cutover by making the durable turn journal the only lifecycle decision source. React, the event dispatcher, the native registry, the local conversation projection and the Mirror outbox remain adapters with narrow responsibilities; none may independently choose terminal outcome, restart disposition or successor eligibility.

## Authority Inventory And Disposition

| Existing decision point | Current role | TS-3 disposition |
|---|---|---|
| Pi stream `cancelled` / `error` / `done` events | React chooses terminal branch | Events remain presentation/transport only; exact journal terminal outcome chooses completed, cancelled or failed settlement. |
| Pi JSONL transcript read during finalization/restart | React infers completion and execution evidence | Replace lifecycle use with journal-owned terminal `piExecution`; transcript remains Pi context/history evidence only. |
| Frontend occupancy preflight and committed-lease cleanup | Lease snapshot can block or enable admission | Remove as admission authority. Native registry enforces live capacity; the journal enforces durable Journey eligibility. |
| Projection pending-turn classification | Can fabricate restart interruption or completion | Projection supplies visible message slots only. Recovery requires an exact journal record and disposition. Journal-free legacy gaps remain explicit and are not inferred. |
| Dispatcher closed-route ledger | Can appear to decide whether a turn is alive | Retain only bounded transport quarantine. Route closure cannot settle, recover or admit a turn. |
| Registry terminal/cancellation state | Can appear canonical | Registry remains exact child control. Cancellation intent is journaled before child control; terminal registry state must be adopted into the journal before `done`. |
| Raw stdout/stderr capture | Contains prompt, event protocol, encrypted reasoning or non-contract diagnostics | Persist only bounded final assistant output, truncation state and exact Pi execution IDs/count/timestamps. |

## Implementation Slices

1. **Journal selectors and exact lookup**
   - Add exact-authority record lookup and terminal/recovery classification as pure functions.
   - Reject journal/projection or journal/event disagreement as bounded diagnostics.

2. **Terminal and settlement cutover**
   - On native `done`, read the exact journal record before normalizing or selecting a settlement branch.
   - Use journal-owned Pi execution evidence for local commit; stop using Pi transcript reconstruction for lifecycle.
   - Preserve streaming output only as presentation.

3. **Restart cutover**
   - Resume only an exact journal record.
   - Terminal-durable completion resumes projection/outbox from journal evidence.
   - Admitted/running without an exact live child advances durably to interrupted.
   - A projection with no journal remains an explicit legacy gap and is not silently completed or interrupted.

4. **Admission and cancellation cutover**
   - Remove frontend occupancy/projection heuristics as admission gates.
   - Keep draft preservation and native reservation as the atomic capacity boundary.
   - Persist exact cancellation intent before directed child cancellation.

5. **Evidence minimization and compatibility retirement**
   - Stop storing raw Pi protocol stdout/stderr in terminal records while retaining read compatibility for local pre-TS-3 journal records.
   - Remove superseded committed-lease preflight and transcript-lifecycle helpers.
   - Keep DS-009 exact authority, targeted control, route quarantine and Journey-keyed presentation characterization.

## Invariants

- `RunAuthority` remains immutable and `piSessionFile` remains private.
- Selected Journey never supplies settlement, cancellation, recovery or persistence authority.
- A journal transition must precede any lifecycle consequence it authorizes.
- Durable outbox enqueue permits a successor even while Mirror append is pending.
- Registry capacity remains 1 throughout TS-3.
- No Mirror runtime or production data change is required.

## Stop Conditions

Stop implementation on unexplained journal/projection divergence, need to reconstruct authority from Pi JSONL, loss of draft rollback, stale callback mutation, sibling regression, production-coordinate contact or requirement to restore capacity two early.
