[< RS016](index.md)

# CR126: Stop a Correction From Becoming Its Own Turn

**Status:** captured
**Driver:** —
**Delivery:** —

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

### It also explains a standing open observation

"A correction can end a turn rather than redirect it" has been carried as an unexplained product
observation, and CR122 recorded that the Composer block it was blamed on did not account for it. The
trace above is the explanation: Pi answered the correction as its own short exchange and stopped, so
the run genuinely ended. Nothing in the Desktop caused it, and nothing in the Desktop recorded that
two exchanges had happened.

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
