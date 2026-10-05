# The Settlement Model

**Status:** extracted from code and verified against production, 2026-10-04

**Why this exists.** Six Change Requests in sequence — CR114, CR116, CR118, CR119, CR120, CR121 —
each repaired a real defect on the settlement path and each one's diagnosis opened the next. That
pattern is not bad luck. It is what happens when corrections are reasoned locally about a path whose
whole is not written down. This document is the whole, extracted from the code rather than from
memory, and evaluated against the real production store rather than assumed.

It is not a proposal. Nothing here changes behaviour. It exists so that the next decision on this
path can be weighed against a model instead of against intuition.

---

## 1. Scope

The settlement path is everything that happens between the moment Pi commits an agent's answer and
the moment the turn is durably recorded everywhere it needs to be. It begins at
`terminalEvidence.capturedAt` and ends when the turn journal reaches `settled` and Mirror delivery is
acknowledged. It is the interval a reader sees as `Finishing`.

Out of scope: Pi's own execution, the Composer, the transcript surface, Journey provisioning,
generation activation, and anything that happens before a turn's answer exists.

---

## 2. The durable artifacts

Eleven artifacts are touched on this path. Paths are relative to the channel's application data
directory — `~/Library/Application Support/ai.mirrormind.desktop` for the user channel,
`…desktop.dev` for Dev. Both channels have independent copies of all of it.

| # | Artifact | Path | Written by | What it is authority for |
|---|---|---|---|---|
| A1 | Pi session | `pi-sessions/<timestamp>_<sessionId>.jsonl` | **Pi**, not the Desktop | The conversation. The only true record of what was said. |
| A2 | Journey thread | `journey-threads/<journey>.json` | `save_journey_thread` | Which generation is active, and its activation receipt: session id, Mirror conversation id, channel. |
| A3 | Durable ledger | `dedicated-journey-conversations/<journey>/generation-N.json` | `save_dedicated_journey_conversation` | The Desktop's projection of the conversation: messages, turns, reconciliation, checkpoints. |
| A4 | Thread-scoped ledger | `dedicated-journey-conversations/<journey>/threads/<threadId>/generation-N.json` | same | The same thing for a non-primary Desktop thread. |
| A5 | Segment manifest | `conversation-segments/<journey>/<threadId>/generation-N.json` | `refresh_conversation_segments` | The chapter structure **of the Pi session** — where compactions fell. |
| A6 | Chapter projections | `…/generation-N.segments/segment-K.json` | `publish_conversation_segment_projections` | The durable content of each closed chapter. |
| A7 | Publication receipt | `…/generation-N.segments/complete.json` | same | What was published: current chapter, message counts, per-chapter hashes. |
| A8 | Turn journal | `turn-journal/<journey>.json` | `admit_turn_journal`, `transition_turn_journal` | The turn's phase, revision, terminal outcome and evidence. Gates recovery. |
| A9 | Mirror append outbox | `mirror-append-outbox.json` | `enqueue_mirror_append_item`, `append_mirror_outbox_item`, `acknowledge_mirror_append_item` | Delivery debt owed to Mirror. |
| A10 | Mirror conversation | remote, in Mirror | Mirror Core | The semantic record outside the Desktop. |
| A11 | Settlement timings | `settlement-timings/<journey>.json` | `append_settlement_timing` | **Diagnostic only.** No authority over anything. |

Supporting files on the same path, not authority: `mirror-append-conflicts.jsonl`,
`mirror-append-rebinds.jsonl`, `mirror-append-recovery-skips.jsonl`, and the desktop conversation
catalog `conversation-spaces/<journey>/catalog.json`.

### 2.1 What is *not* durable

The **Pi invocation lease** is in-memory only, held in `PiProcessState.registry`
(`src-tauri/src/main.rs:5429`). It has no file. It is lost on process exit.

This is load-bearing and easy to misread. `recoverPostTerminalPersistence` consults
`inspectPiInvocations()` to decide whether work is genuinely live, precisely *because* the lease
cannot survive a restart: after a crash nothing claims to be running, so recovery is free to act. A
durable lease would have had to be unwound; an in-memory one unwinds itself. The consequence is that
"is this Journey busy?" is only answerable within one process lifetime.

---

## 3. The sequence

From `executeCompletedSettlement` (`src/app/journeySettlement.ts:136-159`) and
`finalizeCompletedTurn` (`src/app/turnFinalizationCoordinator.ts`), in order, with the artifact each
step touches. Phase names are the labels the CR119 instrument records.

| Step | Operation | Touches | Timed? |
|---|---|---|---|
| 1 | `loadJournal` | A8 | `load_journal` |
| 2 | Require terminal evidence and a `completed` outcome | A8 | — |
| 3 | `loadActiveEvidence` + `validatePreFrontierSettlement` | A2, A3 | `load_active_evidence` |
| 4 | `saveActiveProjection` → `saveProjectedTurnLifecycle` | A3, then A5/A6/A7 | `save_projection` |
| 4a | ⤷ write the ledger | A3 | `save_durable_projection` |
| 4b | ⤷ refresh the manifest **only if a compaction settled**, else load it | A5 | `refresh_segments` / `load_segments` |
| 4c | ⤷ partition and publish chapters | A6, A7 | `publish_segments` |
| 4d | ⤷ reconcile the desktop catalog, for desktop threads only | catalog | `reconcile_catalog` |
| 5 | `loadActiveEvidence` + validate again | A2, A3 | `load_active_evidence` |
| 6 | `cleanupLease` | in-memory lease | `cleanup_lease` |
| 7 | `onLeaseReleased` → publish a frontier presentation | — | **not timed** |
| 8 | `createMirrorAppendOutboxItem` | — | **not timed** |
| 9 | `enqueueOutboxItem` | A9 | `enqueue_outbox_item` |
| 10 | `loadJournal`, `advanceJournal` → `outbox_enqueued` | A8 | `load_journal`, `advance_journal` |
| 11 | `deliverOutboxItem` | A9, A10 | `deliver_outbox_item` |
| 12 | `loadPersistedProjection`, `savePostFrontierProjection` | A3 | `load_persisted_projection`, `save_post_frontier_projection` |
| 13 | `advanceJournal` → `settled` | A8 | `advance_journal` |
| 14 | `acknowledgeOutboxItem` | A9 | `acknowledge_outbox_item` |

Two things are visible here that were not visible before writing it down.

**Steps 7 and 8 are unmeasured.** The CR119 instrument wraps ports. Steps 7 and 8 are not ports, so a
throw in either is invisible to it. CR121 localised production's routine settlement failure to exactly
this gap.

**Publication is asymmetric.** Step 4c publishes only the current chapter on an ordinary turn and
*every* chapter when a compaction settled. So the expensive and risky path runs rarely, which is why
a defect in it can sit latent for days and then fail on one turn in thirty.

---

## 4. What the system actually guarantees

Evaluated over the real production store: 20 Journeys, their active generations, 228 relational
checks. The result splits into three classes, and the split is the finding.

### Class 1 — Identity. Enforced, and never violated.

Every artifact restates who it belongs to, and every write validates it. `validate_run_authority`,
`validate_projection_live_authority` and `validate_conversation_session_authority` refuse a write
whose coordinates disagree.

- A3's `liveIdentity.piSessionId` equals A2's activation receipt.
- A3's `reconciliation.authority.mirrorConversationId` equals A2's generation entry.
- A3's `liveIdentity.generation` and `harnessConversationId` equal the thread's active coordinates.
- A5's `journeyId`, `threadId`, `generation` and `piSessionId` equal A3's.

**Measured: 136 identity claims, 136 hold, 0 violated** — 4 per Journey over 20 Journeys, plus 4 per
manifest over 14 manifests.

Three further Class 1 claims were measured separately and also never failed: A5's `sourceEntryCount`
never exceeds A1's real entry count (14 checks), A3's Pi checkpoint never exceeds it (19 checks), and
A5 declares exactly one `current` chapter (14 checks).

This part of the system works, and it works because it is checked at every boundary.

### Class 2 — Extent. Bounds and lags, not equalities.

Four artifacts carry a count or an extent, and **they do not mean the same thing**:

| Where | Field | What it actually counts |
|---|---|---|
| A3 | `checkpoints.harness.messageCount` | all messages ever in the generation |
| A3 | `messages[]` | only the **loaded window** — the current chapter, since CR114 |
| A3 | `checkpoints.mirror.messageCount` | what Mirror has acknowledged |
| A3 | `checkpoints.pi.entryCount` | Pi entries seen at last settlement |
| A5 | `sourceEntryCount` | Pi entries seen at last manifest refresh |
| A5 | `segments[].turnCount` | turns whose entries fall in a chapter's session range |
| A6 | `conversation.messages[]` | messages the partition assigned to that chapter |
| A7 | `historicalMessageCount` / `totalMessageCount` | what publication last *counted*, not what exists |
| A8 | `terminalEvidence.piExecution.entryCount` | Pi entries at that turn's capture |

The true relations are **inequalities**:

- `A7.totalMessageCount ≤ Σ A6.messages`. Verified: 8 Journeys, 5 strictly lower, 3 equal, **never
  higher**. The receipt is deliberately conservative — when a bundle skips already-published chapters
  it refuses to recompute the total, so the receipt is a lower bound by design.
- `A3.messages[]` and `A3.checkpoints.harness.messageCount` are **not comparable**. Measured across
  20 Journeys: 11 equal, 4 with the array ahead by 1–3 because a turn is in flight, 2 with the
  *checkpoint* ahead by 29 and 98 because the loaded window is bounded, 1 with no checkpoint, 2 with
  the array ahead by 5 and 10 — explained in §5.
- A5 is refreshed only on compaction and A7 only on publication, so both legitimately lag A3. Three
  Journeys currently show A7's `currentLastTurnId` behind A3's last turn.
- A5 is a projection of **A1's compaction structure**, not an index of A6. It therefore declares
  chapters that were never published. Verified: 7 Journeys have a declared chapter with no file, and
  in **every** case the receipt correctly does not claim it.

**None of this is written down anywhere in the codebase.** Three of the five "invariants" this
document set out to verify turned out to be claims the system never made.

### Class 3 — Claims that are not invariants at all

The partition must tolerate, not assume:

- **Anchors need not be distinct.** A compaction's retained tail is shared between the chapter that
  closes and the one that opens, and `firstTurnId` is chosen as the first turn whose entry falls in
  the chapter's range (`src-tauri/src/main.rs:4478-4492`). Two chapters legitimately resolve to one
  turn. Measured: **5 of 14 manifests** have a shared anchor.
- **Anchors need not resolve.** Since CR114 bounds the loaded window, a chapter's anchor can name a
  turn no longer in A3. CR118 made this a cut rather than a throw. Measured: **4 of 14 manifests**
  carry an unresolvable anchor.

---

## 5. What production violates right now

After classification, the honest list of states that no rule explains:

**One genuine data defect.** `mirror-desktop` generation 4, `segment-30`: a closed chapter whose
manifest entry claims 13 turns, whose file is 606,306 bytes, and whose message array is empty. It is
**the only one in the entire store** — 14 manifests, every closed chapter checked. This is CR120, and
its isolation is what makes it credible as a bug rather than a misunderstanding.

**Three Journeys carrying pending delivery with an empty outbox.** `mirror-desktop` (2 turns),
`livro-lideranca-soberana` (2 turns, from 2026-10-02), `alissonvale-com` (1 turn). All three are
classified `conflicted` with `reasonCodes: ["native_id_mismatch", "checkpoint_regression"]`, and
`mirror-append-outbox.json` holds **zero** items. A turn marked `pending` with nothing queued to
deliver it is either debt that recovery can still materialise from Pi entries — which is what
`reconcilePiBackedMirrorDeliveryDebt` exists to do — or debt with no carrier. Two of these are two
days old, which suggests recovery has not done it. That is the unexplained part of §4's message-count
deltas: those messages belong to turns that never settled.

**Journal records parked short of terminal.** `alissonvale-com` has three records at
`terminal_durable`; `mirror-desktop` has one at `terminal_durable` and two at `running`.

**The system already knows.** `checkpoint_regression` is the reconciliation classifier's own reason
code. It is detected, written down, and nothing escalates it. The Journey keeps working, which is why
nobody noticed.

---

## 6. What recovery may do

Recovery is the reason none of the above has lost a conversation, and also the reason none of it was
visible.

`recoverPostTerminalPersistence` refuses to act while `inspectPiInvocations()` reports the Journey
genuinely live, then `convergeDelivery` resumes from whichever durable frontier A8 records:
re-enqueueing, re-delivering, re-acknowledging, or materialising debt from A1's Pi entries when A9
has no item. Every durable write is staged and refuses a late landing — A8 transitions carry native
revision and phase expectations, and A3 writes preserve the previous file on failure — so an
abandoned operation that revives cannot regress a record. It can only lose.

The cost of that safety is the subject of CR121: a settlement whose first attempt fails and whose
recovery succeeds is indistinguishable, from the outside, from a settlement that was merely slow.

---

## 7. The structural finding

**The system has rigorous identity discipline and no extent discipline.**

Identity is restated in every artifact, validated at every boundary, and holds 136 times out of 136
in production. Extent — how many messages, how far the window reaches, which chapter holds what — is
duplicated across nine fields in five artifacts with at least five different meanings, is enforced
nowhere, and is documented nowhere until this page.

Every defect in the chain was an extent defect:

| CR | What it actually was |
|---|---|
| CR114 | the working set's extent was unbounded, so chapters copied whole generations |
| CR116 | the extent of a wait was unbounded |
| CR118 | the extent of what the ledger can still see was assumed total |
| CR119 | the extent of time each phase consumes was unrecorded |
| CR120 | a chapter's extent was written as empty over a file that held it |
| CR121 | the extent of a failed attempt is unrecorded, so routine failure is invisible |

Not one was an identity defect. That is the answer to whether the complexity is unmanageable: the
part of this system that is guarded is fine, and the part that is unguarded has produced six
consecutive defects. The problem is not that there is too much; it is that one whole dimension has no
rules.

---

## 8. Open questions

Recorded, not decided.

- **Can extent be given one definition per concept instead of nine?** `historicalMessageCount`,
  `checkpoints.harness.messageCount` and `Σ A6.messages` are three answers to one question. The
  cheapest honest fix may be to stop storing derived counts and compute them from A6 and A1 on
  demand.
- **Should `checkpoint_regression` escalate?** The classifier detects it and the product ignores it.
  Either it is benign — in which case it should stop being called a regression — or it should be
  visible.
- **Is pending delivery with an empty outbox recoverable?** This decides whether three Journeys hold
  recoverable debt or silently dropped debt. It is answerable by running `convergeDelivery` against
  one of them and watching.
- **Should steps 7 and 8 be inside the instrument?** They are the only unmeasured steps on the path
  and the only ones currently suspected of throwing.
- **Does the asymmetry of step 4c need to exist?** Publishing every chapter on compaction is what
  makes a rare, expensive, high-risk write path. "Publish only the just-closed and current chapters"
  was already recommended as its own CR.

---

## 9. How to reproduce this

The two scripts that produced every number here are read-only, take seconds, and live in the
repository so that this page can be re-checked rather than trusted:

```bash
python3 scripts/diagnostics/settlement_invariants.py
python3 scripts/diagnostics/settlement_classify.py
```

- `settlement_invariants.py` evaluates 16 relational claims over every Journey's active generation
  and reports which hold.
- `settlement_classify.py` classifies each apparent violation as transient, by-design, or
  unexplained.

Both read the user channel's application data directory and write nothing. They inspect whichever
store is present on the machine, so their output is a reading of that machine at that moment, not a
fixture. Every count in this document is from the user channel on 2026-10-04.
