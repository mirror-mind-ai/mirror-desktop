[< RS016](index.md)

# CR158: Stop One Agent Settings Write From Dropping Another

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/cr158-serialise-agent-settings-writes`

## Friction

Not reported from the field. Found while reading `App.tsx` for CR154, and captured rather than
repaired inside it so that the field can attribute each repair to the symptom it was aimed at.

## The Mechanism

`persistAgentSettings` builds its argument from the `agentSettings` captured in the calling render's
closure, writes the file, and only then updates state:

```ts
async function persistAgentSettings(next: AgentSettings, successMessage: string) {
  …
  await saveAgentSettings(next);
  setAgentSettings(next);
```

Every one of the six callers computes `next` from the closure's `agentSettings` **before** awaiting.
So two writes issued before the first `setAgentSettings` lands both merge onto the same pre-first
value, and the second **silently overwrites the first**. A Journey override set by the first write
disappears, and that Journey falls back to the global default.

Nothing reports it. The second write succeeds, its success message is shown, and the file is valid.

## Why It Is Not CR154's Symptom

The window is the duration of one file write. The Navigator's CR154 report contains a turn between
the two choices, which runs for tens of seconds — the window closes many times over before the
second choice is made. **This is a latent defect, not the explanation for anything observed yet.**

## First Investigation

- **Is the window reachable by a human?** Two model choices inside one file write means a double
  click or a very fast sequence. If it is not reachable by hand, the right answer may be a guard that
  makes it impossible rather than a repair that makes it correct.
- **Is `restoreDefaultAgentSettings` the dangerous caller?** It writes a whole fresh `defaults`
  object rather than a merge, so it does not read stale state — but anything in flight when it lands
  is lost, which may be the intent.
- **Functional update, or serialise?** A functional `setAgentSettings` cannot be awaited for the file
  write, so the fix is probably to serialise writes behind a single owner rather than to make each
  merge smarter.

## Boundaries

Does not change what any of the six callers mean to write. Does not touch the file format.

## Provenance

`App.tsx:4265–4362` and `agentProfile.ts` read on 2026-10-14 while answering CR154's investigation.
The mechanism is read from the code; no occurrence has been observed.

## First Investigation: Answered (2026-10-15)

Status deliberately unchanged. The protocol puts status under Navigator authority, and the
authorisation for this turn covered the investigation, not the repair.

### The window, measured

`save_agent_settings_at` timed directly against the Navigator's real Dev payload, 200 runs after a
warm-up, in a temporary directory:

| payload | runs | min | mean | max |
|---|---|---|---|---|
| 2,241 B | 200 | 3.4 ms | **20.1 ms** | 37.1 ms |

This is the **Rust half only** — it excludes the Tauri IPC round trip in both directions, which was
not instrumented. The probe was temporary and removed; the suite is back at 327 and the worktree was
confirmed clean.

**20 ms is not reachable by two deliberate clicks.** On that number alone the CR's own framing holds
and the defect stays latent.

### But the window is not bounded by that number

`save_agent_settings` acquires the global guard:

```rust
#[tauri::command(async)]
pub fn save_agent_settings(app: AppHandle, payload: String) -> Result<(), String> {
    let _serialized = crate::native_command_serialization::acquire();
```

So a settings write **queues behind every other native command**, including settlement. The
production census taken for CR157 put the depth-0 settlement p99 at **41,741 ms**, with the longest
single phase at 41,081 ms. During a settlement the window is not 20 ms; it is seconds to tens of
seconds, and two ordinary clicks land inside it without any hurry at all.

### And the controls stay live inside it

This is the part that makes it reachable, and it is not about timing.

`providerSelectionDisabled={agentSettingsState === "saving"}` reaches exactly **one** element —
`ComposerRuntimeFooter.tsx:208`, the trigger that opens the menu. It is **never passed into
`ModelIntentMenu`**, whose only `disabled` is `Boolean(reason)`, model unavailability. Once the menu
is open, every entry in it stays enabled for the whole duration of the write:

| menu entry | closes the menu before awaiting? |
|---|---|
| an intent — `applyModelIntent` | **yes**, `setModelIntentMenuOpen(false)` first |
| `Follow the Journey default` — `followJourneyAgentDefaultHere` | ~~**no**~~ — **wrong; see the correction below.** Closed at the call site, `App.tsx:6680` |
| `Use global defaults` — `useGlobalAgentDefaultsHere` | ~~**no**~~ — **wrong; see the correction below.** Closed at the call site, `App.tsx:6684` |

~~**The two that do not close the menu are the two I added in CR154.** The sibling I wrote them beside
closes it first, and I did not match it. That inconsistency is mine, and it is what turns a 20 ms
merge race into a window a person can walk into.~~

**Struck through on 2026-10-18. This was false, and the self-criticism in it was false too.** See
*The Premise Was Wrong* below.

### A plainer defect that needs no race

Those same two entries give **no feedback at all** while the write is in flight: the menu stays open,
nothing is disabled, nothing changes. Under settlement that is tens of seconds of a menu that looks
broken. This does not require a second click to be a defect, and it is the symptom a Navigator would
actually report.

### `restoreDefaultAgentSettings` is the least reachable caller, not the most

The CR asked whether it is the dangerous one. It is not:

- its button **is** `disabled={agentSettingsState === "saving"}`;
- it lives in Settings, far from the menu;
- it writes a whole fresh `defaults` object, so it reads no stale state.

It does discard anything in flight when it lands — which is plausibly the intent of a command named
*restore defaults* — and that is the one part of the original hypothesis that survives, as a question
about meaning rather than a defect.

### Functional update, or serialise?

**Neither is the first move.** The reachability comes from the UI, not from the merge. Closing the
window where it opens is cheaper, smaller, and fixes the feedback defect in the same stroke.

## Planned 2026-10-18

Selected by the Navigator. Delivery not named; **nothing implemented**. The six elements the protocol
requires before `planned` were already recorded at capture — scope, files, acceptance, validation and
exclusions below, boundaries above — so this move adds a decision, not a document.

**Validation part A is deliberately dropped.** It called for provoking the defect on Dev. The merge
race is **not provokable by hand**: the two writes must land inside one read-modify-write window, and
nothing in the UI lets a Navigator time that. Keeping the step would spend a cycle measuring nothing.
What remains is the guard asserting the prop reaches *every* menu entry, which is the claim that can
fail.

**Why `planned` and not `in_progress`.** The repair is known and cheap, so nothing is lost by holding
it one cycle; and four field verifications are owed in the finishing/settlement area, three of them
waiting on a single rare event. This CR is independent of all of them — it touches `agent-settings.json`
and the model menu, not the settlement machinery — which is exactly why it is the right thing to build
**next** rather than **now**.

The argument for moving sooner is recorded because it is real: the defect's outcome is a **silent loss**
of a model preference. It has not been observed — production's `agent-settings.json` is intact with its
fifteen Journey overrides — and the eight "redundant" overrides remain under review rather than
classified, so no loss is attributed to this cause.

## The Premise Was Wrong (2026-10-18)

Read before writing any code, as the first act of implementation. **The table above is wrong on a
verifiable point, and so is the paragraph under it.**

Both CR154 entries **do** close the menu before awaiting. The close is at the **call site**, not
inside the function — `App.tsx:6680` and `6684`, each `setModelIntentMenuOpen(false)` immediately
before `void …()`. The investigation read the two functions, found no close in them, and concluded
there was none. All four menu entries close the menu, including `Open full selector…` at `6688`.

So the sentence *"that inconsistency is mine"* was a self-criticism for a mistake I had not made. It
is struck through rather than deleted, because a record that quietly drops a wrong accusation is a
worse record than one that carries the correction.

**The "plainer defect" falls with it.** The claim was that those two entries leave the menu open with
no feedback for the duration of the write. They do not: the close and `setAgentSettingsState("saving")`
are dispatched in the same event handler, so they land in one commit and the menu unmounts. There is
no render in which the menu is open and a write it started is in flight.

### The reachability audit, redone

All nine callers of `persistAgentSettings`, with what stands between each and a second concurrent
write:

| callers | gate |
|---|---|
| `saveOnboardingAgentProfile`, `saveGlobalAgentProfile`, `saveSelectedJourneyAgentOverride`, `saveSelectedConversationAgentOverride`, `resetSelectedJourneyAgentOverride`, `restoreDefaultAgentSettings`, and the dialog's `Cancel`/`Close` | `disabled={agentSettingsState === "saving"}` on the control itself — 7 of 9 |
| `applyModelIntent`, `followJourneyAgentDefaultHere`, `useGlobalAgentDefaultsHere` | the menu unmounts in the same commit, and the trigger that reopens it carries `providerSelectionDisabled={agentSettingsState === "saving"}` (`ComposerRuntimeFooter.tsx:208`) |

**The race is not reachable from the UI today.** The CR's framing that it is a latent defect was
right; its explanation of *why it became reachable* was not.

### Which makes the recorded scope a no-op

The planned repair was to close the menu in the two CR154 entries — already done — and to pass the
saving state into every `ModelIntentMenu` entry. The second would add a prop that **can never be
true**, because `agentSettingsState === "saving"` and `modelIntentMenuOpen` cannot hold in the same
render. Shipping it would be dead code wearing the name of a fix.

## Implemented 2026-10-18 — Structurally, Not as Recorded

**This crosses the CR's own exclusion**, which read *"Does not serialise writes behind a single
owner."* That exclusion was written when the UI was believed to be the reachable cause. With the UI
cause refuted, the merge race is the only defect left, and the audit that closes it is an **emergent
property of nine controls across four surfaces** — not the kind of fact that stays true. A tenth
caller added without a gate reintroduces a silent loss of a model preference.

The reversal is named here as a Workbench call rather than made quietly. The project's own recorded
principle is to resolve concurrency safety by construction rather than by auditing call sites, and
that is what is built.

**`src/app/agentSettingsWriter.ts`** — one owner. `enqueue(update)` chains on a tail promise, applies
the update against the baseline the writer holds **after** the queue grants it a turn, writes, and
only then advances the baseline. A failed write deliberately does **not** advance it, so the next
update merges onto what is on disk; the rejection is swallowed by the tail so one failure cannot
poison every later write, and is still reported to its own caller. `adopt` takes a baseline that
arrived from outside, which the launch loader now uses.

**`persistAgentSettings(update, successMessage)`** takes an update instead of a value. A caller cannot
hand in a stale baseline because a caller cannot hand in a baseline at all. All nine callers became
reducers; `restoreDefaultAgentSettings` is the one that ignores `current` on purpose, and says so at
the line, because a command named *restore defaults* means to discard what is there.

### Guards

`src/tests/agentSettingsWriter.test.ts`, six tests. The first is **the control**: it reproduces the
old pattern — compute from a captured snapshot, then await — and asserts the first write is lost. An
instrument that cannot show the defect cannot show its absence. The rest prove both writes survive
when the second is issued before the first lands, that each update reads the previous write's result,
that order holds, that a failure neither advances the baseline nor poisons the queue, and that an
externally loaded baseline is adopted.

Five source guards in `agentProfileSettings.test.ts` pin the structure: every call site supplies an
update, **with the census asserted at ten** — nine callers and the declaration — so a tenth cannot be
added without this guard being read; a control proving the matcher rejects the old pattern; the writer
as the only path to the transport; the loader adopting before it sets state; and the hook declared
before the early return.

The census is asserted because of this file's own history: the `providerSelectionDisabled` guard in it
passed for a release while covering one element of five. **A guard over a set must assert the size of
the set.**

### Six predecessor guards narrowed, not deleted

Five CR154 guards and one CR122-era guard asserted `setConversationAgentOverride(agentSettings, …)` —
the *mechanics*. Their claim is which grain each caller writes, and that claim survives, so they were
narrowed to `current` rather than removed.

### What this does not do

It does not add the `disabled` prop to `ModelIntentMenu`, for the reason above — the state it would
read cannot occur. It does not change what any caller means to write, and it does not touch the file
format. The seven UI gates are left exactly as they are: they are still correct, and they now guard a
surface rather than a data invariant.

Gates: vitest **270 files / 2,236 tests** (from 269 / 2,225), `cargo test` 332 passed / 3 ignored,
`tsc --noEmit` clean, `npm run build` clean, `roadmap:check` READY.

### Field verification owed

**None that can be collected, and that is recorded rather than left implied.** The race was
unreachable before this change, so no observable behaviour changes for the Navigator — which is
exactly why validation part A was dropped at `planned`. The claim is proved by the control-backed
unit tests and by the census guard. If an agent-settings write is ever observed to vanish, that is
now evidence against the writer rather than against the call sites.

## Integrated 2026-10-18

Fast-forwarded into `main` at `e2fb2dd`; **0 merges** in `v0.2.0-alpha.54..main`. The Delivery branch
was never pushed, so `git ls-remote --heads origin` returned nothing and there was no remote ref to
retire — the local branch was deleted after the integration.

Gates re-run on `main` after the fast-forward: vitest 270 files / 2,236 tests, `tsc` clean,
`npm run build` clean, `roadmap:check` READY.

**Closed on the clause that can be closed.** There is no collectable field verification — the race was
unreachable from the UI before this change, so nothing observable changes for the Navigator. The
claim rests on the control-backed unit tests and the census guard, and that is recorded as the basis
rather than implied.

**Not released.** This is `done` and **unreleased**: it is in `main` and in no published build.
Publication is its own authorisation and was not given. For that reason it does **not** appear in
`docs/releases/change-requests.md`, which maps a Change Request to the release that carried it, and
it does **not** enter the Canvas's *Últimas entregas* — a merge is not a delivery until it ships.

**One consequence worth naming:** a `done` but unreleased item is invisible on the Canvas. It loses
its own row, because terminal items collapse into their Story's count, and it cannot join the
deliveries list because it has no release to name. That follows the Canvas's own rule that it shows
only what is open, pending or in progress, so it is recorded as an observation rather than treated as
a defect.

## Proposed Scope

Recorded so the Navigator can decide; **not selected, and nothing implemented.**

**Scope.** Close the menu before awaiting in both CR154 entries, matching their sibling. Pass the
saving state into `ModelIntentMenu` and disable every entry while a write is in flight. Leave the
merge semantics untouched.

**Files.** `src/app/App.tsx` (the two functions), `src/app/ModelIntentMenu.tsx` (one new prop, applied
to every entry), `src/tests/modelIntentMenu.test.tsx`, `src/tests/agentProfileSettings.test.ts`.

**Acceptance.** No menu entry is clickable while `agentSettingsState === "saving"`. Every entry that
writes closes the menu before awaiting. The trigger's existing gate is unchanged.

**Validation.** A guard asserting the prop reaches **every** entry, not merely that it exists — the
existing `providerSelectionDisabled` guard passed while covering one element of five, which is how
this survived. A guard pinning close-before-await by index comparison, as the existing
`persistModelIntents` ordering guard does. One control per guard.

**Exclusions.** Does not serialise writes behind a single owner. Does not change what any caller means
to write. Does not touch `restoreDefaultAgentSettings`.

**Remaining debt if this ships.** The merge race itself survives, narrowed to paths that bypass the
menu. It should keep its own trigger: if a write is ever observed to vanish with the menu closed,
serialisation behind one owner becomes the next move.
