# Field Verification — v0.2.0-alpha.39, CR128

**Date:** 2026-10-06
**Release:** `v0.2.0-alpha.39` "The Answer Survives the Restart"
**Production boundary:** `2026-10-06T14:15:45Z` (pid 14113, local `11:15:45`)
**Journey observed:** `softwarezen` — provenance preserved; this reading is recorded under
`mirror-desktop` authority and mutated nothing in either Journey.

## Binary identity, proved by hash

```
installed  d8a8979a1c32d600623ed35c81d83b87663b0a2295b0be8eb4190226f619097f
built      d8a8979a1c32d600623ed35c81d83b87663b0a2295b0be8eb4190226f619097f
```

`/Applications/Mirror Desktop.app/Contents/MacOS/mirror-desktop` is byte-identical to the binary this
release built. Version string `0.2.0-alpha.39`, binary mtime `Oct 6 10:35`.

**A measurement discarded before it was used.** A `strings`/`grep -a` probe for
`mirror_append_pi_recovery_request_open` reported it absent. Calibration showed **every**
`mirror_append_pi_recovery_*` literal absent from both the installed binary and the locally built
one, including `mirror_append_pi_recovery_ambiguous`, which has shipped for many releases. The probe
cannot see that class of literal; its verdict was discarded. The hash is the proof. The two `format!`
receipt prefixes are visible, and the new one — `pi-recovery-interrupted-` — is present.

**The reading was deferred.** At first contact the process was 79 s old. Three prior readings in this
project were wrong for being taken too soon. The boundary was computed and recorded, and the store was
read at `14:21:39Z`, 5 min 54 s after the restart.

## CR128 worked, exactly as the replay predicted

The read-only replay on 2026-10-06 predicted `12:18:21Z → interrupted` and
`12:34:47Z → closed on 5c55d124`. Both occurred, 13 s and 15 s after the restart, on Journey load.

| Record | Before | After |
|---|---|---|
| `agent-run-2026-10-06T12:18:21.328Z` | `running`, `resume_execution`, rev 2 | **`interrupted`**, `interrupted`, rev 3, receipt `pi-recovery-interrupted-…`, updated `14:15:58.927Z` |
| `agent-run-2026-10-06T12:34:47.097Z` | `running`, `resume_execution`, rev 2 | **`settled`**, `completed`, `complete`, rev 5, updated `14:16:00.706Z` |

The settled record's evidence is the turn the replay named: `user 1d000ad3`, `assistant 5c55d124`,
`entryCount 182`, `assistantText` 952 chars. No new recovery skip was written — the last one remains
`12:34:37.702Z`, from before the release.

**The answer is back.** The conversation holds `Recuperação concluída.` (669 visible chars) at
`12:36:07`. **Mirror has the pair**: conversation `d1f94c25` received the user message (8 chars,
`continue`) at `12:34:49` and the assistant message (952 chars) at `12:36:07`, both carrying
`sourceTurnId = turn-agent-run-2026-10-06T12:34:47.097Z`. Outbox empty. Conflict records still 6, none
new.

## Correction (2026-10-06, after the Navigator used the Journey)

**The section below was wrong and is retained because it was published.** It predicted the Journey
would still be blocked in `Finishing`. The Navigator opened `softwarezen` and reported the opposite:
the surface showed **`Interrupted`** correctly, the Composer was **released normally**, and a new turn
ran and settled.

The store confirms it, and also falsifies the second claim — that it would never heal:

| | at `14:16:00.840Z` (what was read) | at `14:51:55.682Z` (now) |
|---|---|---|
| turn `12:34:47Z` `harness` | `pending`, `committedAt` `None` | **`committed`**, `committedAt` `2026-10-06T12:36:07.088Z` |

That timestamp identifies the writer. `commitHarnessTurn` has exactly two callers:
`turnFinalizationCoordinator.ts:334` passes `new Date().toISOString()`, and `:547` — the convergence
path — passes `execution.committedAt`. The stored value *is* `execution.committedAt`, the Pi assistant
entry's own timestamp. So the convergence path did commit the harness body.

**How the two readings are reconciled is not established.** The persisted projection at `14:16:00.840Z`
carried `pending`; by `14:51:55.682Z` it carried the convergence path's committed value. Either the
in-memory projection already held the commit and the save lagged behind it, or a later pass supplied
it. The sequence is unobservable precisely because **recovery opens no collector** — B's settlement
wrote no timing record, so there is no phase trace of it. Rather than choose a story, this is left
named.

What this means for the diagnosis below: the *ordering* in `convergePiBackedItem` is real and was read
correctly from the source — `commitHarnessTurn` at `:547` does precede
`projectPiBackedConversationSurface` at `:548`. What was wrong was concluding a user-visible
consequence from a single persisted snapshot, and asserting permanence from an early return without
checking whether anything else reached the same commit.

**No defect is owed from this.** Nothing is captured, and nothing needs to be.

### The new turn confirms the ordinary path is healthy

`agent-run-2026-10-06T14:50:18.266Z` settled with **19 phases** in 2,335 ms and wrote a timing record.
The contrast is itself the evidence for the standing gap: the recovered turn settled with **no** timing
record at all, the ordinary turn with a full one.

`classification` remains `commit_pending`, caused by turn A's three `pending` bodies. It blocks
nothing: `classifyDedicatedTurnState` reads only the **last** Nautilus turn, which is now fully
committed. That was the gap in the reasoning below — it read the last turn at one moment and treated
it as permanent.

## Superseded prediction: the Journey is probably still stuck, for a different reason

This was **not predicted** by CR128's closure review. The review predicted turn A's bodies would stay
`pending`, and they did. It did not predict turn B's.

```
turn-agent-run-2026-10-06T12:34:47.097Z   pi=committed  harness=pending  mirror=committed
                                          harness.committedAt = None
```

`classifyDedicatedTurnState` reads the last Nautilus turn: `pi === "committed" && harness !== "committed"`
→ `projection_pending` → `dedicatedTurnBlocksNewInvocation` → **true** → the Composer renders
**`Finishing`** and refuses a new turn. The strand this release removed is replaced by a narrower one
at the same surface.

### Cause: a commit judged against content the next line supplies

In `convergePiBackedItem` (`src/app/turnFinalizationCoordinator.ts`):

1. `stageCorrelatedTurn` is **skipped** — guarded by
   `if (!projection.reconciliation.turns.some((turn) => turn.turnId === correlation.turnId))`, and the
   turn was already in the reconciliation, staged when the run was admitted. Staging is what would have
   written `execution.assistantText` into the harness assistant message.
2. `applyPiExecutionEvidence` commits the Pi body. ✓
3. **`commitHarnessTurn` (`:547`)** looks up `correlation.harnessAssistantMessageId` and returns the
   conversation **unchanged** when that message has no content:
   ```ts
   const assistant = conversation.messages.find((message) => message.id === correlation.harnessAssistantMessageId);
   if (!assistant?.content.trim()) return conversation;
   ```
   At that moment the message was the empty placeholder the interrupted run left behind. Silent refusal.
4. **`projectPiBackedConversationSurface` (`:548`)** then fills that same message from the Pi
   transcript — which is why it now holds 669 characters and the prose is readable.

The harness commit is evaluated one line before the data it requires arrives. An initial hypothesis
that the message was missing or empty *now* was wrong: it exists and holds the answer. The ordering is
the defect.

**It will not heal.** `convergePiBackedItem` returns early for `record.phase === "settled"` (`:454`),
the journal record is `settled`, and the outbox is empty. Nothing will attempt this turn again.

> **This claim is false.** It healed. See the Correction above. The early return at `:454` is real, but
> it was taken as proof that no path could reach the commit, which did not follow.

### Not introduced by CR128

This is in the CR108-era convergence path, untouched by CR128. CR128 made it **reachable**: before it,
recovery never got far enough on a restart-and-continue for the harness commit to be attempted at all.
Whether any previously recovered turn carries the same uncommitted harness body is unmeasured.

## Standing debt confirmed

- **Recovery opened no collector.** `settlement-timings/softwarezen.json` still holds 2 records,
  `savedAt 12:17:13Z`. A turn that settled through recovery at `14:16:00Z` wrote no timing record.
  CR127's deeper finding, witnessed again.
- Turn A's three bodies remain `pending`, so `classification` stays `commit_pending` — as predicted.
- `StaleRecoveryReport` counted the interruption as `recovered`; the skip log cannot distinguish.

## What is owed

**Nothing.** The question this section originally left open — whether the Composer still showed
`Finishing` — was answered by the Navigator: it showed `Interrupted`, released the Composer, and the
next turn worked. The harness body is committed. No fix is owed, and the ordering in
`convergePiBackedItem` is recorded as an observation rather than a defect, since no observed behaviour
depends on it.

What remains owed is unchanged and belongs to CR127's territory: **recovery opens no collector**. A
turn that settles through recovery writes no timing record, which is exactly why the sequence in the
Correction above could not be reconstructed. That is now the second time in two readings that this gap
blocked a diagnosis.
