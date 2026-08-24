[< Story](index.md)

# Test Guide — CV-002.DS-004.US-6

## Purpose

Accept DS-004 only after one causal evidence matrix explains conversation continuity, semantic Mirror context and every supported reconciliation/failure boundary across Nautilus, Pi and Mirror.

## Evidence Matrix

Create `parity-review.md` with one row for each parent test-guide Scenario 1–12:

```text
scenario | authority coordinates | evidence source | status | accepted difference | Navigator result
```

Statuses: `accepted_existing`, `automated_only`, `rerun_passed`, `blocked`.

No row may pass from shared labels, text equality or timestamps alone.

## Automated Baseline

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
python3 -m unittest scripts.tests.test_inspect_mirror_conversation
```

## Alternating Timeline

For one backed-up mapped Journey, record sanitized checkpoints at:

1. synchronized baseline;
2. Nautilus correlated commit;
3. exact terminal Pi continuation;
4. Nautilus one-time Pi projection;
5. Mirror-only detection before approval, including unchanged Pi digest;
6. explicit hydrated generation;
7. relaunch;
8. final Nautilus follow-up and correlated commit.

Required fields:

```text
journeyId
harnessConversationId / messageCount / lastMessageId
piSessionId / generation / leafEntryId / entryCount / sanitized file hash
mirrorConversationId / lastMessageId / messageCount
classification / reasonCodes
transition cause
```

Do not store message content, prompts, assistant responses, arbitrary metadata or reasoning in the evidence JSON.

## Context and Semantic Scenarios

### Conversation and restart

- relaunch continuity uses the exact mapped Pi branch;
- explicit restart increments generation and cannot recover old context accidentally;
- selected Mirror history influences later answers only after hydration.

### Journey/persona

- Journey context is observed before generation;
- routed persona matches terminal and uses canonical signature;
- ego-only output remains unsigned;
- Journey switch does not leak context.

### Modes

Validate Mirror, Builder, Explorer and Soul transition surfaces and representative boundaries. Activation alone must not cross Builder execution consent; Explorer and Soul must not mutate project state.

### Context/compaction

- exact-session terminal/Nautilus token/window/percentage agreement;
- Pi—not Nautilus—starts compaction;
- post-compaction usage becomes unknown when Pi reports unknown;
- next usage refreshes it;
- a pre-compaction fact survives through summarized continuity.

Any temporary compaction settings must be byte-backed-up, scoped, restored and verified before the scenario passes.

## Failure Matrix

Confirm accepted E2E or deterministic coverage for:

- cancellation/assistant error;
- Pi success followed by Mirror failure and model-free Retry;
- partial/truncated Pi tail;
- Mirror incomplete/truncated/consolidated tail;
- stale authority/generation/cursor/count;
- independent `both_advanced` conflict;
- atomic reconciliation rollback;
- repeated focus/relaunch dedupe.

## Navigator Route

The assistant guides bounded actions one at a time. Before every provider call or mutable external step, state what will run and which checkpoint will be inspected. Normal local inspection and evidence assembly remain model-free.

At the end, present:

1. concise identity/generation timeline;
2. Scenario 1–12 matrix;
3. accepted semantic differences;
4. automated baseline;
5. unresolved debt/blockers, if any;
6. explicit acceptance question.

## Pass Condition

Every scenario is sufficiently evidenced and accepted, the alternating timeline has no unclassified divergence, final context uses the accepted Pi generation, checks are green, temporary state is restored, and the Navigator accepts closure readiness.

## Fail Condition

Any missing causal coordinate, silent cross-body mutation, duplicated/lost turn, invented context/mode/usage, un-restored temporary setting, unsafe evidence handling or unclassified scenario blocks US-6 and DS-004 closure.

## Evidence Hygiene

Only sanitized derived evidence may be committed. Raw Pi JSONL, Mirror database copies, prompts, responses, secrets, tool output and private reasoning stay outside the repository and are removed after deriving ids/counts/hashes.
