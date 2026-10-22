[< RS025](index.md)

# CR161: Give Every Finishing the Same Exits

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/cr161-unify-finishing`

## Friction

Field occurrence on 2026-10-17, production `v0.2.0-alpha.52` — the build carrying **both** RS025
batches — in the Navigator's own `mirror-desktop` conversation:

> *"Essa conversa acabou de travar no finishing. Forcei o encerramento do app e reiniciei."*

Asked whether the sentence [CR155](cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md)
shipped had appeared — *Still finishing after Ns*, with the native-execution explanation — the answer
was **"não vi a mensagem"**.

Two notices were built for exactly this moment, shipped in `alpha.51` and `alpha.52`, and **neither
could render**. Both were correct in isolation. The defect is between them.

## The Mechanism, Established From the Artefacts and the Code

`alpha.52` shows *Finishing* through **two independent sources**, and every exit is attached to only
one of them.

```text
deriveComposerTurnStatus:
  if (isStreaming || agentRunStatus === "running") return "working";
  if (isFinalizingTurn)                            return "finishing";   ← source 1
  if (mirrorRepairPending)                         return undefined;
  if (reconciliationBlocksInvocation)              return "finishing";   ← source 2
```

**Source 1** sets `isFinalizingTurn`, which is what `selectJourneyRuntimeOwnerPhase` reports as
`ownerPhase: "finalizing"`. CR132's exit and CR155's naming are both attached to it.

**Source 2** is `dedicatedTurnBlocksNewInvocation(dedicatedTurnState)` — true while the turn state is
`provider_running` or `projection_pending`. It sets **nothing** in the runtime state, so `ownerPhase`
is not `finalizing`.

### This occurrence took source 2, and that is established rather than guessed

`finalization_started` is dispatched **inside the settlement path** (`App.tsx:3736`), immediately
before `settlementTimingRegistry.begin(...)`. So:

| fact | evidence |
|---|---|
| the journal never advanced past `running` | the record for `agent-run-2026-10-17T11:27:13…` was still `running` when the app was force-quit, and only reached `settled` at 11:33:52 **after relaunch**, through recovery |
| the settlement therefore never ran | `settlement-timings/mirror-desktop.json` has an mtime of 11:20:52, before this turn; nothing was appended for it |
| so `finalization_started` was never dispatched | it is dispatched only on that path |
| so `isFinalizingTurn` was false, and `ownerPhase` was not `finalizing` | `selectJourneyRuntimeOwnerPhase` derives `finalizing` from `isFinalizingTurn` alone |
| so the surface's *Finishing* came from source 2 | it is the only remaining source |

### Both notices were then silent, for two different reasons

| layer | returned | why |
|---|---|---|
| `settlementAbandonmentOffer` | **`not_finishing`** | `ownerPhase !== "finalizing"` — and `finishingSince` was never set either, since that too is populated by the settlement path |
| `deriveStrandedTurn` | **`not_streaming`** | a surface reading *Finishing* proves `isStreaming` is false, because `deriveComposerTurnStatus` returns `"working"` whenever it is true |

Neither predicate is wrong about its own question. Together they leave the one state the Navigator
actually reaches with no sentence and no exit.

## A Correction I Owe to My Own Batch A

CR155's slice 1 added an allow-list over the refusal union so that a refusal could not be silent by
default. It listed two refusals as **deliberately silent**:

```ts
const deliberatelySilent = new Set(["not_finishing", "too_soon"]);
```

`not_finishing` was listed on the assumption that it means *there is no finishing at all*, and that a
sentence there would appear in front of an idle conversation. **That assumption is false in exactly
the state this CR describes:** `not_finishing` is returned while the composer says *Finishing*. The
predicate's name is true about `ownerPhase` and false about the screen.

So the guard I wrote to stop a refusal from being silent by default is itself the thing that kept
this one silent, by my own explicit listing. That is worse than an oversight and it is recorded here
rather than quietly repaired.

## Expected Behavior

Whatever path puts *Finishing* on the screen, a Navigator who has been waiting long enough is told
what the application believes, and is offered an exit wherever one can be offered safely. No path to
*Finishing* is reachable without the exits that belong to *Finishing*.

## Scope — Planned 2026-10-17

Selected by the Navigator; Driver and Delivery authorised 2026-10-17.

**Scope.** Make the exits key on *the state the surface is in* rather than on the one mechanism that
happens to record it.

- Give source 2 an owner phase. Either `selectJourneyRuntimeOwnerPhase` learns about the
  reconciliation-blocked state, or the composer's two sources are unified into one derived value
  that both the surface and `settlementAbandonmentOffer` read. **The second is preferable**: one
  derivation cannot disagree with itself, and this CR exists because two of them did.
- Open the stranded predicate's gate. `deriveStrandedTurn` and its poll currently require
  `believedStreaming`; they should run while the turn is finishing by either source.
- Reconsider `not_finishing` as deliberately silent once it can no longer be returned while the
  screen says *Finishing*.
- `finishingSince` needs a source for path 2, or the wait cannot be counted and every
  threshold-based notice stays silent regardless of the other repairs.

**Files.** `src/app/composerTurnStatus.ts`, `src/app/journeyRuntimeState.ts`,
`src/app/settlementAbandonment.ts`, `src/app/strandedTurn.ts`, `src/app/App.tsx`, plus tests beside
each.

**Acceptance.** A turn whose journal froze before settlement, with the composer showing *Finishing*,
produces a named sentence after the threshold and an exit where one is safe. The existing
settlement-path behaviour is unchanged. **Negative, and non-negotiable:** an idle conversation and a
healthy long turn acquire neither sentence nor poll — this is what CR115's gate protects, and the
reason the current gate exists.

**Validation.** A fixture per source of *Finishing*, asserting the same sentence from both. A
cross-check that the composer's status and `settlementAbandonmentOffer` are derived from one value,
so they cannot disagree again. The allow-list from CR155 extended to assert that `not_finishing` is
unreachable while the composer reads *Finishing*, which is the guard this occurrence proves was
missing.

**Exclusions.** Does not change what the native terminal path writes, and does not touch the
attribution rule — CR160's B1 is field-verified twice and recovers these turns on relaunch. This CR
is about the wait, not the repair.

**Boundaries.** Not the ledger, and not recovery's own silence — the skips file still has a producer
and no reader, which is CR160's recorded Next Horizon and stays there. Not CR155's remaining slices:
a *measured* exit for a dead lease still depends on `measure_child_liveness` and on reversing CR132's
timeout exclusion, and this CR deliberately offers only exits that are already safe to offer. Not the
composer's responsiveness — CR149 owns that, and the unification here must not add per-second state
to the App root. Does not touch the surface for any Journey other than the selected one.

## Slice Order, and Why It Is This Order

1. **Unify the two sources** into one derived value that both the composer and
   `settlementAbandonmentOffer` read. Structural, and the reason this CR exists.
2. **Give that value a `since`.** Precondition for everything measured by a threshold — without it
   the wait is not countable and every notice stays silent regardless of slices 3 and 4.
3. **Open the stranded predicate's gate** to the unified finishing state, with CR115's negative case
   guarded explicitly.
4. **Re-examine `not_finishing`** in CR155's allow-list, once it can no longer be returned while the
   screen says *Finishing*.

Slices 1 and 2 are a precondition for 3 and 4 producing anything visible at all. **One batch**, which
is a departure from RS025's Batch A/B split and is justified below rather than assumed.

## A Masking I Am Naming Before It Happens

Opening the stranded gate (slice 3) will put a recovery exit on screen at roughly the 10-second grace.
CR155's naming sentence fires at 60 seconds. **So a Navigator who acts on the recovery exit will never
reach the sentence**, and the field verification CR155 is still owed becomes unobtainable by the same
mechanism that made CR160's B2 unobservable.

That is the Batch A/B argument again, and it points at splitting. **I am deliberately not splitting.**
Shipping the naming alone first would verify my fixture at the cost of leaving the Navigator another
cycle with no exit from a state they have now hit three times in two days — optimising my measurement
over their use of the application. The recovery exit is the better outcome and it ships with the rest.

**Consequence, accepted and recorded:** CR155's 60-second sentence will be verified by fixture and by
the allow-list guard, not by the field, and it must not later be claimed as field-verified. This is
the same limit I failed to notice for B2, named in advance this time.

## Implemented (2026-10-17)

All four slices, one batch, on `refinement/cr161-unify-finishing`. Written test-first: the new file
failed to load on a missing export before any source changed.

**Slice 1 — one derivation.** `deriveComposerFinishing` in `composerTurnStatus.ts` returns
`{ source: "settlement" | "reconciliation", since }` from the status the composer actually draws, or
`undefined`. `settlementAbandonmentOffer` and `settlementAbandonmentPresentation` take `finishing`
in place of `ownerPhase` + `finishingSince`; `SettlementAbandonmentNotice` takes the same prop and
watches on it. `App.tsx` derives it once and hands it to the offer, the notice and the predicate.

**Slice 2 — a countable start.** The settlement source keeps the settlement's own clock. The
reconciliation source dates the wait from **the provider's commit** — `pi.committedAt` on the newest
Nautilus turn — a durable timestamp the conversation already carries, chosen over a renderer clock
that would reset on every selection change and could carry a stale start into a new turn.

**Slice 3 — the gate.** `deriveStrandedTurn` takes `believedFinishing` beside `believedStreaming`;
the poll is gated on either. The reason `not_streaming` is renamed **`not_live`**, because the old
name had become false of what the gate checks. `believedRunFromJournal` supplies the run to compare
against when the runtime entry is already gone — the reconciliation source sets nothing in the
runtime state, and `cleanup` removes an entry that is neither streaming nor finalizing, so in the
field state the predicate would otherwise have returned `no_believed_run` even with the gate open.

**Slice 4 — `not_finishing`.** Stays deliberately silent, now by proof rather than assumption: an
exhaustive guard enumerates every input `deriveComposerTurnStatus` accepts and asserts the offer
never returns `not_finishing` while the status is `finishing`, and always does otherwise. The
allow-list in CR155's test says so in a comment at the listing.

### Two deviations from the planned scope, found while writing the code

- **The act bailed on a missing runtime identity.** `abandonSettlementWait` returned early when
  `selectedRuntime.identity` was undefined — which the reconciliation source always is. An offered
  button that does nothing is a label that lies. The bail is removed; the flag-clear is guarded on
  the identity and the durable convergence runs regardless. A source guard pins it.
- **One path to *Finishing* still has no countable start.** When the dedicated thread is not ready,
  `reconciliationBlocksInvocation` is `classification !== "in_sync"` with no committed turn to date
  from. There `since` is left `undefined` and every threshold notice stays silent, by design, rather
  than counting from an invented moment. The stranded predicate does not depend on `since` and is
  unaffected. Bounded residue, named.

### Fixtures, positive and negative

The field values verbatim: admitted `11:27:13.196Z`, provider commit `11:32:05.653Z`, force-quit
≈ `11:33:30Z`. The notice is derived at commit + grace + 1 ms and asserted to fall **before** the
force-quit. Negatives: idle composer derives no finishing; neither-streaming-nor-finishing is
`not_live` even with a terminal leaf; a non-terminal leaf in the finishing state is `journal_agrees`.

### Guards narrowed, with their reasons

- `settlementAbandonmentNotice.test.tsx` — the `watching` guard pinned `ownerPhase === "finalizing"`;
  it now pins `finishing !== undefined`, the same claim on the new input.
- `strandedTurnVisibility.test.ts` — the poll-gate guard pinned `if (!isStreaming`; it now pins the
  widened gate as the only gate, and its name says *streaming or finishing*.
- Four `ownerPhase` fixtures migrated pairwise to `finishing`, `"running"`/`undefined` → `undefined`.

### Gates

`tsc --noEmit` clean · `npm run build` clean · vitest **268 files / 2,218 tests** (from 267 / 2,204:
one new file, fourteen new tests, nothing removed) · Rust untouched.

## Dev Build Carrying CR161 (2026-10-17)

`/Applications/Mirror Desktop Dev.app`, `ai.mirrormind.desktop.dev`, `0.2.0-alpha.52` (the version
string does not distinguish builds; the hash does). Binary
**`7942ab69eaa69684cbe1cace797d0d80b7354dc639b86da631ce31dfa0c330ac`**, byte-identical to the built
bundle. Previous Dev `d4137adf…` backed up to `/tmp/Mirror Desktop Dev-20261017-100623.app`, hash
verified before removal; `ps` gate anchored on the bundle path, clean before the backup and again
before the copy.

Frontend proof in the bundled `dist`: `"not_live"` ×1 and `"reconciliation"` ×1 present;
`not_streaming` ×0 and an invented control ×0 absent; `dist` mtime precedes the binary's.

**What Dev can verify:** the negative case only — a healthy turn on Dev's own data shows *Finishing*
briefly and draws no sentence, no button and no stranded notice. A GUI check, the Navigator's.

**What Dev cannot verify:** the positive case. Dev does not read the production Journeys, and no
turn can be made to freeze before settlement on command. The field falsifier runs on production
after release: the next turn that freezes at *Finishing* should draw *This turn has already finished*
with Recover about ten seconds after the provider's commit, and `not_live` should appear nowhere.
**If a turn freezes at *Finishing* on the released build and nothing is drawn within a minute, this
CR is refuted**, not merely unverified.

## Production Reading on alpha.53 (2026-10-18T01:31Z)

Production upgraded by the Navigator and confirmed by hash: `d24caa0c…`, pid 10107. See
[alpha-53-production-reading-2026-10-17.md](../../../update/alpha-53-production-reading-2026-10-17.md).

**The falsifier stands open.** No turn has frozen at *Finishing* on this build. Two turns recorded so
far, one cancelled and one live, so the negative case is barely exercised and the positive case not at
all. The recovery-skips file is unchanged at 14 records, so nothing refused across the upgrade.

## What Cannot Be Established

**Nothing durable records which notice was on screen.** The Navigator's *"não vi a mensagem"* is
consistent with the mechanism above, but it cannot be distinguished from a notice that rendered and
was not noticed. The mechanism is established from the artefacts and the code; the observation is
corroboration, not proof.

That absence is itself a candidate finding: every other claim in this Refinement Story has been
settled from a durable artefact, and this one could not be.

## Provenance

Production app data read on 2026-10-17, read-only, with production running at pid 95585. Journal,
Pi session JSONL, settlement timings and `mirror-append-recovery-skips.jsonl` inspected directly.
`deriveComposerTurnStatus`, `selectJourneyRuntimeOwnerPhase`, `dedicatedTurnBlocksNewInvocation`,
`settlementAbandonmentOffer`, `deriveStrandedTurn` and the `finalization_started` dispatch site read
from source. Nothing was written to production state.

## Second Field Occurrence (2026-10-22) — the falsifier could not be scored

Production `v0.2.0-alpha.55`, this Journey's main thread: eleven minutes at *Finishing* between the
provider's commit (13:35:16Z) and a forced relaunch (≈13:46:18Z). Full evidence and mechanism in
[CR163](cr163-a-hung-mirror-append-freezes-every-exit.md); what belongs here is what it does to this
CR's claims.

**This one took source 1, not source 2.** The journal advanced to `outbox_enqueued`, so
`finalization_started` was dispatched and the settlement flag — not the reconciliation block — held
the screen at *Finishing*. The lease had already been released inline, so this is not CR155's
live-lease case either. The settlement then hung inside its deliver step, which is a third shape
neither occurrence had produced before: settlement started and never finished.

**The unification behaved correctly on its own inputs — measured, not argued.** Today's state fed
through the real derivations: with the frozen record in renderer state, `deriveStrandedTurn` says
`stranded / journal_terminal`; the abandonment offer, with the lease released and 71 s waited, says
`offered`. The notices this CR built were the right ones for this state.

**But the inputs were starved, and the acts were dead.** The stranded poll refreshes the journal
through a serialized native command that was queued behind the hung deliver, and its `catch` is
deliberately silent; the leaf read is serialized too. Whatever rendered from already-held state
offered acts — Recover, Stop waiting — that dispatch into the same queue. The defect is below this
CR's repair, and is captured as CR163 rather than reopening this one.

**The falsifier returns no verdict, for the second time, for the same reason.** *"If nothing is
drawn within a minute, this CR is refuted"* requires knowing what was drawn, and nothing durable
records that. The Navigator's testimony — blocked, a button that did nothing, the reset disabled —
is consistent both with notices that rendered dead and with notices that never rendered. This is now
the recurring cost of the same recorded debt, and it blocks this CR's own acceptance from ever being
field-scored while it stands.
