[< RS016](index.md)

# CR158: Stop One Agent Settings Write From Dropping Another

**Status:** planned
**Driver:** @alissonvale
**Delivery:** —

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
| `Follow the Journey default` — `followJourneyAgentDefaultHere` | **no** |
| `Use global defaults` — `useGlobalAgentDefaultsHere` | **no** |

**The two that do not close the menu are the two I added in CR154.** The sibling I wrote them beside
closes it first, and I did not match it. That inconsistency is mine, and it is what turns a 20 ms
merge race into a window a person can walk into.

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
