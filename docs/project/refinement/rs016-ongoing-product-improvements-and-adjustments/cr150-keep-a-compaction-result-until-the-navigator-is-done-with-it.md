[< RS016](index.md)

# CR150: Keep a Compaction Result Until the Navigator Is Done With It

**Status:** done
**Driver:** assistant
**Delivery:** `refinement/cr150-keep-a-compaction-result`
**Navigator priority:** 2 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"mensagem com o resultado da compactação deve ficar presente até
o usuário clicar em fechar ou mandar novo turno"*

A successful compaction's result disappears before the Navigator has finished with it.

## This Reverses a Deliberate Decision, and That Is the Point

The disappearance is not a bug. `compactionNoticeLifecycle.ts` decides it on purpose, and states its
reasoning in its own comment:

```ts
/**
 * CR104: a success and a benign refusal are both confirmations and have done their job once
 * read, so they may fade. A failure is a statement that is still true afterwards […]
 */
export function compactionNoticeLifecycle({ status, nothingToDo }: CompactionNoticeState): CompactionNoticeLifecycle {
  return nothingToDo || status === "completed" ? "transient" : "sticky";
}
```

So a `completed` compaction is `transient` by design, and a failure is `sticky`. CR104 reasoned that a
success has done its job once read. **Real use says it has not** — which is the only evidence that
could have settled it, and it arrived from the Navigator rather than from review.

The asymmetry CR104 built is still half right: a failure must stay. What this CR changes is the claim
that a success is finished once displayed.

### Why the premise was wrong is worth recording

A compaction result is not only a confirmation that something happened; it is a **statement about how
much context was reclaimed**, which the Navigator reads to decide what to do next. A confirmation can
fade. A measurement the next decision depends on cannot.

## A Workbench Decision, Not Mine

Amending the shipped acceptance of a closed CR is a Workbench decision. CR104 is `done` and released;
its lifecycle rule is deliberate, documented and tested. **Recommended, not taken:** flip `completed`
from `transient` to a dismissal contract of its own, and record inside CR104 that its success case was
superseded by field use, struck through rather than deleted.

### Granted (2026-10-12)

The Navigator approved the reversal. CR104's success case is superseded, and its document must record
that as a supersession — struck through beside the replacement, never deleted — so the reasoning that
produced `transient` stays readable next to the use that refuted it.

## Outcome

A compaction that completes stays on the Composer surface until the Navigator closes it or sends the
next turn. A compaction that fails keeps the stronger guarantee it already has.

## First Investigation

- **Is "sticky" the right existing shape, or a third one?** `sticky` today means *only the Navigator
  or a later compaction may clear it*. The Navigator asked for *close or next turn*, and "next turn"
  is a dismissal trigger no current lifecycle has. Whether this is a third lifecycle or a widening of
  `sticky` decides whether `compactionNoticeIsDismissible` changes.
- **What clears it today?** `App.tsx:6353` passes `onDismiss={() => setCompactionOperation(undefined)}`
  and `:2120` consults the lifecycle. Where the transient fade actually happens must be read before
  it is moved, so the repair is not aimed at the wrong clearing site.
- **Does a new turn clear a failure too?** The Navigator named "new turn" as a dismissal for the
  result. Applying it to a failure would undo CR104's stronger promise. These need different answers,
  and conflating them would quietly weaken the failure case.
- **Does a success survive a reload?** The notice is renderer state. Whether persistence is in scope
  or whether closing the app is an acceptable dismissal.

## Boundaries

Does not change what compaction does, how it is triggered, or how its outcome is classified —
`classifyCompactionRefusal` and the `nothing_to_do` branch stay exactly as CR104 left them. Does not
weaken the failure notice's stickiness. Does not add an auto-dismiss timer anywhere.

## Provenance

`compactionNoticeLifecycle.ts` read in full on 2026-10-12, with `App.tsx:2120`, `:6350`–`:6353` and
`CompactionNotice.tsx`. The friction is the Navigator's report from real use.

---

## Investigation Answered (2026-10-13)

### 1. A third lifecycle, not a widening of `sticky`

`sticky` means *only the Navigator or a later compaction may clear it*. The Navigator asked for
*close or next turn*, and a turn must **not** clear a failure (question 3). Two outcomes that differ
in what dismisses them cannot share one value, so the type gains a third:

| value | what clears it | which outcome |
|---|---|---|
| `transient` | a timer | a refusal that compacted nothing |
| `until-next-turn` | the Navigator, or the next turn | **a success** |
| `sticky` | the Navigator, or a later compaction | a failure, an interruption, work in flight |

The value is named after its discriminating trigger rather than by another adjective, because the
only way to misuse this is to mistake it for `sticky`.

### 2. What clears it today, read before moving anything

Two sites, and only two:

- **`App.tsx:2119`–`:2129`** — an effect that calls `scheduleTransientComposerNotice` when the
  lifecycle is `transient`, clearing by identity (`current === scheduled ? undefined : current`).
  Making a success `until-next-turn` makes this effect return early for it, so **the fade stops
  without that effect being edited.**
- **`App.tsx:6379`** — `onDismiss={() => setCompactionOperation(undefined)}`.

*"Or a later compaction"* is not a clearing site at all: `setCompactionOperation({…})` at `:5326`
**replaces** the notice. Nothing needed to be added for it and nothing may be.

### 3. A turn must not clear a failure — and the site choice is where this nearly went wrong

The clearing belongs at `App.tsx:3226`–`:3227`, inside `generatePacket`, beside two existing
journey-scoped clearings on turn admission (`clearUnsentDraft`, and `compactedLeaf`, whose own
comment already says *"cleared as soon as a turn is admitted"*). Both turn sends — the Enter key at
`:6411` and the send button at `:6524` — go through `generatePacket("live")`, so one site covers both.

**The trap:** the obvious hook looked like `dispatchJourneyFinishedAttention({ type: "run_started" })`,
and there are **two** of those. The second, at `:5325`, is the *compaction's own* run start, two lines
before `setCompactionOperation({… status: "running" })` sets the notice. Keying on `run_started`
would have had the compaction clear the notice it was about to create. Read before wiring.

Steering is not a turn: `submitActiveSteering` at `:6409` does not go through `generatePacket`, so a
mid-turn correction does not clear the notice. That matches what the Navigator asked for.

### 4. Reload is out of scope, and the reason is proportion

The notice is `useState` at `App.tsx:746` — renderer state, gone on reload. Persisting it would mean
writing notice state to disk and reconciling it with a projection that may have moved underneath,
which is out of all proportion to the friction. **Closing the app remains an acceptable dismissal**,
and that is a stated exclusion rather than an oversight.

### A finding: one predicate was really two

`compactionNoticeIsDismissible` was also, incidentally, deciding ARIA assertiveness —
`CompactionNotice.tsx:23` reads `role={dismissible ? "alert" : "status"}`. That coincided correctly
while only failures were dismissible. A success is now dismissible and **must not** be an `alert`,
which interrupts a screen reader to announce good news. So the one predicate splits in two, and
assertiveness keeps CR104's original rule unchanged.

## Plan

**Scope.** Three-value lifecycle with `completed` → `until-next-turn`; dismissibility widened to any
non-`transient` settled outcome; a new `compactionNoticeIsAssertive` holding CR104's old rule; a pure
`clearCompactionNoticeOnNewTurn(current, journeyId)` wired into `generatePacket`'s admission cluster.

**Files.** `src/app/compactionNoticeLifecycle.ts` · `src/app/CompactionNotice.tsx` ·
`src/app/App.tsx` · `src/tests/compactionNoticeLifecycle.test.tsx` · CR104's document (supersession)
· this document · the RS016 index and canvas.

**Acceptance.**

1. A `completed` notice has no timer and stays on the Composer.
2. It offers a Dismiss control.
3. It announces as `status`, never `alert`.
4. A turn admitted in the **same** Journey clears it.
5. A turn admitted in a **different** Journey leaves it alone.
6. A turn never clears a failure or an interruption, in any Journey.
7. A `nothingToDo` refusal still fades and is still not dismissible.
8. `running` and `preparing` still offer no dismissal.

**Validation.** Unit assertions on the three pure functions; `renderToStaticMarkup` for the control
and the role; a source guard that the admission cluster calls the reducer, anchored on the function
name rather than on neighbouring lines. No test may assert a render count — nothing in this suite
can, and typing cannot be simulated.

**Exclusions.** No persistence across reload. No change to `classifyCompactionRefusal` or the
`nothing_to_do` classification. No new auto-dismiss timer anywhere. Steering does not clear. The
failure's stickiness is untouched. `compactingJourneyId` and the `run_started` marker are not
involved.

## Delivery (2026-10-13)

Implemented on `refinement/cr150-keep-a-compaction-result`. Four files, and the change is
almost entirely in one pure module.

**`src/app/compactionNoticeLifecycle.ts`** — the lifecycle gains `until-next-turn`; `completed`
moves to it and a `nothingToDo` refusal keeps `transient`. `compactionNoticeIsDismissible` widens
from `=== "sticky"` to `!== "transient"`. New `compactionNoticeIsAssertive` holds CR104's original
expression verbatim. New `clearCompactionNoticeOnNewTurn(current, journeyId)`, Journey-scoped and
deciding on the lifecycle rather than on the status.

**`src/app/CompactionNotice.tsx`** — `role` now reads assertiveness instead of dismissibility.

**`src/app/App.tsx`** — one import and one statement in `generatePacket`'s admission cluster, next
to `clearUnsentDraft` and `compactedLeaf`. **The fade effect at `:2119` was not edited at all**: it
returns early for anything that is not `transient`, so making a success `until-next-turn` stopped
the timer without touching the timer.

### The repair the field asked for was one line; the honest part was splitting a predicate

`compactionNoticeIsDismissible` was also deciding the ARIA role, and that was correct only while a
failure was the only dismissable outcome. Making a success dismissable would have made it
`role="alert"` — a screen reader interrupted to announce good news. **Control 4 reproduces exactly
that and fails**, so the coupling cannot come back silently.

### What the tests cover, and what they cannot

`src/tests/compactionNoticeLifecycle.test.tsx`, 17 tests, all 8 acceptance items asserted. Four
controls were run, each compiling and then failing:

| control | failed on |
|---|---|
| success back to `transient` | 4 tests, including the lifetime and the dismiss control |
| the turn clearing a failure too | 2 tests, including the one CR104 feared |
| the wiring removed from the admission site | 2 source guards |
| `role` back to following dismissibility | the success-is-not-an-alert assertion |

**Not covered:** that the admission site actually runs the reducer in a live app. Nothing in this
suite renders `App`, there is no DOM, and a turn cannot be submitted. The source guard proves the
call is written in the right place; only the field proves it fires. That is the whole content of the
field check below.

### CR104's guard was right about the danger and wrong about the rule

CR104 asserted that **nothing** else may clear the notice, and its comment named *"an unrelated turn
succeeding"* as the case a future change was most likely to reintroduce. It predicted this change
correctly and watched the right place. The guard is **narrowed, not removed**: a turn may clear a
success only, the reducer and not the call site decides that, and the reducer is required to appear
exactly once in `App.tsx` so a second clearing path cannot appear.

### A trap the reading caught

`dispatchJourneyFinishedAttention({ type: "run_started" })` looked like the natural hook and occurs
**twice**. The second, `App.tsx:5325`, is the manual compaction's own run start — two lines before
it sets this very notice. Keying on it would have had a compaction clear the notice it was about to
create. The test records the trap beside the guard.

## Field Check Owed

Four steps, one Journey, about a minute. The prediction is written first so that failing is
informative.

1. **Compact a Journey with context to reclaim.** The result should appear and **stay** — past the
   few seconds it used to survive, indefinitely, with a **Dismiss** button beside it.
   *If it still disappears on its own,* the lifecycle change did not reach the running build.
2. **Click Dismiss.** It should close.
   *If there is no button,* `compactionNoticeIsDismissible` is not what the render is reading.
3. **Compact again, then send a normal turn in the same Journey.** The result should disappear as
   the turn is admitted.
   *If it stays,* the admission site is not firing the reducer — the one thing no test can prove,
   and the reason this check exists.
4. **Force a failure** (compact a Journey whose branch already ends in a compaction gives the benign
   refusal, not a failure — so this step is the one that may not be provocable) **and send a turn.**
   The failure notice must **stay**.
   *If it disappears,* CR104's promise has been broken by this CR, which is the worst outcome
   available and the one control 2 exists to prevent.

**Step 4 may not be provocable on demand**, since a real compaction failure needs Pi to fail rather
than refuse. If it cannot be provoked, this CR closes on steps 1–3 with step 4 recorded as
test-covered and unprovoked rather than verified — the same honesty CR149 closed on.

## Field Build (2026-10-13)

Built and installed to the **Eval** channel, at the Navigator's call: `tauri.dev.conf.json` carries
`ai.mirrormind.desktop.dev` and therefore its own empty data directory, while
`tauri.eval.conf.json` carries `ai.mirrormind.desktop` — **the same identifier as production**. So
Eval reads the real Journeys, which is the only place a compaction has anything to reclaim. The
corollary is the standing rule: **production and Eval must never run at the same time.**

- Source: `2b33f8e`, worktree clean at build time.
- Installed binary: `00229d2dc94748ce898df24537d25421cd4b6939b47d0755bf10b6edd4db7952`, identical to
  the built one, and distinct from the previous Eval (`bc488ca0…`) and from production (`0668f6ce…`).
- `ps` gate run immediately before replacing the bundle: Eval was not running. Previous bundles
  retained under `/tmp`.

### An instrument that proved nothing, caught by its own control

The first verification attempted was `grep` for `until-next-turn` in the installed binary. It
returned **0** — and so did `compaction-notice-dismiss`, which has shipped since CR104 and is
certainly present. **Tauri embeds the frontend compressed, so no frontend literal is greppable in
the binary at all**, and `strings` confirms it: `compaction-notice`, `Context compaction` and
`Chapter closed` are each 0 occurrences.

Reporting that first result would have claimed the repair was missing from a build that contains it.
What the control establishes is the instrument's blindness, not the code's absence — the same shape
as CR149's central lesson, found here in one step because the control was run alongside the
measurement rather than after it doubted.

The chain that does prove it: the literal appears **2×** in `dist/assets/index-BuguYW4l.js`, that
dist was written at 18:52:42 and the binary at 18:54:21 of the same build, and the installed binary
hashes identically to that build's output.

### Step 4 splits, and only half of it is provocable

- **4a, provocable.** Compact a Journey whose branch already ends in a compaction. Pi refuses, the
  Desktop classifies it `nothing_to_do`, and the notice must **fade on its own with no Dismiss
  button** — the one outcome this CR deliberately left on a timer. This verifies acceptance 7, which
  is the clause most at risk of being swept along with the success.
- **4b, not provocable on demand.** A true failure needs Pi to fail rather than refuse. If it does
  not occur, this CR closes on steps 1–4a with 4b recorded as test-covered and unprovoked.

## Field Check: PASSED (2026-10-13)

**Navigator report:** *"CR Validada. Deu tudo certo."*

Run on the Eval channel against real Journeys, binary
`00229d2dc94748ce898df24537d25421cd4b6939b47d0755bf10b6edd4db7952`, with production closed for the
duration.

| step | claim | result |
|---|---|---|
| 1 | a completed compaction stays, no timer | passed |
| 2 | it offers a Dismiss control | passed |
| 3 | **the next turn in the same Journey clears it** | passed |
| 4a | a benign refusal still fades, with no Dismiss | passed |

**Step 3 is the one that mattered.** It is the only acceptance item no test could reach: nothing in
the suite renders `App`, there is no DOM, and a turn cannot be submitted. The source guard proved the
reducer call was written in the admission cluster; only this proved it fires.

### Not verified, and not claimed

**4b — a true compaction failure surviving a turn — was not provoked**, because a real failure needs
Pi to fail rather than refuse, and that does not happen on demand. It stays **test-covered and
unprovoked** rather than verified: `clearCompactionNoticeOnNewTurn` returns the notice unchanged for
`failed` and `interrupted` in its own Journey and in any other, and control 2 — the reducer widened
to clear every non-`transient` outcome — compiles and fails on exactly that assertion.

This is the clause whose breakage would be worst, since it would undo CR104's promise. It is held by
construction and by a control, and that is stated here rather than folded into the pass.

### What this closes, and what it reopens

CR104's success case is superseded in the record, struck through beside the reasoning that produced
it. The field did not refute CR104's logic — it refuted its premise about what kind of thing a
compaction result is. A confirmation may fade; a measurement the next decision depends on may not.

CR104's own guard predicted this exact change and named the right place to watch. It was narrowed,
not removed, and it still forbids the thing it was written to forbid.
