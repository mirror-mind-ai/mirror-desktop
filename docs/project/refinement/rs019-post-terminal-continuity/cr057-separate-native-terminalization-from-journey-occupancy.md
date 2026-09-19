[< RS019](index.md)

# CR057: Separate Native Terminalization from Journey Occupancy

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs019-cr057-terminal-occupancy-release`

## Problem

The native Pi process registry currently stores `reserved`, `running` and `finalizing` entries in the same Journey-keyed map. `terminalize()` correctly releases process capacity, clears the child handle and records a non-open terminal state, but it leaves the entry at `leasePhase: finalizing` until the frontend completes settlement and calls exact lease cleanup.

Frontend admission then rejects a Journey whenever any registry entry exists:

```text
state.entries.some(entry => entry.authority.journeyId === journeyId)
→ same_journey_occupied
```

As a result, projection save, journal advancement, outbox materialization, Mirror append or acknowledgement failure can prolong `finalizing` indefinitely and block the next user turn even though:

- the Pi process is no longer active;
- process capacity is already released;
- terminal outcome is exact;
- the response is preserved in Pi JSONL.

Relaunch removes the process-local registry and restores availability without changing durable evidence. This proves that the retained finalizing entry is cleanup debt, not execution occupancy.

## Expected Behavior

A Journey is occupied only by an exact open native reservation or running process. Once terminalization establishes a non-open terminal state and releases the child/process capacity, the entry no longer blocks same-Journey admission.

Finalization debt may remain inspectable for exact cleanup and diagnosis, but it must not prevent a successor. Starting or cleaning up a successor must be safe if older terminal finalization debt still exists. A late cleanup request for the older run must never remove or alter the newer active run.

## Plan Or Decision

### Proposed Scope

1. Characterize the current registry boundary
   - Add failing native and frontend tests for `finalizing + released + completed/cancelled/spawn_failed/process_died` entries.
   - Prove that these entries currently produce `same_journey_occupied` despite zero active process capacity.
   - Cover restart equivalence without relying on actual production state.

2. Separate occupancy from terminal finalization
   - Define active Journey occupancy as exact `reserved/open` or `running/open` state only.
   - Preserve terminal finalization evidence in a bounded exact structure or state that remains inspectable without occupying the Journey.
   - Permit a successor reservation after terminalization without discarding the older run's journal or transcript evidence.

3. Protect cross-run cleanup
   - Ensure cleanup for an older terminal run returns exact `released`/`already_released` semantics without touching a newer run for the same Journey.
   - Ensure stale terminal callbacks cannot terminalize, release or replace a successor.
   - Keep global process-capacity accounting tied only to reserved/running processes.

4. Narrow frontend native admission
   - Make `derivePiInvocationAdmission()` classify only active entries as `same_journey_occupied`.
   - Keep unknown inspection and real global capacity fail-closed.
   - Present terminal finalization debt as diagnostic/recovery state, not native occupancy.

5. Preserve settlement compatibility
   - Keep existing exact settlement and lease-release callers working or migrate them to the separated finalization representation.
   - Do not yet remove journal-derived `localAdmissionReady`; CR058 owns that independent frontend gate.

### Likely Affected Files

- `src-tauri/src/pi_process_registry.rs`
- `src-tauri/src/main.rs`
- `src/app/piInvocationOccupancy.ts`
- `src/app/journeySettlementRecovery.ts`
- `src/app/App.tsx` only where native occupancy/finalization presentation is derived
- `src/tests/piInvocationOccupancy.test.ts`
- focused Rust registry/invocation tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- `reserved/open` and `running/open` exact entries block another run for the same Journey.
- Unknown native inspection remains blocking.
- Terminal entries with released process capacity do not produce `same_journey_occupied`.
- Completed, cancelled, spawn-failed and process-died terminalization all release Journey occupancy.
- A successor can reserve and start while older finalization debt remains unresolved.
- Late cleanup for the older run cannot remove, terminalize or mutate the successor.
- Global capacity counts only reserved/running process capacity.
- Exact terminal evidence remains inspectable and bounded until cleanup completes or is safely retired.
- No projection, journal, Segment, outbox or Mirror file is mutated merely to admit the successor.
- No provider is retried implicitly.

### Validation

- TDD with focused Rust registry tests first.
- Focused TypeScript occupancy/admission tests.
- Native integration tests for terminal callback, successor reservation and stale cleanup ordering.
- Complete Rust suite and `cargo check --locked`.
- Complete frontend suite, TypeScript and production web build.
- `npm run roadmap:check` and `git diff --check`.
- Isolated development-app rehearsal: complete a turn, force post-terminal settlement failure and send a successor without relaunch.
- Stop for explicit Navigator Validation before closure, push, publication or production-data recovery.

### Exclusions

- No removal of journal-derived `localAdmissionReady`; CR058 owns that.
- No redesign of projection/outbox/Mirror finalization ordering; CR059 owns that.
- No production app-data mutation or manual repair.
- No provider error text rendering; CR054 remains separate.
- No Settings model-clarity work; CR053 remains separate.
- No release preparation or publication.

### Reversibility

The change preserves terminal evidence and narrows only occupancy authority. If overlap validation fails, the admission classifier and registry representation can be reverted without migrating Pi JSONL, journal, projections, outbox or Mirror data.

### Authority Boundary

The Navigator authorized creation of RS019, selection of CR057, Driver `@alissonvale`, Delivery `refinement/rs019-cr057-terminal-occupancy-release`, preparation, implementation, isolated DEV rehearsal, formal Validation, proportionality/debt review and terminal closure. Push, merge, publication, release, production mutation and selection of successor work remain separate decisions.

## Evidence

- Post-alpha.12 screenshot and read-only production inspection captured in CR056.
- Exact latest record: `terminal_durable`, `completed`, fresh Pi evidence, `resume_projection`.
- Process-local finalizing lease remained visible with released process capacity.
- Relaunch restored successor availability without changing the Pi transcript or repairing the stale projection.
- `PiProcessRegistry::terminalize()` sets `Finalizing` after releasing capacity.
- `derivePiInvocationAdmission()` previously rejected when any same-Journey registry entry existed.
- TDD now proves all four terminal outcomes (`completed`, `cancelled`, `spawn_failed`, `process_died`) release same-Journey occupancy while retaining inspectable finalization evidence.
- Native reservation retires terminal finalization debt only when a successor/capacity needs its slot and remembers the exact released target; late cleanup returns `already_released` without touching the successor.
- Frontend admission and active-run correlation now classify only exact `open + reserved/running` entries as active execution; unknown inspection and true active capacity remain fail-closed.
- Native Conversation deletion and Pi-backed delivery-recovery gates use the same active-execution classification instead of treating terminal debt as a child.
- Focused validation: 58 TypeScript tests and 25 Rust registry tests passed.
- Complete validation: 851 frontend tests across 155 files passed; TypeScript/Vite production build passed; 155 Rust tests passed with 1 ignored fixture; `cargo check --locked`, roadmap consistency and whitespace checks passed.
- Authorized isolated DEV rehearsal passed on disposable Journey `us1-rerun-a-0831us1-rerun-a-0831` in one unrestarted debug-app process (`PID 68014`):
  - run `agent-run-2026-09-19T20:17:46.894Z` completed after an exact child (`PID 70991`) executed `sleep 15` and produced `CR057 FIRST`;
  - temporary DEV-only projection-directory mode `500` forced `dedicated_projection_unavailable`, leaving the run at `terminal_durable / completed / resume_projection` while the Composer became available;
  - after restoring the original directory mode `755`, the same window admitted successor `agent-run-2026-09-19T20:18:55.279Z` without relaunch and rendered `CR057 SECOND`;
  - the successor reached `settled / completed / complete`; the older run advanced independently to bounded `outbox_enqueued / completed / complete` debt;
  - final direct DEV child count was zero and the DEV process chain was stopped explicitly.
- Rehearsal artifacts are under `/tmp/rs019-cr057-dev-20260919T200538Z/`, including pre-successor journal authority, post-successor journal state and screenshots of the failure and settled successor.
- Stable app data remained byte-identical across 135 files (`49fecded26a17aac699014f8e81b996df4e9575ade5051efb1df1b290e7d334b`). Production Mirror remained unchanged at 984 conversations and 44,159 messages. Release state and remote repository state were not mutated.

## Proportionality and Debt Review

**Result:** `no_action`

- The implementation changes only native occupancy classification, bounded finalization retirement, stale cleanup idempotency and the frontend/native consumers that previously equated every registry entry with active execution.
- It adds no persistent schema, migration, runtime setting, environment switch, provider retry, provider/model selection, credential inference, queue or background scheduler.
- The released-target ledger remains bounded at twice the governed registry limit; stale callbacks and cleanup retain exact `journeyId + runId` comparison and cannot mutate a replacement.
- Unknown or malformed inspection remains fail-closed, while all four exact terminal outcomes become non-occupying only after process capacity is released.
- The DEV proof exercised the intended user-visible boundary with a real Pi child and forced secondary persistence failure, rather than relying only on presentation state.
- Journal admission authority removal and broader run-scoped settlement ordering remain intentionally sequenced CR058 and CR059 scope. They are not hidden CR057 implementation debt.
- No proportionality reduction or follow-up correction is required before terminal closure.

## Outcome

Done. The Navigator accepted Validation, the proportionality/debt review concluded `no_action`, and terminal closure was explicitly authorized. Native terminalization now releases Journey occupancy while preserving bounded finalization evidence and exact successor-safe cleanup. Push, merge, publication, release, production repair and CR058 execution are not authorized.
