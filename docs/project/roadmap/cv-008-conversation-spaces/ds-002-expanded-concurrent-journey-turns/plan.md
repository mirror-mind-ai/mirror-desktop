# Delivery Story Plan — CV-008.DS-002

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Expanded Concurrent Journey Turns

## Objective

Expand bounded concurrent execution across independent Journeys from measured evidence, make capacity and overflow observable, and preserve exact run authority through Steering, cancellation, failure, settlement, persistence and restart recovery.

## Child Work Packages

- CV-008.DS-002-TS-1 — Characterize Expanded Concurrent Load
- CV-008.DS-002-TS-2 — Establish Bounded Admission and Fairness Policy
- CV-008.DS-002-US-1 — Operate More Independent Journey Turns
- CV-008.DS-002-TS-3 — Preserve Authority Under Expanded Concurrency

## Planning Decisions

- The intended supported production capacity is exactly four admitted Journey leases, doubling the current capacity of two while remaining deliberately bounded. Four is the product's ideal capacity for this horizon, not an intermediate step toward a larger predetermined number.
- Capacity four remains a candidate until it passes deterministic and isolated development evidence. If it does not pass, implementation stops for a scope decision rather than silently selecting another limit.
- Growth above four requires a future demonstrated product need and separately governed work with new resource and authority evidence; this Delivery Story creates no automatic scaling path.
- One Journey may still own at most one reserved, running or finalizing lease. This Delivery Story does not introduce concurrent turns inside one Journey or conversation.
- An admitted slot remains occupied through `finalizing` until durable projection, outbox enqueue, exact cleanup and fresh native reinspection complete. Child-process exit alone does not free admission.
- Overflow uses immediate explicit refusal. The app retains the draft for deliberate retry but does not queue prompts, start them later, or retry automatically.
- Fairness means one lease per Journey, no hidden priority, no bypass of the atomic native reservation boundary and equal eligibility after a slot becomes free. This story does not claim scheduled FIFO fairness because it introduces no waiting queue.
- Steering uses the writable stdin of its existing exact Pi process. It consumes no additional slot, but its effect on occupancy duration and settlement must be included in characterization.
- Production capacity is not user-configurable and has no environment override. Tests may inject only bounded rollback and candidate capacities.
- Ordinary occupancy remains implicit in existing owner-specific Journey states. There is no global process counter. Presentation becomes explicit only when inspection is uncertain or a send reaches the full-capacity refusal condition, and it must not expose another Journey's prompt, response, provider configuration, paths or conversation content.
- Existing `RunAuthority`, process-event authority, turn journal, generation projection and Mirror outbox contracts remain authoritative. No persistence schema change is planned.

## Scope

### CV-008.DS-002-TS-1 — Characterize Expanded Concurrent Load

- Add a private-data-free repeatable probe for capacities two and four using bounded synthetic process, event and settlement seams.
- Exercise reservation, live streaming, terminalization, finalizing leases, cleanup, reinspection and shutdown across four distinct Journey authorities.
- Measure process count, completion duration, frontend state-update duration and host CPU/RSS during an isolated `Mirror Desktop Dev` four-Journey run.
- Include one Steering message during concurrent execution and confirm that it extends only its owning lease without increasing registry occupancy.
- Record the method, environment, measurements and decision in a DS-owned characterization artifact without committing prompts, conversation bodies, credentials, private paths or production data.
- Require all four runs to settle or become honestly interrupted, registry occupancy to return to zero, no deadlock or unbounded process growth, and the app to remain navigable and draft-editable. Failure blocks the capacity change.

### CV-008.DS-002-TS-2 — Establish Bounded Admission and Fairness Policy

- Generalize native registry and shutdown bounds from the duplicated capacity-two assumptions to the single approved production capacity of four.
- Keep the existing internal hard maximum bounded and reject zero or excessive limits.
- Update frontend inspection validation to accept only the supported rollback/current values needed by this delivery, with exact entry, capacity and duplicate-authority validation.
- Preserve atomic native reservation as the final time-of-check/time-of-use authority.
- Preserve one lease per Journey and count finalizing entries against admitted capacity even after process capacity is released.
- Define stable admission reasons for unknown inspection, same-Journey occupancy and global capacity reached.
- Keep overflow side-effect free: no process, turn, message, generation, queue entry or background retry survives a rejected reservation.

### CV-008.DS-002-US-1 — Operate More Independent Journey Turns

- Let the Navigator start up to four independently admitted turns in distinct Journeys and continue navigating and editing drafts while they run.
- Preserve existing owner-specific sidebar runtime state without adding a global process or turn counter.
- Keep full-capacity refusal visible and actionable until capacity changes or the Navigator retries; retain the unsent draft.
- Preserve exact selected-Journey cancellation.
- Avoid notifications or status noise during ordinary partial occupancy or when occupancy is zero.

### CV-008.DS-002-TS-3 — Preserve Authority Under Expanded Concurrency

- Prove that four-way event dispatch, streaming projection, terminal evidence, turn-journal transitions, persistence coordination and Mirror outbox work remain Journey-keyed and run-keyed.
- Exercise one successful run, one Steered run, one targeted cancellation and one provider/process failure concurrently; each sibling must preserve its own state and terminal truth.
- Exercise cancellation after navigation so captured identity, not current selection, controls the child.
- Exercise partial settlement failure and confirm that a retained finalizing lease blocks only its exact admitted slot while siblings continue independently.
- Exercise restart recovery with multiple journal records. Dead children become exact durable interruptions; terminal-durable records resume only their own projection/outbox work; no child, turn or prompt is replayed.
- Preserve first-terminal-wins behavior, stale-event quarantine and exact replacement-run protection at capacity four.

## Non-Goals

- Unlimited, provider-determined or dynamically resource-scaled concurrency, or any planned capacity growth above four.
- A user-facing capacity setting or environment override.
- A prompt queue, automatic retry, queue editing, prioritization or background send.
- More than one active or finalizing turn in the same Journey or conversation.
- Sharing one Pi process, session, transcript, projection or Mirror conversation across Journeys.
- Changes to Steering ordering, acceptance/application truth or text-only scope.
- Conversation pagination, virtualization, splitting, compaction or persistence migration.
- New provider rate-limit orchestration, remote workers, multi-user scheduling or cloud execution.
- Reworking Journey administration, attachments, persona spaces, multiple conversations or voice composition.
- Production-data fixtures, production screenshots or logs.

## Acceptance Behavior

```text
Given Mirror Desktop has four ready Journeys and no admitted runs
When the Navigator starts one turn in each Journey
Then all four turns are admitted through exact native authority
And each owning Journey shows its existing active state without a global process counter
And navigation and draft editing remain available
And every event, Steering message, cancellation, terminal outcome and persisted result remains attached to its owning Journey and run

Given all four admitted slots are occupied
When the Navigator attempts a turn in a fifth Journey
Then admission is refused explicitly
And the draft remains available for deliberate retry
And no process, message, turn, generation or queued request is created for the rejected attempt

Given one concurrent run is Steered, one is cancelled, one fails and one completes
When their terminal and settlement work interleave
Then each Journey reaches only the outcome supported by its exact evidence
And no sibling transcript, diagnostic, runtime state, journal record or Mirror outbox item is changed by another run

Given an admitted run has terminated but its durable finalization is incomplete
When another Journey requests the occupied slot
Then the finalizing lease still counts against the four-slot admission bound
And the slot becomes available only after exact cleanup and fresh native reinspection

Given the app restarts with multiple unfinished journal records
When model-free recovery runs
Then each record is recovered or interrupted independently under exact authority
And no dead Pi process or prompt is silently resumed or replayed
```

## Validation Route

E2E validation is required because the Delivery Story changes real process capacity and cross-Journey interaction.

Automated validation must include:

- Rust registry tests for capacity four, fifth-admission refusal, duplicate-Journey refusal, simultaneous reservation races, first-terminal behavior, finalizing occupancy, exact cancellation, stale targets and four-child bounded shutdown.
- TypeScript tests for inspection limits, internal occupancy counts, admission reasons, absence of an ordinary process counter, draft-preserving overflow and unchanged sibling runtime state.
- Integration tests for four exact authorities with interleaved events, Steering, cancellation, provider failure, settlement failure and restart recovery.
- Existing complete frontend and Rust suites, frontend production build, `cargo check --locked`, roadmap consistency and whitespace checks.

Navigator validation runs only in isolated `Mirror Desktop Dev` with bundle identifier `ai.mirrormind.desktop.dev` and non-production Mirror/app-data roots. The route uses four disposable development Journeys, starts four observable turns, Steers one, navigates among them, confirms a fifth send is refused with its draft preserved, cancels one exact run, observes independent settlement and relaunches to verify durable recovery. The pass condition is responsive navigation and drafting, exact four-slot occupancy, honest owner-specific outcomes, no cross-Journey leakage and clean admission after settlement. Any mixed transcript, retargeted cancellation, lost draft, hidden overflow, stale working state, deadlock, replay or protected-data mutation fails validation.

The characterization artifact records hardware/runtime versions, measurements and sanitized observations. It must not retain production conversation content or private filesystem coordinates.

## Expected Files

Likely implementation and evidence surfaces include:

- `src-tauri/src/pi_process_registry.rs`
- `src-tauri/src/main.rs`
- `src/app/piInvocationOccupancy.ts`
- `src/app/App.tsx`
- `src/tests/piInvocationOccupancy.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- focused frontend concurrency, settlement, Steering and restart tests
- Rust process-registry tests
- this Delivery Story's child packages, characterization evidence and validation guide
- `docs/architecture/app-architecture.md`
- `docs/architecture/pi-local-process-boundary.md`

The exact file set may narrow during implementation. Expanding into unrelated product areas requires a new Navigator scope decision.

## Implementation Contract

- Follow TDD for every behavior change. Each child package begins with a failing focused test or characterization probe before production behavior changes.
- Deliver children in this order: TS-1, TS-2, US-1, TS-3. Keep each child as a traceable evidence unit under the approved aggregate DS Plan.
- Do not raise production capacity until TS-1 evidence supports four concurrent Journey leases. Stop on failed evidence rather than weakening thresholds or expanding scope.
- Preserve exact Journey, thread, conversation, generation, Pi session, run, turn and Harness message authority across native commands, events and persistence.
- Keep one Pi process per admitted run. Steering must reuse that process and must never consume another slot.
- Keep native reservation authoritative. Frontend occupancy is bounded presentation and fail-closed admission guidance, not permission to bypass native checks.
- Keep all locks bounded and avoid child control, joins, event emission, filesystem work or remote Mirror calls while holding the registry mutex.
- Preserve complete durable conversation history, turn-journal evidence, outbox idempotency and existing restart semantics.
- Use only isolated development data for natural validation. Do not alter the user-channel app, production Mirror home, `memory.db`, identity, credentials, Journeys, conversations or attachments.
- Update architecture and story evidence with the implemented contract.
- Plan approval authorizes local implementation only. Navigator validation acceptance, debt disposition, Done/history, commit, push, publication and release remain separate boundaries.

## Rollback

A one-line private production-capacity change back to two remains the operational rollback. Correlated commands, four-capable bounded data structures, exact authority, actionable refusal presentation and tests remain intact. Rollback must not require persistence migration or deletion of Journey state.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
