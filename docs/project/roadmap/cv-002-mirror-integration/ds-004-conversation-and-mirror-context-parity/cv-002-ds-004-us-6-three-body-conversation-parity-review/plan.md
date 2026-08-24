# Plan — CV-002.DS-004.US-6

## Objective

Close the evidentiary gap for DS-004 by producing one understandable causal timeline across Nautilus, the exact Pi branch and the mapped Mirror conversation, while proving that Journey/identity/persona/mode/context/compaction behavior remains semantically aligned with terminal Pi. Reuse accepted native evidence rather than rerunning expensive or destructive scenarios without cause.

## Review Strategy

This is primarily a validation/evidence story. No production change is planned. If the review reveals a defect inside DS-004, stop the affected scenario, add a narrow characterization test, fix it under this approved story, rerun the scoped checks, and record the defect. Product expansion, concurrency and unrelated refinement remain separate work.

### Evidence reuse rule

Evidence may be reused only when it records:

- Journey, Harness conversation, Pi session/generation and Mirror conversation coordinates;
- native ids/counts or a sanitized file hash appropriate to the claim;
- the exact expected/observed boundary;
- accepted Navigator validation or deterministic automated coverage;
- no later contradictory state.

Text similarity, screenshots without coordinates and old green test counts are insufficient.

## Phase 1 — Build the DS-004 evidence matrix

Map parent test-guide Scenarios 1–12 and every child package to one of:

- `accepted_existing` — complete accepted evidence exists;
- `automated_only` — deterministic boundary is covered but needs aggregate interpretation;
- `rerun_required` — missing or stale Navigator-visible evidence;
- `blocked` — contradictory evidence or unsafe setup.

Expected reusable anchors:

- TS-1/US-1: persisted identity, hydration, restart and multi-turn continuity suites;
- TS-2–TS-5/US-2: existing Journey/persona/mode/context/compaction implementation plus paired evidence where present;
- TS-6: normative reconciliation contract and parser/migration tests;
- US-3: accepted normal commit plus Mirror failure/relaunch/model-free Retry;
- US-4: accepted exact terminal continuation, Journey isolation and relaunch dedupe;
- US-5: accepted pre-approval Pi immutability, explicit generation transition, rollback coverage and relaunch dedupe.

Materialize `parity-review.md` and a sanitized `evidence/three-body-timeline.json` containing only authority coordinates, native ids, counts, hashes, classifications, reason codes and timestamps needed for the review.

## Phase 2 — Prove one alternating three-body timeline

Use a dedicated mapped Journey state, preferably the already reconciled `viagem-do-lipe` generation when safe. Back up mutable local session/database state before the route.

1. Record the synchronized Harness/Pi/Mirror baseline.
2. Send a Nautilus turn that depends on the reconciled Mirror-only fact (`amber compass`).
3. Verify a correlated Nautilus → Pi → Mirror commit and final `in_sync` checkpoint.
4. Continue the exact resulting Pi session from terminal with one bounded turn.
5. Activate/focus Nautilus and verify one-time Pi projection with `pi_advanced`.
6. Add one complete bounded Mirror-only pair to the exact mapped Mirror conversation while Pi is unchanged.
7. Verify inert preview and byte-identical Pi state before approval.
8. Explicitly create the reconciled Pi generation.
9. Relaunch and send one final follow-up requiring facts from all accepted turns.
10. Verify final correlated commit and an understandable generation/checkpoint timeline.

Provider calls in this phase are explicit validation actions. No observation, Retry or reconciliation action may invoke a provider.

## Phase 3 — Context and Mirror semantic parity

Review or rerun only missing paired checks:

### Journey and identity/persona

- same Journey and bounded prompt in terminal and Nautilus;
- observable pre-generation Mirror/Journey loading;
- one known persona-routed case and one ego-only case;
- canonical signature only when Mirror routes a persona;
- switch Journeys and verify no context leakage.

### Operating modes

For Mirror, Builder, Explorer and Soul, compare one natural-language activation plus one representative continuation:

- required transition/Ariad surface;
- active Journey and sticky context;
- mode-specific behavioral boundary;
- no mutation at Builder activation alone;
- Explorer/Soul mutation requests route across their explicit boundaries;
- no Nautilus-synthesized mode or signature.

Use existing accepted mode evidence when coordinates and behavior remain sufficient; otherwise perform a bounded paired rerun.

### Context usage and compaction

- compare terminal and Nautilus context usage for the exact same Pi session/model;
- verify configured model window, percentage thresholds and restored usage;
- verify unknown state immediately after Pi-owned compaction and refreshed usage after the next assistant turn;
- verify a pre-compaction fact survives through Pi's compacted branch.

If automatic compaction still lacks accepted E2E evidence, use an isolated, backed-up and fully restored Pi settings/session setup. Do not alter global settings without preserving and restoring the exact previous bytes. Stop rather than generating an unbounded or expensive transcript.

## Phase 4 — Failure and conflict boundaries

Aggregate accepted US-3 failure/Retry evidence and deterministic fixture coverage for:

- cancellation/aborted assistant;
- Mirror commit failure after Pi success;
- partial Pi JSONL tail;
- stale generation/cursor/count;
- independent Pi and Mirror advancement;
- truncated/consolidated Mirror records;
- atomic reconciliation activation failure and rollback;
- duplicate focus/relaunch events.

Rerun a destructive failure only if existing accepted evidence plus automated coverage cannot establish the aggregate claim.

## Phase 5 — Report and closure readiness

1. Run the full current baseline.
2. Record all accepted differences and explicit non-equivalences:
   - Pi owns execution ancestry/context/compaction;
   - Mirror owns semantic records and may consolidate/truncate;
   - Nautilus owns projection and checkpoints;
   - semantic parity is not byte equality.
3. Update DS-004 aggregate implementation/validation artifacts and child statuses coherently.
4. Ask the Navigator to accept the three-body experience.
5. After US-6 validation/debt/Done, recommend DS-004 aggregate validation and closure through its existing Delivery Story flow.

## Required Automated Checks

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
python3 -m unittest scripts.tests.test_inspect_mirror_conversation
```

Run affected Mirror suites only if the review changes Mirror core/extension behavior. Use `uv run` for Mirror Python commands.

## Acceptance Behavior

```text
Given the accepted US-3, US-4 and US-5 boundaries
When one sanitized Journey timeline alternates Nautilus, terminal Pi and Mirror-only updates
Then every accepted transition has native causal evidence
And the final follow-up uses only the explicitly accepted canonical Pi generation
And no turn, generation or semantic record is lost or duplicated.
```

```text
Given terminal and Nautilus use the same Journey/Pi/Mirror runtime
When persona, modes, context usage and Pi-owned compaction are compared
Then meaningful behavior and safety boundaries match
And any intentional representational difference is named rather than hidden.
```

## Validation Route

E2E is required. The Navigator will:

1. follow the alternating timeline with guided bounded actions;
2. inspect the sanitized authority/checkpoint report;
3. confirm final continuity after relaunch;
4. confirm mode/context/compaction observations for every rerun-required matrix row;
5. accept or reject the aggregate experience.

## Pass Condition

- all required checks pass;
- every Scenario 1–12 row is accepted or explicitly classified with sufficient evidence;
- one alternating timeline reaches a final proven state without loss or duplication;
- no private reasoning, secrets or raw private transcript enters evidence;
- the Navigator accepts the aggregate three-body experience;
- no unresolved blocker remains for DS-004 closure.

## Fail Condition

- any visible conversation differs from the Pi context actually continued without an explicit boundary;
- pre-generation Journey/identity/persona/mode evidence is missing;
- context/compaction state is invented or Nautilus-owned;
- Pi/Mirror advancement mutates another body silently;
- failure/relaunch loses a proven turn or creates a duplicate;
- evidence relies only on text/timestamp similarity;
- a required scenario remains unclassified.

## Non-Goals

- New application capability.
- DS-009 concurrency.
- Reimplementation of Mirror semantics in React/Rust.
- Byte-identical transcript claims.
- Public/cloud synchronization.
- Unbounded provider usage merely to manufacture validation evidence.

## Stop Conditions

- A rerun requires unsafe global mutation without exact backup/restore.
- Provider cost or transcript growth becomes unbounded.
- Evidence contradicts a previously accepted checkpoint.
- A defect requires scope outside DS-004.
- Any secret, private reasoning or raw private transcript would need durable inclusion.
- Required checks fail without a narrow DS-004 fix.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- review execution remains blocked until Navigator approval.
