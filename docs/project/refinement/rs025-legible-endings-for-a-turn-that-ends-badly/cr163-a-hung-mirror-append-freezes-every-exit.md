[< RS025](index.md)

# CR163: A Hung Mirror Append Freezes Every Exit

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Field occurrence on 2026-10-22, production `v0.2.0-alpha.55`, Journey `mirror-desktop`, main
thread. A turn's answer was committed by the provider at 13:35:16Z and the application then showed
*Finishing* until the Navigator quit it at ≈13:46:18Z — eleven minutes. Their report, typed into a
sibling Conversation because the main one had become unreachable:

> *"o Try again nao funcionou e o reset não estava habilitado para eu reiniciar. A conversa
> principal da journey não está mais acessível pra mim. Fiquei bloqueado sem poder usar o journey
> novamente."*

## What Happened, Established From the Artefacts

Run `agent-run-2026-10-22T13:34:35.721Z`:

| time (UTC) | fact | evidence |
|---|---|---|
| 13:34:35 | turn admitted | journal `createdAt` |
| 13:35:16 | provider committed the answer | `piExecution.committedAt` |
| ≈13:35:19 | inline settlement reached `outbox_enqueued` | the settle receipt expected exactly that phase |
| 13:35:20 → 13:46:15 | **nothing** — no surviving write anywhere in app data | mtime sweep of the data directory |
| ≈13:46:18 | Navigator quits and relaunches | process start time |
| 13:46:26–33 | recovery settles the turn in 6,246 ms via `pi_backed_outbox` | CR129's first field record |

The inline attempt got **past** `cleanup_lease` and `notify_lease_released` — the recovery record
has no lease phases because there was no lease left to clean — and the outbox item existed, because
recovery's `deliver_outbox` delivered it. So the hang was inside the next inline step:
**`deliver_outbox_item`, the Mirror append, which ran for eleven minutes without returning and
without throwing.** No settlement-timing record was written for the inline attempt — the freeze
precedes the write by construction — and the recovery-skips file is unchanged at 14 records.

## The Defect

Three facts compose it, each individually reasonable:

1. **The append has no bound.** `run_explicit_mirror_append` spawns
   `uv run python -m memory conversations append …` and waits on the child with no timeout. The
   child's stderr is discarded, so a hang leaves no trace of its cause.
2. **The deliver holds the global lock while it waits.** `deliver_pi_backed_mirror_outbox_item`
   acquires the native command serialization mutex — CR149's explicit restoration of the main
   thread's accidental serialisation — as its first statement, and holds it across that unbounded
   wait.
3. **71 commands acquire the same mutex**, including loading a thread, loading a Conversation,
   reading the journal, inspecting the session leaf, inspecting occupancy, and saving drafts.

So one hung append queues the application's entire native data layer behind it. That is every
symptom the Navigator reported: the main Conversation could not load (its load is serialized), a
sibling Conversation could not work either, *Reset session controls* was disabled
(`isFinalizingTurn` never clears because the settlement's `await` never returns), and whatever
button they pressed dispatched work into the same queue and did nothing.

## Why CR161's Exits Could Not Help — Measured

The derivations themselves are correct for this state. Fed today's reconstructed inputs through the
real functions:

| probe | result |
|---|---|
| `deriveStrandedTurn`, frozen record present in renderer state | `stranded: true`, shape `journal_terminal` |
| `deriveStrandedTurn`, record absent from renderer state | `no_record` |
| `settlementAbandonmentOffer`, lease released, 71 s in | `offered: true` |
| `settlementAbandonmentPresentation`, stale active lease, 71 s in | `refusal_named`, the CR155 sentence |

The starvation is upstream of them. The poll that would refresh the journal into renderer state and
advance the stranded clock calls `loadTurnJournal` — a serialized native command, queued behind the
hung deliver — and its `catch` is deliberately quiet. The leaf inspection is serialized too. So the
predicates were evaluated against frozen inputs, and even where a notice could render from
renderer-side state alone (the abandonment offer needs only the finishing clock and the last known
occupancy), **every act it offers routes through the same mutex**. An exit that renders is not an
exit when its act joins the queue that is the defect.

## What Cannot Be Established

- **Why the append hung.** The child's stderr goes to null and nothing captures its stdout until it
  exits. Provider timeouts occurred in the same window (13:21–13:24), so degraded network is
  plausible context — `uv run` can touch the network — but that is context, not proof. The same
  item delivered in 1,659 ms at recovery.
- **Which notices rendered.** Nothing durable records what was on screen. This is the third
  occurrence where that absence blocks a verdict; the debt is no longer incidental.
- **What "Try again" the Navigator pressed.** No notice in this state carries that label; the
  candidates are settings-area buttons or loose phrasing. Unknown referent, recorded as such.

## Boundaries

- Not CR155's case: the lease was already released; `measure_child_liveness` has nothing to add here.
- Not CR161 reopened: its unification behaved correctly on its own inputs; the inputs were starved.
  Its falsifier remains unscorable for this occurrence and that is recorded there.
- Not CR142's lost `done`: the `done` arrived and settlement ran; it is the settlement itself that hung.

## Candidate Direction (not scope — capture only)

A bound on the append child wait, with the timeout surfacing as an ordinary deliver failure — the
`mirrorCommitError` path already draws a *Repair synchronization* button and recovery already
completes this exact delivery. Preserving CR149's serialisation semantics is a constraint, not a
casualty: the bound belongs on the child, not on the mutex. Capturing stderr within a size bound
would let the next hang name its cause.

## Provenance

Production app data read on 2026-10-22, read-only. Journal, settlement timings, recovery skips,
outbox and preferences inspected directly; mtime sweep over the data directory for the freeze
window. `run_explicit_mirror_append`, `deliver_pi_backed_mirror_outbox_item`,
`native_command_serialization.rs`, the stranded poll and both derivations read from source at
`cb85f47`. Probes ran the real derivations and were removed; nothing was committed with them and
nothing was written to production state.
