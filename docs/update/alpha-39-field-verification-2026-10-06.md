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

## The Journey is probably still stuck, for a different reason

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

A decision on the harness-commit ordering. The apparent fix is to supply the content before judging
the commit — either by staging the turn's messages when they are absent regardless of whether the turn
exists, or by projecting the Pi surface before committing the harness body. Neither has been
attempted, measured, or captured. Whether the Composer in fact still shows `Finishing` is a GUI
observation this reading cannot make.
