# Delivery Story Plan — CV-004.DS-003

**Journey:** nautilus-harness  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Dedicated Turn Integrity

## Objective

Ensure every real Nautilus message advances only the selected Journey's verified active dedicated generation, with exact invocation authority, complete native Pi turn proof, idempotent Harness projection and dedicated Mirror recording, exact-session resume, and model-free recovery of interrupted post-provider checkpoints.

## Child Work Packages

1. `CV-004.DS-003.TS-1` — Dedicated Invocation Authority
2. `CV-004.DS-003.TS-2` — Active Pair Turn Commit
3. `CV-004.DS-003.TS-3` — Internal Recovery Classifier
4. `CV-004.DS-003.US-1` — Resume the Dedicated Conversation
5. `CV-004.DS-003.US-2` — Recover an Interrupted Turn

## Scope

### Exact invocation authority

- Derive each run from the selected Journey's read-back-verified active generation immediately before invocation.
- Bind Journey ID, thread ID, generation, Pi session ID/file, Mirror conversation ID, activation receipt ID, run ID and turn ID.
- Reject absent, inconsistent, closed, stale-generation, cross-Journey or native-ID-mismatched authority before staging a user turn or invoking the provider.
- Keep invocation explicit; focus inspection, classification and repair remain model-free.
- Discard late events unless Journey, thread, generation, run and turn still match.

### Active-pair turn commit

- Add a bounded turn ledger containing native IDs, states, timestamps and reason codes, never prompt or response bodies.
- Preserve Pi authority for transcript, ancestry, context, usage, summarization and compaction.
- Admit only a complete native Pi user/assistant turn from the exact session and run.
- Project a complete Pi turn into Harness once and record the correlated pair into the exact dedicated Mirror conversation once.
- Persist monotonic checkpoints for context accepted, Pi complete, Harness projected and Mirror recorded.
- Treat repeated native evidence idempotently and contradictory evidence as a conflict.

### Internal recovery classifier

Use active-pair states such as:

```text
checking
ready
provider_running
pi_complete
projection_pending
mirror_pending
retrying_projection
retrying_mirror
failed
```

- Composer eligibility depends only on valid active-generation authority and unresolved internal commits.
- External sessions/conversations, legacy parity mappings, recency and text similarity are irrelevant.
- Incomplete Pi output remains inert.
- Complete Pi output with downstream work pending is recoverable without provider invocation.

### Resume

- On selection, restart and focus recovery, inspect only the exact active Pi session and bounded turn ledger.
- Restore complete Nautilus turns once in Pi-native order without a conversation picker.
- Never import external terminal activity into the Nautilus transcript.
- Preserve legacy parity data outside readiness and recovery decisions.

### Interrupted-turn repair

- Show a body-specific action such as **Finish restoring response** or **Finish Mirror recording**.
- Revalidate exact authority before repair.
- Retry Harness projection from complete Pi evidence without provider invocation.
- Retry Mirror recording idempotently against the exact dedicated conversation without provider invocation.
- Keep incomplete or contradictory evidence fail-closed with bounded diagnostics.

## Ordering

```text
TS-1 exact invocation authority
  ↓
TS-2 active-pair commit ledger and checkpoints
  ↓
TS-3 internal recovery classifier
  ↓
US-1 exact-session resume
  ↓
US-2 body-specific model-free repair
```

One aggregate Navigator validation occurs after US-2.

## Failure and Recovery Contract

- Submission is rejected unless authority verifies immediately before staging.
- Provider failure before a complete Pi turn cannot fabricate a recoverable assistant response.
- Once complete Pi evidence exists, provider reinvocation is forbidden for projection or Mirror repair.
- Termination between checkpoints resumes from durable evidence.
- Retry cannot create a second Harness turn or second Mirror message pair.
- Switching Journeys cannot rebind in-flight events or repair actions.
- New turns block only while unresolved active-pair work could violate ordering.

## Non-Goals

- Restarting conversation or creating generation 2; `CV-004.DS-004`.
- Removing dormant parity implementation/files; `CV-004.DS-005`.
- Adopting, merging or reconciling external conversations.
- Tactical or Strategic synthesis publication.
- Concurrent provider execution across Journeys; `DS-009`.
- Reimplementing Pi transcript, branching, compaction, context or usage.
- Persisting prompts, responses, reasoning, tool output, secrets or arbitrary environment values as authority evidence.

## Acceptance Behavior

```text
Given a selected Journey has a verified ready active generation
When the Navigator submits a real message
Then invocation binds the exact thread, generation, Pi session and Mirror conversation
And stale or cross-Journey coordinates are rejected before provider invocation
```

```text
Given the exact Pi session contains one complete correlated native turn
When settlement is observed
Then Harness projects it once and Mirror records it once
And bounded checkpoints become ready without text equality as authority
```

```text
Given Pi completed but Harness projection or Mirror recording was interrupted
When the desktop resumes or the Navigator retries
Then complete native evidence finishes only the missing checkpoint idempotently
And no provider request is made
```

```text
Given another Pi session or Mirror conversation advances
When the dedicated Journey is inspected
Then external activity cannot alter transcript, readiness, composer eligibility or recovery state
```

```text
Given the Navigator switches Journeys while a run settles
When late events arrive
Then they remain confined to their original Journey, generation, run and turn
```

## Expected Implementation Areas

- `src/domain/nautilusJourneyThread.ts`
- a dedicated turn authority/commit domain module
- characterization and dedicated-flow separation in `src/domain/threeBodyTurnCommit.ts`
- `src/agent/piProcessStream.ts`
- `src/app/App.tsx`
- dedicated turn storage and Tauri commands in `src-tauri/src/main.rs`
- supported Mirror logging/inspection adapters
- focused Vitest, Rust and Python tests
- DS implementation and validation evidence

Exact file names may change after characterization. Dormant parity code may remain until DS-005 but cannot authorize the dedicated path.

## Validation Route

1. Characterize Pi settlement, Mirror logger idempotency and current persistence.
2. Prove stale Journey/generation/thread/native-ID rejection.
3. Prove complete Pi turn admission and incomplete-tail rejection.
4. Prove monotonic idempotent body checkpoints.
5. Prove projection and Mirror repair invoke no provider.
6. Run the complete frontend suite/build, Rust tests/check and Python tests.
7. In Tauri, send a real turn, restart/reselect and verify one exact-session restoration.
8. Validate one exact dedicated Mirror record.
9. Interrupt one post-Pi checkpoint and validate the specific repair action.
10. Advance unrelated external activity and confirm no dedicated state change.
11. Switch Journeys during settlement and confirm late-result confinement.

## Implementation Contract

- TDD and characterization tests for native boundaries.
- Provider requests occur only for new real Navigator messages.
- Recovery after Pi completion is model-free.
- Native IDs and ancestry establish authority; names, text, hashes, timestamps and recency do not.
- Persist bounded authority evidence only, never private conversational bodies or reasoning.
- Preserve atomic namespace-confined persistence and fail-closed composer gating.
- Do not absorb DS-004, DS-005 or DS-009 scope.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
