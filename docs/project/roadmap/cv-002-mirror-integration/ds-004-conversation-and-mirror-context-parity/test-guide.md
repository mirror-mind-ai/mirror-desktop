[< Story](index.md)

# Test Guide — CV-002.DS-004

## Purpose

Prove that the conversation visible in Nautilus is the conversation Pi/Mirror actually uses, and that Journey/identity/persona/mode context, context-window usage and automatic compaction have semantic parity with the terminal runtime.

## Preconditions

- Use one explicit test Journey and record its id/path.
- Use the same Pi provider, model and settings in terminal and Nautilus.
- Record the Harness conversation id, Pi session/generation, Mirror conversation id and last proven per-body checkpoints used by each scenario.
- Disable unrelated concurrent runs; concurrency belongs to `DS-009`.
- Back up session data before destructive restart/compaction scenarios.
- Sanitize captured evidence; do not retain secrets, full identity data or raw private conversations.

## Automated Validation

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Automated coverage must include:

- persisted live-conversation identity parsing and backward migration;
- deterministic new/continue/import/branch/restart mapping;
- rejection of stale or ambiguous mappings;
- invocation using the resolved Pi session rather than recomputing it from Journey id;
- exactly-once local and Mirror durable message ownership;
- two-turn continuity without full-history prompt replay;
- context usage mapping, including unknown state;
- compaction start/end/retry/failure/interruption settlement;
- separation of assistant text, operations, context state, compaction state and reasoning summaries;
- no reasoning-summary persistence;
- first-terminal-outcome latch;
- unchanged auto-run, filesystem, provider-secret and local-link guardrails;
- correlated Harness/Pi/Mirror turn-commit and idempotent repair state;
- incremental exact-session Pi JSONL projection with partial-tail safety;
- Mirror-only advancement, duplicate and conflict classification;
- explicit reconciliation atomicity and rollback.

## Scenario 1 — Fresh Canonical Conversation

1. Start a fresh Journey conversation in Nautilus.
2. Inspect the resolved live-conversation identity.
3. Send a unique factual statement and request a short acknowledgement.
4. Close and relaunch Nautilus.
5. Ask a follow-up requiring the unique fact.

Expected:

- one stable Nautilus conversation id and one mapped Pi session generation are used across relaunch;
- the follow-up succeeds without resending the full local transcript in the prompt;
- local visible messages and Pi session turns correspond in order;
- Mirror records each committed turn at most once;
- no unrelated Journey transcript appears.

Fail if:

- the answer depends on hidden prompt replay;
- local and Pi message counts drift without an explicit recoverable state;
- duplicate Mirror records appear;
- a deterministic session id is assumed without mapping evidence.

## Scenario 2 — Selected Mirror Conversation

1. Select and reload a Mirror conversation containing a unique prior fact.
2. Inspect whether it has a proven Pi-session association.
3. Continue it from Nautilus.

Expected:

- an existing trustworthy association is continued, or Nautilus performs/requires an explicit supported branch/import transition;
- the resulting live identity is persisted;
- the follow-up can use the imported fact only when that fact is actually in live Pi context;
- imported activity remains inert.

Fail if:

- rendered Mirror history is silently presented as model context;
- the fixed Journey Pi session continues unrelated old turns;
- import duplicates all history into every later prompt.

## Scenario 3 — Restart Boundary

1. Establish a unique fact in a live conversation.
2. Trigger `Restart Conversation` while idle.
3. Verify the previous Pi session is archived/detached and a new lifecycle generation is persisted.
4. Ask for the old fact.
5. Repeat restart while a run is active.

Expected:

- successful restart resets local visible state only after backend success;
- the new generation does not continue the archived transcript;
- active-run restart is rejected without changing either side;
- stale mappings cannot reopen the archived generation accidentally.

## Scenario 4 — Journey and Identity Loaded Before Generation

Run the same context-dependent prompt in terminal and Nautilus for the same Journey.

Evidence must show before assistant generation:

- active Journey resolution;
- the applicable Mirror load operation or equivalent structured evidence;
- identity context loading;
- no after-the-fact logging presented as proof of pre-generation context.

Expected:

- answers materially agree on Journey-specific facts and boundaries;
- switching Journeys does not leak the previous Journey context.

## Scenario 5 — Ego and Persona Routing

Use two paired prompts:

1. one expected to route to a known persona;
2. one expected to remain ego-only.

Expected:

- terminal and Nautilus choose the same routing outcome;
- persona-routed output uses the canonical `◇ persona-name` signature;
- ego-only output has no persona signature;
- Nautilus does not synthesize signatures or routing events.

## Scenario 6 — Operating Modes

For each mode, perform the same activation and representative continuation in terminal and Nautilus.

### Mirror

- transition surface is visible;
- required Mirror load occurs;
- response follows ego/persona voice.

### Builder

- Journey/project context loads;
- activation surface is visible;
- activation alone causes no implementation or file mutation;
- an explicit later implementation instruction may cross the boundary.

### Explorer

- sticky Journey/exploratory story is restored when present;
- uncertainty is preserved;
- mutation requests expose the Explorer to Builder boundary and do not execute.

### Soul

- entry/listening surfaces remain intact;
- project mutation is prohibited;
- operational requests expose the Soul to Builder boundary.

For all modes:

- marked Ariad blocks are preserved verbatim and in order;
- mode surfaces remain distinct from assistant text;
- ordinary `read` operations do not imply skill activation.

## Scenario 7 — Context Usage Parity

1. Open the same Pi session in terminal and Nautilus.
2. Compare token usage, context window and percentage.
3. Generate another valid assistant turn and compare again.

Expected:

- provider-reported usage is authoritative when present and is restorable from the exact mapped Pi JSONL without launching Pi;
- fixed model windows come from the versioned Pi model-catalog snapshot;
- explicitly hydrated transcripts may use Pi's conservative `chars / 4` estimate only before the first provider usage;
- unknown models or missing evidence do not invent a window or percentage;
- displayed values agree with Pi's rounding and `>70%` warning / `>90%` error thresholds;
- provider/model changes replace the window immediately while preserving current tokens until the next provider usage;
- context state is not appended to `ConversationMessage` or imported activity.

## Scenario 8 — Automatic Compaction and Continuity

Use a controlled Pi configuration/session that can cross the compaction threshold safely.

1. Establish a unique fact early in the conversation.
2. Continue until Pi triggers automatic compaction.
3. Observe start, reason/trigger when available, completion or retry/failure.
4. Immediately inspect context usage.
5. Send a follow-up requiring the early fact.

Expected:

- Pi performs compaction; Nautilus only projects it;
- compaction activity appears in event order and settles permanently;
- context usage becomes unknown immediately after compaction when Pi reports unknown;
- the next valid usage refreshes the display;
- the follow-up continues from the compacted Pi branch and retains required summarized context;
- no local transcript replay bypasses the compaction result.

Failure variants:

- aborted/cancelled compaction settles as interrupted;
- compaction error settles as failed and does not fabricate completion;
- late events cannot reopen a terminal run or compaction operation.

## Scenario 9 — Durable Logging and Recovery

Exercise success, cancellation, provider error, Mirror logging failure and app relaunch around each message commit boundary.

Expected:

- completed user/assistant turns are durable exactly once in the exact Pi branch and mapped Mirror conversation;
- normal success reaches a proven Harness/Pi/Mirror checkpoint without permanent UI noise;
- Pi-committed but Mirror-pending/failed state remains visible and recoverable;
- retry is idempotent and does not rerun the model;
- cancellation/error does not persist fabricated assistant completion;
- any staged user turn has a documented recoverable state;
- relaunch resolves the canonical Pi transcript and local projection deterministically;
- reasoning summaries remain ephemeral.

## Scenario 10 — External Pi Continuation

1. Open a Journey in Nautilus and record its exact Pi checkpoint.
2. While Nautilus is idle, continue that exact Pi session through terminal Pi.
3. Commit one user/assistant turn.
4. Return to or reactivate the Journey in Nautilus.
5. Repeat with Nautilus active on another Journey and after relaunch.

Expected:

- Nautilus detects only the exact mapped Pi branch advancement;
- supported user/assistant turns after the checkpoint appear once and in Pi order;
- refresh invokes neither Pi nor a provider;
- tool operations, private reasoning and reasoning summaries do not become conversation messages;
- a partial JSONL tail is ignored until complete;
- local divergence produces an explicit reconciliation boundary instead of overwrite or interleaving.

## Scenario 11 — Mirror-Only Advancement

1. Establish synchronized Harness/Pi/Mirror checkpoints.
2. Add an eligible ordered conversation turn to the mapped Mirror conversation without changing Pi.
3. Refresh Nautilus reconciliation state.
4. Inspect the difference without approving it.
5. Approve the supported reconciliation action.
6. Repeat with a duplicate, consolidated/truncated record and a genuine conflict.

Expected:

- Mirror advancement is detected automatically;
- the preview is inert and discloses source/provenance;
- Pi remains byte-for-byte unchanged before explicit approval;
- eligible approval creates an atomic supported Pi fast-forward or new generation/branch;
- the same update cannot be applied twice;
- consolidated/truncated or conflicting records are not silently converted into Pi turns;
- failed preparation preserves the previous identity and transcript.

## Scenario 12 — Three-Body Alternating Conversation

1. Start one synchronized Journey conversation in Nautilus.
2. Commit a turn through Nautilus and verify all three checkpoints.
3. Continue the exact Pi branch in terminal and verify Nautilus fast-forward.
4. Introduce one Mirror-only eligible update and reconcile it explicitly.
5. Relaunch Nautilus and send a follow-up requiring facts from all accepted turns.
6. Repeat one boundary with cancellation or induced durable-write failure.

Expected:

- one understandable identity/generation timeline explains every transition;
- no accepted turn is lost or duplicated;
- pending/conflicted state is visible before another unsafe mutation;
- the final Pi answer uses only the explicitly reconciled canonical branch;
- Harness, Pi and Mirror reach the same proven semantic checkpoint or expose the exact remaining difference.

## Aggregate Pass Condition

The Delivery Story passes when:

1. all automated checks pass;
2. Scenarios 1–12 have recorded sanitized evidence;
3. terminal and Nautilus exhibit no material divergence in conversation continuity, Journey/identity/persona/mode context, context usage or compaction;
4. forward commit, external Pi continuation and explicit Mirror-only reconciliation pass as one coherent three-body experience;
5. the Navigator accepts the aggregate parity review;
6. any remaining differences are explicitly classified as accepted debt or blockers before Done.

## Aggregate Fail Condition

The Delivery Story fails validation if any of the following remains:

- local visible history is not the Pi transcript actually used;
- selected Mirror history is treated as live context without a supported mapping/import;
- a Pi-committed turn can fail Mirror persistence without an observable recoverable state;
- external exact-session Pi turns leave Nautilus silently stale;
- Mirror-only content enters Pi before explicit conflict-aware approval;
- duplicate durable logging or duplicate reconciliation occurs;
- Journey/persona/mode context is only logged after generation;
- Nautilus estimates context usage or performs compaction itself;
- continuity is lost after relaunch or compaction;
- mode safety boundaries diverge from Mirror;
- private reasoning or reasoning summaries enter durable conversation state.

## Validation Evidence

Store only sanitized derived evidence in an `evidence/` directory beside this guide. Delete raw JSONL/session captures after deriving fixtures and reports.
