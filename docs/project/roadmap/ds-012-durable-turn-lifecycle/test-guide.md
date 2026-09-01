[< Story](index.md)

# Test Guide — DS-012 Durable Turn Lifecycle

## Testing Principle

Desktop E2E smoke is a scarce, intrusive validation instrument. It is required only when the changed behavior crosses a real desktop boundary that deterministic domain, native, persistence or integration tests cannot prove. It is not a ritual after every story.

The Driver must prefer focused automated evidence, durable state inspection, bounded native diagnostics and fault injection. When desktop interaction is necessary, scenarios are batched into the smallest useful session. The Navigator is told beforehand what will run, how long it is expected to occupy the computer and whether screenshots or screen control are required.

## Focused Automated Validation

Run focused frontend tests while developing the affected boundary:

```bash
npm test -- src/tests/<affected-test>.test.ts
```

Run focused Rust tests while developing native journal, process or persistence behavior:

```bash
cd src-tauri
cargo test <affected_test_name>
```

Run the full suites at child completion and aggregate checkpoints:

```bash
npm test
npm run build
cd src-tauri
cargo test
cargo check
```

Use the channel-specific build only at milestones that require a desktop bundle:

```bash
npm run tauri:build:dev
```

## Transition Contract Matrix

Automated tests must cover:

- every valid monotonic phase transition;
- exact duplicate transition convergence;
- divergent idempotency-key reuse rejection;
- stale run, Journey, generation and expected-phase rejection;
- outcome, cancellation, delivery checkpoint and recovery fields remaining orthogonal;
- immutable terminal outcome under repeated or late events;
- bounded record and terminal-evidence retention without eviction of active recovery authority;
- per-Journey serialization without global settlement locking.

## Native Terminal Frontier Matrix

Fault-injection tests must prove:

- reservation succeeds before spawn;
- spawn failure produces one durable terminal outcome;
- bounded final output and exact terminal authority persist before lifecycle-closing done;
- frontend loss after terminal persistence does not lose the result;
- done, cancel, process death and shutdown races choose one terminal outcome;
- stale callbacks cannot mutate a replacement run;
- lease release cannot precede its required durable journal checkpoint;
- process capacity and Journey ownership remain distinct where required;
- private paths, prompts, provider configuration and secrets stay out of public event evidence.

## Projection And Outbox Matrix

Automated integration tests must prove:

- journal-owned turn identity maps to the exact local user and assistant messages;
- local projection is idempotent for exact replay;
- projection failure leaves a journal checkpoint that restart can resume;
- outbox enqueue occurs only from exact durable projection evidence;
- outbox conflict, overflow or unavailable storage fails closed without losing terminal evidence;
- Mirror append can remain pending after durable enqueue without retaining native execution capacity;
- acknowledgement cannot regress or cross conversations;
- authority-free saves cannot omit later turns or committed receipts;
- Pi JSONL is never used as destination or message authority.

## Restart Frontier Matrix

A deterministic restart harness must stop and resume at least these frontiers:

```text
admitted before reservation
reserved before spawn
running before terminal output
terminal durable before local projection
projection durable before outbox enqueue
outbox durable before Mirror append
Mirror receipt durable before acknowledgement
acknowledged before UI observes completion
cancel requested before terminal choice
interrupted with no live child
```

For every frontier, restart must expose one exact state and one safe next operation. It must not fabricate a child, route, turn, message, generation, terminal outcome or delivery receipt.

## Sequential Reliability Gate

Before any return to capacity two, automated tests must run repeated same-Journey turns through the real coordinator adapters and prove:

- each successor starts only after the prior durable eligibility checkpoint;
- no active-route conflict appears;
- no retained lease survives a settled turn;
- no message disappears or returns silently;
- terminal output, local projection and Mirror outbox IDs remain exact;
- failed or interrupted turns expose a bounded visible action and do not poison unrelated future runs after durable disposition.

The repeated-turn count and fault seed must be deterministic and recorded by the US-1 child plan. A high count is not a substitute for frontier coverage.

## DS-009 Isolation Gate

Before restoring capacity two, retain and extend characterization coverage for:

- exact `RunAuthority` construction;
- central event routing and bounded late-event quarantine;
- Journey-keyed runtime state;
- directed cancellation and cleanup by `journeyId + runId`;
- sibling byte, projection, outbox and provider-lifetime isolation;
- per-Journey persistence serialization;
- shutdown of at most two exact registered children;
- model-free restart with no restored child handles or phantom working state.

After capacity two returns, deterministic interleavings must cover A running while B settles, A cancels while B completes, A restarts while B remains visible, and late A events after B acknowledgement.

## Batched Desktop Smoke Policy

### Serial and recovery smoke

Run once in Nautilus Harness Dev after US-2, not after TS-1, TS-2 or US-1 independently.

Batch these observations into one short session:

- send two sequential messages in one disposable DEV Journey;
- verify the second is admitted without restart, retained lease or active-route warning;
- interrupt or close the DEV app only at the approved recovery frontier;
- reopen and verify one exact recoverable or completed turn state;
- send a successor after recovery;
- inspect DEV journal, local projection and outbox evidence.

Prefer state files, logs and native inspection over screenshots. Capture a screenshot only if a user-visible state is itself the acceptance evidence.

### Capacity-two isolation smoke

Run once after US-3 and all automated isolation checks pass.

Batch these observations into one short session:

- start one bounded turn in Journey A and one in Journey B;
- navigate A to B to A without changing ownership;
- allow one to complete while the other remains active;
- exercise one targeted cancellation only if automated evidence cannot cover the desktop control boundary;
- verify exact local projection and outbox ownership;
- leave stable app-data and production Mirror untouched.

Do not repeat the smoke because of unrelated documentation, styling or pure-domain changes. Repeat only when a failure invalidates the evidence or a later change touches the same unproven desktop boundary.

## Navigator Coordination

Before a smoke session, report:

- exact scenarios;
- expected duration;
- whether the mouse, keyboard or screenshots will be used;
- which DEV Journeys and isolated coordinates are involved;
- the stop condition if unexpected production identity appears.

The Navigator may schedule the session. No smoke begins merely because a build completed.

## Pass Condition

All required automated matrices pass; both scheduled DEV smoke milestones are accepted; repeated sequential sends, restart recovery and capacity-two isolation use the same coordinator path; no lifecycle authority remains inferred from selected Journey or stale frontend snapshots; and production remains untouched.

## Fail Condition

Any result exists only in Pi transcript after terminal completion; any settled turn retains a lease or route that blocks its successor; restart requires transcript reconstruction; a stale or sibling event mutates current state; capacity exceeds two; Technical Stories repeatedly require screen control without an unautomatable acceptance reason; or validation touches production state.

## Validation Evidence

Pending implementation and Navigator Validation.
