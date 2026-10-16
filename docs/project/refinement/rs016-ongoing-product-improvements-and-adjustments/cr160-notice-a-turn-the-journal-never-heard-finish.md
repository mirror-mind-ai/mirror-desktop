[< RS016](index.md)

# CR160: Notice a Turn the Journal Never Heard Finish

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Field occurrence on 2026-10-16, production `v0.2.0-alpha.50`, Journey `alissonvale-com`, conversation
*"Comunidade Alisson Vale"*, reported as the second that day in the same conversation:

> *"Obtive resposta, mas ele ficou parado em 'Finishing'. O composer não libera o cancelamento e não
> tenho como sair da situação a não ser forçando o encerramento do app."*

The answer existed. The app never learned that it did.

## The Mechanism

The turn **succeeded**. Pi produced a complete answer at `13:01:49.786Z` — `stopReason: "stop"`,
model `gpt-5.6-terra`, 1,877 characters, after two tool calls.

The turn journal record for `agent-run-2026-10-16T13:00:42.068Z` reads:

```text
createdAt  2026-10-16T13:00:42.072Z
updatedAt  2026-10-16T13:00:42.119Z     ← 47 ms later, and never again
phase      running
```

Six minutes after the answer it was still `running`. No `terminal_durable`, no `projected`, no
`outbox_enqueued`, no settlement record of any kind for the run.

**The native terminal path never ran, so the one durable source every recovery layer trusts never
heard the turn finish.**

## Why Nothing Noticed

`deriveStrandedTurn` cannot see this state **by construction**. `"running"` is not in
`TERMINAL_PHASES`, so the predicate returns `journal_agrees` — and its own comment names that case
*"the ordinary case, and a long turn's case"*. Using the journal alone, a frozen `running` is
indistinguishable from a legitimately long turn.

The predicate was built on an explicit premise, written into
[CR142](cr142-stop-losing-a-turn-the-journal-already-answered.md)'s own module doc: *"The journal is
durable and already correct."* **Here the journal is the stale thing**, and that premise is exactly
what this occurrence falsifies.

Downstream, occupancy was never released, so
[CR155](cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md)'s abandonment
offer refuses as well, and its refusal is never rendered. Those are CR155's scope; this CR is about
the freeze itself.

## How This Differs From CR142

CR142's observed case: **journal terminal, renderer stale** — recoverable, because a correct durable
record existed to recover *to*.

This case: **journal never advanced** — so the loss happened *upstream* of the journal write, not
between the journal and the renderer. CR142's repair cannot reach it and CR142's recorded loss
mechanism remains unestablished; it named two candidates, both silent by construction, and this
occurrence is consistent with both and settles neither.

Same family, one step earlier, and CR142's debt is the reason this had no net.

## A Durable Discriminator Already Exists

This is what makes the CR actionable rather than a complaint. **Two artefacts contradict the journal,
both already written to disk:**

| artefact | state | time |
|---|---|---|
| turn journal | `phase: running` | 13:00:42.119 |
| projection manifest `generation-1.json` | `sourceEntryCount: 98` | **13:01:49** |
| Pi session JSONL leaf | `stopReason: "stop"` | **13:01:49.786** |

The projection manifest advanced **after** the journal froze, so something in the app did observe the
answer. A detector does not need a new source of truth — it needs to compare two it already has.

## Expected Behavior

A turn whose journal is `running` while the transcript authority holds a terminal leaf for the same
run is recognised, named to the Navigator, and recoverable without restarting the app. A legitimately
long turn must stay untouched.

## Proposed Scope

Recorded so it can be decided. **Not selected, nothing implemented.**

**Scope.** Extend the stranded predicate with a second, independent question: for the run the
renderer believes is live, does the transcript authority hold a terminal leaf while the journal does
not? Treat that disagreement as stranded and route it through the recovery that already exists.

**Files.** `src/app/strandedTurn.ts` (a new reason and the second comparison),
the Pi-leaf read it needs, `src/app/App.tsx` (the derivation call), tests beside each.

**Acceptance.** A frozen `running` record with a terminal Pi leaf is reported as stranded. **A long
healthy turn, whose Pi leaf is not terminal, is still `journal_agrees`** — this is the clause that
protects every ordinary turn and must have its own test. Recovery brings the answer into the
conversation, as it already does for CR142's shape.

**Validation.** A fixture built from this occurrence's exact shape: journal `running` at `t`, Pi leaf
`stopReason: "stop"` at `t + 67 s`. A control per guard. The long-turn clause gets a **negative**
fixture — Pi leaf mid-stream, journal `running` — because a detector that fires on healthy turns is
worse than the defect it replaces. `deriveStrandedTurn` is total by construction and must stay total:
the new path returns a named reason, never a silent `false`.

**Exclusions.** Does not establish CR142's loss mechanism, and must not claim to. Does not change
what the native terminal path writes. Does not touch the abandonment offer or its silence, which are
CR155's.

## Open Questions

- **The first occurrence that day left no frozen record.** The journal holds only this one `running`
  freeze plus the two `process_died` entries from
  [CR159](cr159-say-why-the-provider-refused-a-turn.md). Either the earlier one was reconciled on
  relaunch, or it had a different shape. Not established.
- **Why the terminal path did not run** is the same unestablished question CR142 left open. This CR
  deliberately does not depend on the answer — the detector compares outcomes, not causes.

## Collateral

The durable conversation holds the Navigator's prompt **three times**, once per failed turn across
this occurrence and CR159's two, and ends with an **empty assistant message**. The 1,877-character
answer lives only in the Pi JSONL. It was extracted and returned to the Navigator directly, so the
answer itself was never at risk.

## Provenance

Production app data read on 2026-10-16, read-only, with production running at pid 27709. Nothing was
written to production state. Journal, Pi session JSONL, projection manifest, segment files, dedicated
conversation record, settlement timings and outbox inspected directly. A contention hypothesis —
settlement in another Journey starving this one behind the global native-command guard — was
**checked and refuted**: no settlement of any Journey between 12:58Z and 13:10Z, and an empty outbox.
