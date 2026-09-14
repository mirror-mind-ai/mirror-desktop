[< Story](index.md)

# Test Guide — CV-008.DS-002

## Purpose

Validate that Mirror Desktop can admit exactly four independent Journey turns while preserving bounded resource ownership, observable overflow and exact Journey/run authority through Steering, cancellation, failures, settlement, persistence and restart recovery.

## Aggregate Validation

The Delivery Story passes only when deterministic tests and an isolated `Mirror Desktop Dev` exercise agree on the same contract:

- production capacity is exactly four admitted Journey leases;
- one Journey owns at most one reserved, running or finalizing lease;
- a finalizing lease occupies admission until exact cleanup and reinspection;
- a fifth Journey is refused immediately without side effects and keeps its draft;
- Steering uses the owning process and consumes no additional slot;
- sibling events, diagnostics, projections, journals and outbox entries remain isolated;
- shutdown and restart remain bounded and model-free.

## Child Work Packages

### CV-008.DS-002-TS-1 — Characterize Expanded Concurrent Load

Run the private-data-free load probe at capacities two and four. Record:

- hardware, operating system, Mirror Desktop revision, Pi version and Mirror runtime revision;
- admitted, running and finalizing counts over time;
- maximum observed Pi child count;
- total completion and settlement duration;
- frontend state-update duration under interleaved events;
- sampled host CPU and RSS;
- registry and process state after cleanup;
- Steering effect on the owning run and internal registry occupancy.

Pass when all four authorities complete or interrupt honestly, child count never exceeds four, registry occupancy returns to zero after exact cleanup, no process or lock deadlocks, navigation and draft editing remain usable and no cross-Journey mutation is observed. If capacity four fails, stop before changing the production constant.

### CV-008.DS-002-TS-2 — Establish Bounded Admission and Fairness Policy

Automated checks cover:

- four distinct reservations succeed;
- a fifth distinct Journey receives `CapacityReached`;
- a duplicate Journey receives `DuplicateJourney` at every lease phase;
- simultaneous reservation races produce at most four winners;
- terminalization releases process capacity once but finalizing lease occupancy remains admitted;
- cleanup removes only the exact `journeyId + runId`;
- stale cleanup and cancellation cannot affect a replacement run;
- shutdown attempts all four captured children outside the registry lock;
- frontend inspection accepts supported rollback/current limits and rejects malformed, excessive, duplicate or inconsistent projections;
- unknown or ambiguous inspection fails closed;
- overflow creates no durable or live execution residue.

### CV-008.DS-002-US-1 — Operate More Independent Journey Turns

Component and integration checks cover:

- no global process counter during partial or full occupancy;
- no unnecessary occupancy noise while free or below the bound;
- explicit English-only full-capacity notice after an affected send;
- fifth-Journey draft remains editable and available for retry;
- selection and navigation do not change admission authority;
- per-Journey sidebar state remains owner-specific;
- selected exact cancellation remains available while siblings continue;
- another Journey's prompt, response, provider or path never enters the refusal presentation.

### CV-008.DS-002-TS-3 — Preserve Authority Under Expanded Concurrency

Use four exact authorities with deliberately interleaved activity:

- Journey A completes normally;
- Journey B receives and applies one Steering message through its existing Pi process;
- Journey C is cancelled after navigation changes;
- Journey D experiences controlled provider or process failure.

Assert that each process event, runtime reduction, terminal evidence, conversation projection, turn-journal transition, outbox operation and diagnostic remains owner-bound. Add controlled settlement failure for one owner while siblings continue, then prove exact retry and cleanup. Exercise restart with multiple journal records and prove that dead live children become durable interruptions, terminal-durable records resume only model-free projection/outbox work and no prompt or child is replayed.

## Focused Automated Commands

Run focused tests while developing each child, including the affected suites:

```bash
npm test -- src/tests/piInvocationOccupancy.test.ts \
  src/tests/journeyRuntimeIntegration.test.ts \
  src/tests/journeyRuntimeState.test.ts \
  src/tests/journeySettlement.test.ts \
  src/tests/journeySettlementRecovery.test.ts \
  src/tests/steeringState.test.ts

cd src-tauri
cargo test --locked pi_process_registry
```

Add newly created concurrency characterization, presentation or integration suites to the focused command.

## Complete Automated Gates

Before Navigator validation:

```bash
npm test
npm run build
npm run roadmap:check
git diff --check

cd src-tauri
cargo test --locked
cargo check --locked
```

All checks must pass. A flaky race, timeout, leaked child, stale lease, malformed inspection acceptance or owner-mismatch failure blocks validation.

## Isolated Development Build

Build only the isolated development identity:

```bash
npm run tauri:build:dev
```

Verify:

```text
Application: Mirror Desktop Dev
Bundle ID: ai.mirrormind.desktop.dev
Mirror runtime/home/database: development channel only
```

Do not install or overwrite the user-channel application. Do not use production Journeys, conversations, screenshots, logs or data as test material.

## Navigator Validation

Use four disposable development Journeys with distinguishable bounded prompts.

1. Start one sufficiently observable turn in each Journey and navigate among them while output continues.
2. Confirm all four sidebar rows reflect only their own runs, drafts remain responsive and no global process counter appears.
3. In a fifth development Journey, attempt Send. Confirm explicit capacity refusal, no placeholder or run is created and the draft remains ready for deliberate retry.
4. Steer one of the original runs. Confirm the correction is accepted/applied under its exact authority and does not admit another process or create counter UI.
5. Navigate away from another running Journey and cancel it. Confirm only that exact run is interrupted.
6. Allow remaining runs to settle, including any controlled development-only failure used by the validation route. Confirm outcomes and conversation history remain owner-correct.
7. Relaunch the development app after a bounded unfinished-state scenario. Confirm independent journal recovery, honest interruption where no child survives and no prompt replay.
8. After exact cleanup, confirm the preserved fifth-Journey draft can be sent deliberately and no stale capacity refusal remains.

## Expected Observation

The desktop remains navigable and draft-editable with four concurrent Journey turns. Each Journey communicates its own state without a global process counter; the fifth turn is refused without loss, Steering consumes no additional slot, cancellation and failures affect only their exact owners, and settlement/restart recovery preserve terminal truth.

## Pass Condition

Navigator explicitly accepts the isolated development behavior, all automated gates pass, characterization supports capacity four and no protected data or authority boundary is changed.

## Fail Condition

Any of the following fails the Delivery Story:

- more than four admitted leases or Pi children;
- more than one admitted lease for a Journey;
- hidden queueing, automatic retry or draft loss;
- cross-Journey event, transcript, diagnostic, journal or outbox mutation;
- Steering consuming another slot or targeting a sibling;
- cancellation retargeted by navigation;
- finalizing occupancy reported free before exact cleanup and reinspection;
- deadlock, leaked child, stale permanent Working state or replay after restart;
- frontend acceptance of malformed or excessive occupancy evidence;
- user-channel or production Mirror/app-data mutation.

## Implementation Evidence

```text
Focused process-counter removal and four-owner tests: 48 passed
Focused native process-registry tests: 24 passed
Complete frontend suite: 717 passed across 131 files
Complete Rust suite: 117 passed
Frontend production build: passed
cargo check --locked: passed
Roadmap consistency: passed
Whitespace check: passed
Mirror Desktop Dev release-mode bundle: passed
```

The build retains the existing Vite chunk-size advisory. `cargo fmt --check` is not a repository gate and reports unrelated pre-existing formatting drift outside this Delivery Story; modified Rust behavior compiles and passes focused plus complete native suites.

## Validation Evidence

Record sanitized characterization results, automated command output summaries, development bundle identity and Navigator acceptance in the Delivery Story validation artifact. Natural Navigator validation is still required. Do not commit production conversation content, credentials, private paths, screenshots or raw logs.
