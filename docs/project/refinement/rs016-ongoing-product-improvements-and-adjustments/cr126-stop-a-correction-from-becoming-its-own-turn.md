[< RS016](index.md)

# CR126: Stop a Correction From Becoming Its Own Turn

**Status:** planned
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr126-corrected-turn-request-identity`

## Problem

The native Pi transcript projection treats every user entry as the start of a turn. A correction the
Navigator sends mid-run is a user entry, so it starts one — and the turn the Desktop then records as
durable truth describes the correction rather than the request.

This is the defect CR097 found and deliberately did not fix. CR097 repaired the **presentation** by
compensating in the TypeScript projection; the stored record is still untrue, and everything else
that reads it inherits that.

## The two lines

`project_complete_pi_transcript_from_branch` (`src-tauri/src/main.rs:5258`):

```rust
Some("user") => {
    pending_user = Some(entry);   // a correction replaces the request
    assistant_texts.clear();       // and discards what the agent had said so far
}
```

`terminal_pi_execution_evidence` (`:7366`) then takes `.pop()` — the **last** projected turn — and
writes its `user_entry_id` and `assistant_text` into the turn journal's `terminalEvidence.piExecution`.
From there `applyPiExecutionEvidence` → `observePiTurnCommit` sets the turn's `pi.userEntryId`, and
`finalizeCompletedTurn` writes `execution.assistantText` into the harness assistant message and into
what Mirror receives.

## Evidence

Read-only against the production store on `0.2.0-alpha.37`, 2026-10-05, replaying the shipped Rust
rule over each Journey's active Pi branch, followed by `parentId` rather than by file order.

Nine corrections across five Journeys. Three distinct consequences, measured separately because they
have different severities and only one of them is about identity:

| Consequence | Measured |
|---|---|
| The turn records the **correction** as its own `pi.userEntryId` | **9 of 9** |
| `assistant_texts.clear()` discarded prose from the stored answer | **4 of 9** |
| The agent's answer to the original request is orphaned from the turn | **1 of 9** |

### Identity, 9 of 9

Every corrected turn names its correction as its request, and the turn naming it is always the
correction's own turn:

```text
flip-website  correction entry 28766532
  evidence.turnId                 turn-agent-run-2026-10-03T14:49:30.230Z
  turn claiming it as its request turn-agent-run-2026-10-03T14:49:30.230Z
  harness.userMessageId           user-2026-10-03T14:49:30.230Z
```

### Lost prose, 4 of 9

`clear()` only discards prose accumulated since the last `stop`, so a correction arriving after the
agent closed a thought loses nothing. Arriving mid-thought, it loses that thought:

| Journey | correction | discarded |
|---|---|---:|
| `alissonvale-com` | `64af7b4a` | 55 chars |
| `alissonvale-com` | `00adde48` | 173 chars |
| `livro-lideranca-soberana` | `726ad2a0` | 150 chars |
| `mirror-desktop-rescue-journey` | `c87d047a` | 427 chars |

That text exists in the Pi session and is absent from the durable record and from Mirror.

### An orphaned answer, 1 of 9

`livro-lideranca-soberana`, correction `d3085808` ("nota bibliografica"). The branch reads:

```text
[2204] 97e973f4  assistant  stop=stop   518 chars   "Entendi, você quis dizer a **nota bibliográfica**…"
[2205] d3085808  user                    18 chars   "nota bibliografica"
[2206] 9032771b  assistant  stop=stop   115 chars   "Sim, nota **bibliográfica**. É a referência de…"
```

The agent had already closed a 518-character answer, so the projection produced **two** turns where
the harness has one. `.pop()` took the second, and the durable assistant message holds the
115 characters. The 518 are in the session and attached to no turn the Desktop records.

### Mirror stores the correction as the request — 7 of 7

Found while planning, and it is the most severe consequence because it is outside the Desktop.
`validate_outbox_generation_authority` requires `messages[0].content` to equal the projected turn's
`user_text`, so the outbox item — and therefore the Mirror append — carries the correction as the
turn's user message. Read directly from `~/.mirror-minds/alisson-vale/memory.db`, matching on
`callerMetadata.sourceTurnId`:

| Journey | turn | Mirror's user message |
|---|---|---|
| `alissonvale-com` | `…T11:12:56.391Z` | `Remova o link para ver programação completa` |
| `alissonvale-com` | `…T11:18:11.945Z` | `faça o que vc propos tambem` |
| `amplia-website` | `…T04:37:46.185Z` | `só que em vez de agencia, vamos usar o termo protagonismo.` |
| `flip-website` | `…T14:49:30.230Z` | `Altere só local, sem deploy` |
| `livro-lideranca-soberana` | `…T12:46:21.799Z` | `atualize o processo para vc nao esquecer no futuro` |
| `livro-lideranca-soberana` | `…T16:08:11.240Z` | `ops, é canvas-instructions.md` |
| `livro-lideranca-soberana` | `…T09:41:06.027Z` | `nota bibliografica` |

**7 of 7 are the correction. None is the request.** The Navigator's actual request is not in Mirror
for any corrected turn, so Mirror's memory of those exchanges reads as a fragment answered by a
fragment. This is the Mirror Mind database the whole system reads, not a Desktop file.

### It also explains a standing open observation

"A correction can end a turn rather than redirect it" has been carried as an unexplained product
observation, and CR122 recorded that the Composer block it was blamed on did not account for it. The
trace above is the explanation: Pi answered the correction as its own short exchange and stopped, so
the run genuinely ended. Nothing in the Desktop caused it, and nothing in the Desktop recorded that
two exchanges had happened.

## Plan (2026-10-05)

### The rule, and why it needs no new data channel

The native side already knows where a run begins. `baseline_leaf_entry_id` is computed **before the
invocation starts** (`:7465`) and is passed to `terminal_pi_execution_evidence` on every call site —
but only as a guard against "nothing new happened", never to decide which entries belong to the run.

That is the whole fix. **A run is one invocation, and an invocation starts once**, so:

- the run's **request** is the **first** user entry after the baseline leaf (today: the last one);
- the run's **answer** is every assistant text after it (today: only since the most recent `stop`).

The native side never has to know what a correction *is*. A correction is simply not the first user
entry. No claim has to cross the boundary, and no text is interpreted — which rules out both options
the capture was weighing.

**Verified by replaying the candidate rule over all nine real corrections:**

| | |
|---|---|
| Request identified correctly | **9 of 9** |
| Answers that regain text | **5 of 9** (the 4 clear() losses and the 1 orphan) |
| Answers byte-identical to today | **4 of 9** — a no-op where nothing was wrong |

### The coupling that makes this delicate

Three consumers match a projected turn against **already-stored** evidence by
`(user_entry_id, assistant_entry_id)`, then verify text and timestamps:

| Site | Matches on | Also verifies |
|---|---|---|
| `create_pi_backed_mirror_append_item` `:5936` | evidence pair | `assistant_text`, `entry_count`, `committed_at` |
| `validate_outbox_generation_authority` `:6783` | outbox item pair | `createdAt`, both message contents and timestamps |
| `match_unclaimed_pi_turn` `:6327` | unclaimed turns by `entry_count` frontier | record eligibility |

Nine turns are already recorded with the correction as their `user_entry_id`. Changing the projection
makes those pairs unfindable, which turns a repair path into `mirror_append_pi_turn_missing`. **This
is the risk the slices are ordered around**, and it is why the projection and the evidence cannot
simply be edited together and shipped.

### Slices

**D1 — a run-scoped projection, pure and additive.** A new function projecting the run that follows a
baseline leaf: first user entry after it as the request, every assistant text to the end as the
answer. `project_complete_pi_transcript_from_branch` is **not** changed in this slice, so nothing that
matches against it moves. Tested against the nine shapes the store contains, including the
no-correction case where first and last coincide.

**D2 — the terminal evidence uses it.** `terminal_pi_execution_evidence` projects the run instead of
popping the last turn. Its existing baseline guard is kept: when the run produced nothing new, it
still returns `None`.

**D3 — the matchers tolerate both shapes.** Each of the three sites gains an explicit fallback: match
the run-scoped projection first, and when that fails, match the legacy per-user-entry segmentation.
A comment at each site names it as a compatibility path for evidence recorded before this change, and
names its end condition — no stored evidence older than this release remaining reachable. The
alternative, emitting both shapes from one projection, was rejected: it would double every turn list
and the matchers would have to disambiguate anyway.

**D4 — leave the shared projection alone, and say why.** `project_complete_pi_transcript_from_branch`
also feeds `load_dedicated_pi_transcript` and the inspection's `turns` field. No frontend consumer of
`inspection.turns` was found, and `load_dedicated_pi_transcript` has one caller in
`journeyThreadStorage.ts:49`. Both still carry the old segmentation after this change. That is
deliberate: the compatibility path in D3 depends on the legacy shape staying derivable, and changing
a surface with no demonstrated consumer is speculative. Recorded as debt rather than fixed.

**D5 — validate.** Native tests for the new projection and each fallback, a replay of the nine real
shapes as fixtures, the full suite, type check, build, `cargo check --locked`, roadmap, diff check.

### Files

- `src-tauri/src/main.rs` — new run-scoped projection beside `project_complete_pi_transcript_from_branch`
  (~`:5258`); `terminal_pi_execution_evidence` (`:7366`); fallbacks at `:5936`, `:6783`, `:6327`.
- `src/tests/correctedTurnRequestIdentity.test.ts` — source guards for the native wiring, following
  CR118's lesson that a correct rule with wrong wiring is this codebase's recurring failure.

No TypeScript behaviour change. CR097's compensation stays exactly as it is.

### Acceptance

- A corrected turn's durable record names the **request** that opened it, not the correction.
- The turn's answer contains everything the agent said during the run, including before a correction
  arrived and including a reply that had already closed.
- Mirror receives the request as the turn's user message.
- An uncorrected turn produces byte-identical evidence to today.
- A turn recorded **before** this change can still be matched, recovered and validated.
- No Pi JSONL write, no change to steering delivery or cancellation.

### Validation

- Rust unit tests over the nine real shapes plus the uncorrected control.
- A read-only replay against the production store, confirming 9 of 9 requests and that the four
  unaffected answers stay byte-identical.
- Full gates. Dev homologation of one corrected turn end to end, because this one changes what
  reaches Mirror and the production replay cannot exercise a write.

### Exclusions

- **No backfill.** The nine recorded turns keep their wrong request entry, and the seven Mirror
  messages keep the correction as their user message. Repairing them would mean writing invented
  attributions into the Mirror database, which is a separate decision with its own authority.
- No change to `project_complete_pi_transcript_from_branch` (D4), and so none to
  `load_dedicated_pi_transcript` or `inspection.turns`.
- No change to CR097's projection work; it must stay until this lands and should be reviewed only
  afterwards.
- No Pi JSONL writes. Pi's record is correct.

## Expected Behavior

A turn's durable record names the request that opened it. A correction sent during a run belongs to
that run — it is already recorded, with its own identity and status, as steering evidence — and it
does not become a turn, does not replace the request, and does not truncate the answer.

Whatever the agent said in response to the request is part of that turn's answer, whether it was said
before or after a correction arrived.

## Proposed Scope

Not planned. Recorded for the Navigator.

- Teach the native projection which user entries are corrections, which means the claim the Desktop
  already holds (`steeringEvidence[].piUserEntryId`) has to reach the native side, or the native side
  has to recognise a correction by shape. The first is honest and explicit; the second would be a
  guess about text.
- A correction must not replace `pending_user` and must not clear accumulated prose.
- Decide what `.pop()` should mean when a run legitimately produced two closed exchanges. Taking the
  last one is what orphans the first; concatenating them changes what an answer is.
- CR097's compensation in `piBackedConversationSurface` should be reviewed once the record is true,
  because a correct record makes part of it unnecessary. It should not be removed before then.
- `turnFinalizationCoordinator.ts:156` and anything else reading `turn.pi.userEntryId` inherits the
  wrong value today and must be checked.

## Exclusions

- No rewriting of recorded history. The nine turns already carry the wrong request entry, and the
  lost prose cannot be recovered into them without inventing an attribution.
- No change to how a correction is delivered, queued or cancelled.
- No Pi JSONL writes. Pi's record is correct — it holds exactly what happened.

## Dependencies

Found by pursuing the debt CR097 recorded at closure, by tracing where `turn.pi.userEntryId` is
written rather than where it is read. Independent of CR097 in delivery; CR097 must stay in place
until this lands, because it is the only thing currently making a corrected conversation readable.
