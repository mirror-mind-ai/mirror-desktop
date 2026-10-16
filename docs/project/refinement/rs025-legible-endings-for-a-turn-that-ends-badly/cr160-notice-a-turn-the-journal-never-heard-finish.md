[< RS025](index.md)

# CR160: Notice a Turn the Journal Never Heard Finish

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs025-batch-b-exit`

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

## Correction: Something Did Notice, And Refused, And Wrote Why (2026-10-16, evening)

**The section below is wrong and is kept so the correction is legible.** It claimed nothing noticed.
Something did. The repair this CR proposes is not a detector that is missing; it is an attribution
rule that refuses.

`reconcile_pi_backed_mirror_delivery_debt` scans for exactly `Admitted | Running` with no terminal
outcome and no cancellation, and `recover_one_stale_journal_record` would have written
`TerminalDurable` / `completed` with full `piExecution` evidence from the preserved Pi turn. CR128
built it for precisely this shape. **It ran, and it refused**, and it recorded the refusal in a file
this CR did not know existed:

```text
mirror-append-recovery-skips.jsonl
  recordedAt 2026-10-16T13:14:25.189Z
  journeyId  alissonvale-com
  runId      agent-run-2026-10-16T13:00:42.068Z
  reason     mirror_append_pi_recovery_ambiguous
  recoveredInSameAttempt 0
```

### The arithmetic that refuses

`attribute_stale_pi_record` computes a **single high-water mark** — `frontier`, the maximum
`entryCount` across every claimed `piExecution` in the thread — and then counts user requests beyond
it. Measured against the live production artefacts:

| quantity | value |
|---|---|
| related records (thread, generation, session) | 15 |
| records with claimed `piExecution` | 12 |
| `frontier` (max claimed `entryCount`) | **102** |
| entries on the active Pi branch | **102** |
| stale records (`admitted \| running`) | **1** |
| unclaimed requests beyond the frontier | **0** |

`if stale.len() != requests.len()` → `1 != 0` → `mirror_append_pi_recovery_ambiguous`.

**A later successful turn destroyed the stranded turn's recoverability.** The turn at 14:10:56
settled `completed` and claimed `entryCount: 102` — the whole branch, including the stranded turn's
own request and answer at the end of it. Because the frontier is one high-water mark rather than a
per-turn claim, those entries stopped being *unclaimed*, so `requests` fell to zero while `stale`
stayed at one. The refusal is now **permanent by construction**: no future state can make a count of
zero equal a count of one.

**A limit on this measurement.** The numbers above are today's. The skip was written at 13:14:25,
before the 14:10 turn existed, so the arithmetic *at that moment* was different and is **not
established** — the frontier was lower and some count mismatch other than 1-vs-0 produced the same
reason. What is established is that it refused then, and that it can now never do anything else.

### The record survived an app restart and a version upgrade

Eleven hours later, across a quit, a relaunch, and the upgrade from `alpha.50` to `alpha.51`, the
record still reads `phase: running`, `updatedAt 2026-10-16T13:00:42.119Z`, `revision 2`,
`piExecution: null`. It is a permanent orphan in the Navigator's journal.

**What did come back was the answer, and not by a recovery path.** The 1,877-character response is
now in the durable conversation, which grew from 26 to 28 messages at 14:11:29 — written as a side
effect of the *next* turn's projection. Had the Navigator not sent another message, it would still
be missing. An earlier statement of mine that a restart would recover it was half right and the half
matters: the answer was restored, the record never was.

### What this does to the scope

The proposed scope below — a second comparison inside `deriveStrandedTurn` — is still worth doing for
the **renderer's** silence, which is a real and separate defect. But it is no longer the centre.
The centre is that the native recovery is **effectively non-functional in the field**, and the
evidence is its own file: **12 refusals across 5 Journeys between 2026-10-02 and 2026-10-16, with
`recoveredInSameAttempt: 0` on every single one.** Ten `ambiguous`, two `request_open`. In two weeks
it has never once recovered anything.

That census also means `mirror-append-recovery-skips.jsonl` joins the standing list of **producers
with no reader**: nothing surfaces it, and this CR found it only by reading the code that writes it.

Three questions this opens, none answered here:

- Should the frontier be **per-turn claims** rather than one high-water mark? That is the change that
  would make this record attributable, and it is a change to durable-state semantics, not a surface.
- Should a refusal be **visible**, given that the reason was on disk eleven hours before anyone read
  it? That is RS025's criterion applied to recovery rather than to a turn.
- Does `1 != 0` deserve its own reason, separate from `ambiguous`? *Nothing left to attribute* and
  *too many candidates to choose between* are different facts wearing one name.

## Why Nothing Noticed

`deriveStrandedTurn` cannot see this state **by construction**. `"running"` is not in
`TERMINAL_PHASES`, so the predicate returns `journal_agrees` — and its own comment names that case
*"the ordinary case, and a long turn's case"*. Using the journal alone, a frozen `running` is
indistinguishable from a legitimately long turn.

The predicate was built on an explicit premise, written into
[CR142](../rs016-ongoing-product-improvements-and-adjustments/cr142-stop-losing-a-turn-the-journal-already-answered.md)'s own module doc: *"The journal is
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

~~Recorded so it can be decided. Not selected, nothing implemented.~~ **Planned 2026-10-16 as RS025 Batch B**, after Batch A ships and is field-checked. Nothing implemented yet.

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

## Re-scoped for Batch B (2026-10-16, evening)

The Proposed Scope above was written before the correction. It survives as one half. The other half
is the one the correction made necessary, and it comes first.

### B1 — native: attribute by admission window and per-turn claims

`attribute_stale_pi_record` currently derives a single high-water `frontier` from the maximum
claimed `entryCount` and refuses unless *every* stale record in the thread pairs one-to-one with
*every* unclaimed request beyond it. Two field states break that, both now established from durable
data — `1 != 3` at 13:14 (two interrupted records with `piExecution: null` left their requests
unclaimed) and `1 != 0` tonight (a later turn's claim swallowed the stranded request).

The repair drops the frontier and the global count. Per-turn claims are **already on disk**: every
`piExecution` records its `userEntryId`. For the one stale record being attributed, the window is
`[createdAt, next admitted record's createdAt)` over the same thread, generation and session; the
candidates are the unclaimed user requests inside that window.

| candidates | verdict |
|---|---|
| exactly one, answered inside the window | `Closed(turn)` |
| exactly one, unanswered, window bounded by a later record | `Interrupted` |
| exactly one, unanswered, window unbounded | `request_open` (unchanged) |
| more than one | `ambiguous` — now meaning only what the word says |
| none, window bounded | `Interrupted` — the session moved on past a run that never wrote its prompt |
| none, window unbounded | `request_missing` — **new**, because *nothing to attribute* is not *too many to choose* |

**Acceptance.** A fixture in the field's exact shape — one settled claim, two interrupted records
with null evidence and their orphan requests, one stale record whose request is answered, one later
settled claim past all of it — attributes the stale record `Closed` to its own request. The CR128
fixtures still pass: a restart-and-continue still interrupts the first and closes the second, and two
records with one request are still refused. **Negative:** two stale records admitted inside one
request's window stay `ambiguous`.

**Exclusions.** The existing `recover_one_stale_journal_record` and `interrupt_stale_journal_record`
are not changed; only the verdict they act on is. The skips file still has no reader — that is the
second open question and is not this slice.

### B2 — renderer: notice the shape, with the exit it now has

A new native command `inspect_pi_session_leaf` reads **only the last line** of the session file —
the branch leaf by construction, since `project_active_pi_branch` starts from `entries.last()` —
and returns its id, type, role, `stopReason` and timestamp. O(1), no branch projection, nothing CR114
had to bound.

`deriveStrandedTurn` gains an optional `piLeaf`. When the journal says `admitted | running` for the
believed run and the leaf is an assistant `stop | length` entry timestamped at or after the record's
`createdAt`, and that leaf is older than `STRANDED_SETTLEMENT_GRACE_MS`, the turn is stranded with a
second shape, `journal_never_heard`. The poll calls the leaf command **only in the `journal_agrees`
branch**, so an idle Journey and a turn the journal already settled never pay for it.

The notice names the shape — the agent finished and the record never heard it — and offers the
**same button**, because `recoverPostTerminalPersistence` → `convergeDelivery` →
`reconcile_pi_backed_mirror_delivery_debt` → `attribute_stale_pi_record` is already the route, and
B1 is what makes it succeed.

**Negative fixtures, each its own test.** Leaf is a `toolUse` assistant, a user entry, a
`toolResult`, a `context_edit`, or an assistant with no `stopReason` → `journal_agrees`, however
long the turn. Leaf terminal but younger than the grace → `settling`. Leaf terminal but older than
the record's admission → `journal_agrees`, because it is the previous turn's answer.

### Why B1 before B2

B2 without B1 would offer a button that fails, and say *recovering brings the answer back* over a
refusal. That is a promise that lies, and worse than the silence it replaces. B1 without B2 already
makes a **restart** recover the turn, which today it does not; B2 is what makes the exit not be a
restart, which is RS025's criterion.

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

## Implemented (RS025 Batch B, 2026-10-16)

On `refinement/rs025-batch-b-exit`. Gates: vitest **267 files / 2,204 tests**, `tsc` clean, frontend
build clean, `cargo test` **332 passed**, no new warnings. Not merged, not released.

### B1 — the attribution rule

`attribute_stale_pi_record` no longer derives a high-water `frontier` or compares two counts. It
collects the per-turn claims already on disk (`pi_execution.user_entry_id` across the thread),
bounds this record's window at `[created_at, next admitted record)`, and judges the unclaimed user
requests inside it: one answered → `Closed`; one unanswered → `Interrupted` if bounded, else
`request_open`; none → `Interrupted` if bounded, else the new `request_missing`; several →
`ambiguous`, now meaning only what the word says. `project_unclaimed_pi_requests` was removed with
its frontier.

**The field falsifier, run read-only against production.** A temporary test loaded the real
`turn-journal/alissonvale-com.json` and the real session file, called the new rule on the frozen
record, and was removed after one run. Verdict:

```text
record  phase=Running  created=2026-10-16T13:00:42.072Z
Closed  user=6ee82176  assistant=81b3007d  started=13:00:44.124Z  committed=13:01:49.786Z  entry_count=98
```

That is the answer that sat unreachable all day, attributed to its own request by the record's own
window, with the later 14:10 claim no longer in its way. Nothing was written to production.

**Guards narrowed, not deleted, with the reason in each.** CR128's Rust test *"still refuses when
records and requests cannot pair"* and CR108's *"one unrecoverable stale record does not block
another"* had pinned the count rule's verdicts; each now asserts the window rule's verdict for the
same fixture and says why it changed. CR108's fixture also feeds one session's branch to another
session's records, which the real recovery never does — noted in the test rather than papered over.
Four TS source guards over the Rust in `restartAndContinueRecovery.test.ts` pinned the *mechanics*
(`frontier`, `.len() !=`); they now pin what CR128 actually established — requests not closed turns,
positive evidence for interruption, visible text only — plus the absence of any length comparison.

### B2 — the renderer

A new serialised command `inspect_pi_session_leaf` reads the session file's **tail only**, widening
from 64 KB until it holds a whole line, and returns the leaf's id, type, role, `stopReason` and
timestamp. Tested on an ordinary tail, a trailing blank line, a final entry wider than the first
window, a header-only file and a non-message leaf. The command census guard moved 90 → 91.

`deriveStrandedTurn` gains `piLeaf` and a `shape`. In the branch that used to be only
`journal_agrees`, a leaf that is an assistant `stop | length` timestamped at or after the record's
admission, and older than the grace, strands the turn as `journal_never_heard`; CR142's path is now
`journal_terminal`. The poll reads the leaf **only** when the newest record on the thread is still
`admitted | running`. The sentence names the shape and the button is the same one, because B1 is
what makes it succeed.

**Negative fixtures, each asserted.** Leaf `toolUse`, no `stopReason`, user, `toolResult`,
`context_edit`, `compaction`, `error` → `journal_agrees` even an hour on. Leaf terminal but inside
the grace → `settling`. Leaf terminal but before admission → `journal_agrees`. No leaf → unchanged.
A terminal journal keeps CR142's shape whatever the leaf says.

### Field check owed

On a build carrying this: the next frozen `running` must show *This turn has already finished* with
the *never heard* sentence after the grace, and **Recover this turn** must bring the answer into the
conversation. On production specifically, the orphan from 13:00:42 is now attributable, so the first
`convergeDelivery` on `alissonvale-com` after upgrading should recover it unprompted and the skips
file should stop growing for that run.

### Not done here

The skips file still has no reader, and a refusal is still invisible while it is being made. That is
the second open question above and stays open.

## Dev Build Carrying Batch B (2026-10-16)

Source `08edb29` on `refinement/rs025-batch-b-exit`. Installed at `/Applications/Mirror Desktop Dev.app`,
binary **`d4137adff90f99549d4fa404ecd2544b91382714016c2d9e3765419c8c614c37`**, replacing Batch A's
`03cc4fba…` (backup `/tmp/Mirror Desktop Dev-20261016-195041.app`, hash-verified before removal). Identity `ai.mirrormind.desktop.dev` checked
before the destination was touched; `ps` gate passed twice, anchored on the process path.

**Shipped-chain evidence.** `dist/assets/index-*.js` 19:47:44 precedes the binary 19:49:42; installed
hash equals built hash. In the bundle: `never heard it end` 1×, `in its session, but the turn` 1×,
`inspect_pi_session_leaf` 1× (the invoke name — the only grep-visible trace of the native half),
`journal_never_heard` 2×, `Recover this turn` 1× (unchanged), Batch A's sentence still 1×. Invented
control literal 0×. The Rust attribution change introduces no frontend literal and is covered by
`cargo test` and the read-only production probe above.

**Field steps on Dev.** Dev does not read production Journeys, so the production orphan cannot be
exercised here; the stranded shape is not provokable by hand either. What Dev can show: no false
positive on an ordinary long turn (the negative case), and the leaf read appearing in no notice
while a turn runs. The positive case waits on the next frozen `running` in the field, or on the
production upgrade recovering the 13:00 orphan on its first `convergeDelivery` of `alissonvale-com`.
