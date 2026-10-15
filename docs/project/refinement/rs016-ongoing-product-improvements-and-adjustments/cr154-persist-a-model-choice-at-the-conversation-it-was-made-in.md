[< RS016](index.md)

# CR154: Persist a Model Choice at the Conversation It Was Made In

**Status:** in_progress
**Driver:** assistant
**Delivery:** `refinement/cr154-persist-a-model-choice-at-the-conversation-it-was-made-in`
**Navigator priority:** 6 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"modelo nao é persistido corretamente no nivel de conversa. Se
mando um turno em outra conversa ou journey e volto para a original as vezes o modelo da original
fica errado."*

## The Grain Does Not Exist

This is not a persistence bug on top of a conversation-level model. **There is no conversation-level
model.** `agentProfile.ts` has exactly two grains:

```ts
export function resolveAgentProfile(settings: AgentSettings, journeyId: string): EffectiveAgentProfile {
  const override = settings.journeyOverrides[journeyId];
  return {
    journeyId,
    model: override?.model ?? settings.globalProfile.model,
    …
```

`agent-settings.json`'s root keys are exactly `schemaVersion`, `globalProfile` and
`journeyOverrides`. Every read and every write is keyed on a Journey:

| site | key used |
|---|---|
| `App.tsx:1734` | `agentSettings.journeyOverrides[selectedJourney]` |
| `App.tsx:4271`, `:4282`, `:4291` | `setJourneyAgentOverride(agentSettings, selectedJourney, …)` |

So two conversations in one Journey **cannot** hold different models, and the thing the Navigator
observes going wrong is not a conversation's model drifting — it is a Journey-grained value being
read where a conversation-grained one is expected.

## A Gap Created by a Success

RS023 made conversations first-class workspaces and RS024 made concurrent work inside one Journey
real. Model authority did not follow. The Navigator now works in a conversation, so the Journey is no
longer the unit they are choosing for — and the store still thinks it is.

## ~~The Likely Mechanism, Stated as a Hypothesis~~ — refuted by the code, 2026-10-14

Every write is keyed on `selectedJourney` **at the moment the write happens**, not on the workspace
the choice was made in. If selection moves between the choice and its persistence — which sending a
turn elsewhere does — the override lands against whatever Journey is selected then. The Navigator's
*"às vezes"* fits that: it needs the selection to have moved, so it does not reproduce every time.

**Not established.** No reproduction has been recorded and `agent-settings.json` has not been read
before and after the sequence. The Dev file currently holds
`journeyOverrides["mirror-desktop"] = gpt-5.6-luna` against a `globalProfile` of
`gpt-5.3-codex-spark`, which is consistent with either a deliberate choice or a misplaced one — it
cannot discriminate.

## Outcome

A model chosen while working in a conversation is the model that conversation uses, it survives
sending turns in other conversations and Journeys and returning, and it survives restart. A Journey
default and a global default still apply where no conversation choice was made.

## First Investigation

- **Reproduce and read the file.** Choose a model in conversation A, send a turn in conversation B,
  return to A, and read `agent-settings.json` at each step. **The write must be caught landing on the
  wrong key** — otherwise the repair is aimed at a mechanism nobody measured.
- **Three grains or four?** Global, Journey and conversation is the minimum this friction implies.
  Whether a conversation inherits its Journey's override at creation or resolves it lazily decides
  what happens when the Journey default later changes — one freezes the choice, the other follows it,
  and they disagree for every existing conversation.
- **What does it do to `modelSource`?** It reports `"journey"` or `"global"` today and is shown to the
  Navigator. A third source must be nameable, or the surface will attribute a conversation choice to
  the Journey.
- **Should the key be the workspace, not the conversation?** RS024's grain is
  `journeyWorkspaceKey`, and the native registry, occupancy and event routing are already keyed by
  it. Introducing a fourth, differently-shaped key for the model would put two grains side by side
  for the same thing.
- **What about a turn already in flight?** CR090 made model authority run-scoped so a response is
  attributed to the model that produced it. A conversation-level change must not retroactively
  relabel a running turn, and must not change the model under it.
- **Migration.** Existing `journeyOverrides` are real choices the Navigator made. They must keep
  working, and must not be silently reinterpreted as conversation choices on one conversation.

## Boundaries

Does not change CR090's run-scoped attribution or CR091's per-response model record. Does not change
`invocationMode`, which is global by construction. Does not add a model picker anywhere new. Does not
touch `modelIntents`.

## Provenance

`agentProfile.ts` read in full and the five keyed sites in `App.tsx` read on 2026-10-12. The Dev
`agent-settings.json` values are from this session's earlier reading. The friction and its
intermittency are the Navigator's report; the mechanism is a hypothesis and is labelled as one.

## Investigation Answered (2026-10-14)

Answered by reading the code, which turned out to settle the question I had put to the Navigator.

### The model is chosen from the composer, and the composer writes a Journey

This is the finding the CR was missing. `ComposerRuntimeFooter` renders the current model and opens
a menu whose `onSelectIntent` calls `applyModelIntent` (`App.tsx:6541`), which writes:

```ts
setJourneyAgentOverride(agentSettings, selectedJourney, { model: intent.model, thinkingLevel: intent.thinkingLevel })
```

**The control sits inside a conversation and the value it writes belongs to the Journey.** That is
the whole friction, stated structurally: the surface already promises the grain the store does not
have. Two conversations in one Journey cannot disagree about the model, so choosing in one and
returning to the other shows the other's choice — deterministically, not intermittently.

### The hypothesis this CR recorded is wrong, and guarding it would fix nothing

The document said every write is keyed on `selectedJourney` *"at the moment the write happens, not on
the workspace the choice was made in"*. It is not. `setJourneyAgentOverride(agentSettings,
selectedJourney, …)` is evaluated **synchronously inside the click's render closure**, so the key is
the Journey that was on screen when the choice was made; the `await` comes after the key is already
bound. **The key cannot drift.** A repair aimed at the key would have changed nothing and the symptom
would have survived it.

### There is a real race, but on the merged value, not on the key — and it is not this symptom

`persistAgentSettings` does `await saveAgentSettings(next)` then `setAgentSettings(next)`, where
`next` was built from the closure's `agentSettings`. Two writes issued before the first
`setAgentSettings` lands means the second is computed from pre-first settings and **silently drops
the first override**. That is a genuine defect, and it is **not what the Navigator reported**: the
window is one file write, and the reported sequence contains a turn, which runs for tens of seconds.
The window closes many times over before the second choice is made. **Captured separately rather
than fixed inside this CR**, because a repair bundled with an unrelated one cannot be attributed by
the field.

### Nothing writes agent settings during a turn

All six writes are explicit Navigator acts — onboarding, the global panel, the Journey panel, the
Journey reset, the composer menu, and the restore-defaults button. The turn in the report is what
passes the time, not what corrupts the value.

### Therefore the reproduction is not needed

The First Investigation asked for a reproduction to catch *"the write landing on the wrong key"*.
There is no wrong key to catch. The mechanism is the absent grain, it is deterministic, and the
reproduction would have confirmed a correct write while the symptom stayed unexplained.

**Worth recording against myself:** I asked the Navigator whether the two conversations had been in
the same Journey or in different ones. The code answers it — the only mechanism that survives the
report's own timing requires them to be in the same Journey. *Prefer the reading already available
over a question that costs someone else a turn.*

### The remaining questions, answered

| question | answer |
|---|---|
| three grains or four? | **Three** — conversation, Journey, global. |
| inherit at creation, or resolve lazily? | **Lazily.** Freezing would make every conversation that exists today silently own the current Journey value, which is exactly the migration hazard this CR named; and a default that cannot move is not a default. |
| what about `modelSource`? | It gains a third value, `"conversation"`. Adding a value rather than widening one — the CR150 pattern. |
| workspace key or a new conversation key? | **The workspace key.** RS024 owns this grain and `selectedWorkspace` is already in hand at the composer and at the send path. A second, differently-shaped key for the same thing is the duplication this question warned about. |
| a turn already in flight? | The send path reads `effectiveAgentProfile` from the render that started it (`App.tsx:3138`), so a running turn holds its own model. To be **asserted by a test**, not claimed. |
| migration? | Existing `journeyOverrides` stay keyed by Journey and keep applying to every conversation that made no choice of its own. Lazy resolution is what buys this: nothing is reinterpreted. |

### One finding the CR did not anticipate: this is a schema change

`parseAgentSettings` calls `exactKeys(root, ROOT_KEYS, …)` and hard-rejects any
`schemaVersion !== "1.0.0"`. A new root key therefore means:

- a **new** build reading an **old** file is fine — the key is absent and resolves to `{}`;
- an **old** build reading a **new** file **throws, and agent settings fail to load entirely.**

Updates are forward-only, so this is acceptable — but it is named here rather than discovered by
someone who rolled back.

## Plan

### The layering problem, and the recommendation

`agentProfile.ts` is in `src/domain/`; `journeyWorkspaceKey.ts` is in `src/app/`. Importing the key
into the profile would be the **first runtime `domain → app` import**, which is exactly what CR151's
second slice refused. `journeyWorkspaceKey.ts` has **zero imports** — it is pure domain sitting in
the wrong directory.

**Recommendation: move it to `src/domain/`.** 18 files reference it (5 source, 1 agent, 12 tests);
every update is a mechanical path change that `tsc` will catch if one is missed. The alternative —
having `agentProfile.ts` compose the same key with its own separator — puts the same key format in
two modules, which is the duplication the investigation just rejected.

### Scope

1. **Move** `journeyWorkspaceKey.ts` → `src/domain/`, updating all 18 importers, asserted by count.
2. **`agentProfile.ts`**: add `conversationOverrides: Record<string, JourneyAgentOverride>` keyed by
   `runtimeWorkspaceKey`; `resolveAgentProfile(settings, workspace)` resolving
   conversation → Journey → global; `modelSource`/`thinkingSource` gain `"conversation"`;
   `setConversationAgentOverride`; a key validator that accepts `journeyId|threadId` rather than
   `assertJourneyId`; `schemaVersion` written as `"1.1.0"` and **accepted as either**.
3. **`describeEffectiveAgentProfile`**: name the conversation as a source, so the sentence does not
   attribute a conversation choice to the Journey.
4. **`App.tsx`**: `applyModelIntent` writes the **conversation** override for `selectedWorkspace`;
   the Settings Journey panel keeps writing the **Journey** override, unchanged; the `useMemo` at
   `:1236` resolves against the workspace.
5. **A reset for the conversation grain**, because a choice with no way back is the reduction CR152
   was made to avoid.

### Files

`src/domain/agentProfile.ts` · `src/domain/journeyWorkspaceKey.ts` (moved) · `src/app/App.tsx` ·
18 importers (paths only) · `src/tests/agentProfile.test.ts` · a new test for the three-grain
resolution and the schema tolerance.

### Acceptance

- A model chosen in conversation A applies to A and **not** to B in the same Journey.
- A conversation with no choice of its own follows its Journey; a Journey with no override follows
  global. Changing the Journey default **moves** every conversation that made no choice.
- `modelSource` reports `"conversation"` where a conversation owns the choice.
- An existing `agent-settings.json` with only `journeyOverrides` loads unchanged and keeps applying.
- A running turn keeps the model it started with.
- The conversation choice survives restart.

### Validation

`tsc`, the full suite, `cargo test`, `npm run build`, `roadmap:check`. Then a **field check**, because
three of the acceptance clauses are about what the Navigator sees in the composer after moving
between conversations, and no test can stand in for that.

### Conscious Exclusions

- **The stale-merge race is not repaired here** — captured separately so the field can attribute each.
- No change to CR090's run-scoped attribution or CR091's per-response record.
- `invocationMode` stays global by construction.
- **No new model picker anywhere**, and `modelIntents` is untouched.
- **A downgrade is not supported**: an older build reading the new file refuses to load agent
  settings. Named, not mitigated.

### Decision owed before `in_progress`

**Three grains, with the composer writing the finest and Settings keeping the Journey panel** — is
that the shape you want? The alternative is to make the model conversation-only and retire the
Journey grain, which is a smaller store and a larger loss: the Settings Journey panel and its reset
exist deliberately, and every current override would have to go somewhere.

## The Shape Decided by the Navigator's Own File (2026-10-15)

Read from the production `agent-settings.json` rather than argued from preference.

| | |
|---|---|
| global default | `openai-codex/gpt-5.6-terra` |
| Journey overrides | **15** |
| ~~identical to the global, carrying no distinction~~ | ~~**12**~~ — **wrong, see the correction below** |
| ~~real distinctions~~ | ~~**3**~~ — **wrong, see the correction below** |

Two conclusions, and they point the same way.

**The Journey grain is used, and retiring it would cost the Navigator daily.** Three Journeys carry a
real choice, and one of them is the Journey this product is built in. Without the Journey grain every
new conversation in `mirror-desktop` would start on `gpt-5.6-terra` and Opus would have to be
re-picked every time. **Three grains, not two.**

**The 12 redundant entries are the fingerprint of the defect this CR describes.** They were not
deliberate Journey decisions. They exist because the composer writes a Journey-wide value, so
ordinary model picking inside a conversation has been writing a Journey override on every pick —
including when the pick matched the global. The noise is the bug's own signature, and the repair
stops producing it: after it, the composer writes the conversation grain and the Journey grain only
changes when the Settings panel is used deliberately.

### A scope addition this measurement produced

**A conversation override that equals its inherited value must not be written.** 12 redundant entries
accumulated across 15 Journeys; conversations are far more numerous, so the same unconditional write
at the finer grain would accumulate one entry per conversation ever touched.

The reason is not file size. **A written override stops following.** Writing one that merely repeats
the inherited value silently converts a conversation from a follower into a freezer, so a later
change to the Journey default would skip exactly the conversations where the Navigator had picked the
value that default already had. That contradicts the lazy resolution this plan chose, so the write is
conditional: only a value that differs from what the conversation would otherwise inherit is stored,
and a choice that returns to the inherited value removes the entry — which is the same shape
`setJourneyAgentOverride` already uses when it deletes an empty override.

### Recommended Driver and Delivery

Proposed rather than asked, since the protocol needs both recorded and neither is a product decision:

- **Driver:** `assistant`
- **Delivery:** `refinement/cr154-persist-a-model-choice-at-the-conversation-it-was-made-in`

## Delivery (2026-10-15)

Navigator chose **option A** — three grains, the composer writing the finest, the Settings Journey
panel keeping the Journey. Three slices.

### Slice 1 — the workspace key moved into the domain

`journeyWorkspaceKey.ts` had zero imports: pure domain in the wrong directory. Moved to
`src/domain/`, 18 importers updated.

**My enumeration was falsely complete.** I listed the import forms by grepping the name followed
immediately by a quote, which cannot see `"../app/journeyWorkspaceKey.ts?raw"`, then asserted the
substitution against the two forms I had listed — so the assert passed on its own terms. The suite
reported **one file that failed to LOAD**, with 2,136 tests passing and none failing. The re-check is
exhaustive rather than enumerated: every quoted string in `src/` containing the name, grouped and
counted, then asserted that none resolves through `app/`.

### Slice 2 — the third grain in the domain

`resolveAgentProfile` takes a `JourneyWorkspace` as a **required** parameter. An optional `threadId`
would let a call site resolve the Journey silently, which is the shape of this very defect; a
required one makes forgetting it a compile error, and the control confirmed it by failing both the
source guard and `tsc`.

Resolution is lazy, so changing a Journey default still moves every conversation that never chose.
`setConversationAgentOverride` does not store a choice that repeats the inherited value, field by
field, and removes the entry when a choice returns to it.

Two guards pinned the old shape and were **strengthened rather than loosened**: the storage test's
exact root-key list now declares the third grain, and the App source guard pins the workspace
construction rather than a call prefix that anything could satisfy.

### Slice 3 — the composer, and a precise way back

| control | writes |
|---|---|
| composer model menu | **this conversation's** choice |
| composer → *Follow the Journey default* | clears only the conversation's choice |
| composer → *Use global defaults* | clears **both** finer grains |
| Settings → Journey panel (save and reset) | the Journey grain, unchanged |

*Follow the Journey default* is rendered only when there is something to undo, and names where it
would land rather than only that it undoes something. *Use global defaults* had to start clearing
both grains or **its own label would be false** — clearing only the Journey's override would leave
this conversation's choice in force and the global default unreached.

### A guard that went on passing after the behaviour changed

The test named *"applies an intent as the same Journey override the dialog writes"* sliced `App.tsx`
from `applyModelIntent` to `openJourneyAgentProfileSelector` — a window that covered every
declaration in between. This CR added two siblings inside it, one of which legitimately writes the
Journey grain, so the guard matched a neighbour's text and **kept passing while the behaviour it
named had been replaced.**

The meta-control is the evidence, and it is worth more than the repair: with the defect restored
**and** the old wide window in place, **14 of 14 passed.** The window now ends at the next
declaration, which a neighbour cannot satisfy.

### Checks

`tsc` clean · **265 files / 2,172 tests** · `cargo test` 324 passed / 3 ignored · build clean ·
`roadmap:check` READY.

**Nine controls across the three slices**, each confirmed applied before its result was read, each
failing on the right assertion: an unconditional write, an inverted resolution order, a permissive
key validator, a schema refusing `1.0.0`, the reverted call site, the composer writing the Journey,
the way back discarding the Journey's override, the global entry reaching only the Journey, and the
way back rendered unconditionally.

### Field Check Owed

No test can tell whether this feels right, and three acceptance clauses are about what the Navigator
sees after moving between conversations:

1. Pick a model in conversation A's composer; pick a different one in conversation B **of the same
   Journey**; return to A and confirm **A kept its own**.
2. In a conversation that never picked, confirm it shows the Journey's model — `mirror-desktop`
   should still read **`claude-bridge/claude-opus-5`**.
3. Change the Journey default in Settings and confirm a conversation that never picked **moves with
   it**, while one that picked **does not**.
4. In a conversation holding its own choice, use **Follow the Journey default** and confirm it
   returns to the Journey's model rather than to the global one.
5. Restart and confirm a conversation's choice survived.
6. Confirm the sentence under the composer attributes the choice correctly — *"from this
   conversation"* rather than naming the Journey.

### Still owed, not done here

- **The 12 redundant Journey overrides are left in place.** They equal the global default today, but
  a stored override stops following, so changing the global default will skip those 12 Journeys. They
  are the Navigator's data and cleaning them is **not** this CR's call to make silently.
- **CR158's stale-merge race is untouched**, deliberately.

## The Measurement Corrected: 8 redundant, not 12 (2026-10-15)

The Navigator asked for the 12 redundant Journey overrides to be cleaned. Recounting before touching
their data found **8**, not 12.

**My instrument read one field of a two-field record.** An override carries `model` *and*
`thinkingLevel`. I compared only the model against the global default, so four Journeys whose model
matches the global while their thinking level does not were counted as redundant:

| Journey | model | thinking |
|---|---|---|
| `nautilus-agentic-method` | `gpt-5.6-terra` = global | **`high`** vs global `pi-default` |
| `livro-lideranca-soberana` | `gpt-5.6-terra` = global | **`high`** |
| `softwarezen` | `gpt-5.6-terra` = global | **`high`** |
| `atlas` | `gpt-5.6-terra` = global | **`high`** |

Cleaning on my own number would have **destroyed four deliberate choices** — and because a Journey
override is a single record, removing it to drop a redundant model would have dropped the thinking
level with it.

| | |
|---|---|
| Journey overrides | 15 |
| **fully redundant** (model *and* thinking match, or absent) | **8** |
| **real distinctions** | **7** |

### The conclusion does not change — it strengthens

Option A rested on the Journey grain being used. It is used by **7 of 15** Journeys rather than 3, so
retiring it would have cost more than the original argument claimed, not less. Three carry a distinct
model (`mirror-desktop` → `claude-bridge/claude-opus-5`, `alissonvale-com` carries `high`,
`fabio-henri` → `gpt-5.5`) and four carry a distinct thinking level.

The rest of the reasoning stands unaltered: the 8 remaining redundant entries are still the
fingerprint of the composer writing a Journey-wide value, and the conditional write that this CR
added is still what stops them accumulating at the finer grain.

## Dev Build for the Field (2026-10-15)

Source `6a0cf3f`, worktree clean, 0 unpushed. Installed binary
`ab11e16526f59f49d97a62644239a7fd892e9fb8d8c3b489b8ac8e7083668549`, identical to the built one,
replacing `a54cbbc5…`. Backup at `/tmp/Mirror Desktop Dev-20261015-105119.app`, hash-verified before
removal; bundle identity checked before the destination was touched; `ps` gate before the backup and
again immediately before the copy.

Verified against the built bundle `dist/assets/index-CSqGTvl6.js`: `Follow the Journey default` 1×,
`conversationOverrides` 14×, `conversationOwnsChoice` 2×, the new key error 2×, `1.1.0` 3×. Paired
with absence: `This conversation now uses “` accounts for **every** occurrence of ` now uses “`, so
no copy of the superseded message naming the Journey survives. An invented literal returns 0 and the
binary returns 0 for a string the stylesheet-sibling JS returns 1 of, which is the compression
control.

**A third false zero, caught by its own check.** `from this conversation` returned **0**. The sentence
is assembled — `“this conversation”` is the literal and `— from ` is the connector — so the contiguous
form cannot exist. Re-checked on the literal the code actually contains, it is present once. The zero
was the instrument's, not the feature's.

## The Cleanup, Not Done Yet

**Blocked on production being closed.** The running app holds `agentSettings` in memory and every
write serialises the whole record from that copy, so editing the file under a live writer would be
undone by the next model or profile change. Production was open at pid 67744.

When it is closed, the cleanup removes the **8** fully redundant entries, preserves the **7** real
ones, and must **not** add `conversationOverrides` or bump `schemaVersion`: production is still
`alpha.50`, whose parser enforces an exact three-key root, so a migrated file would make it refuse to
load agent settings entirely. Migration belongs to the first write of a build that carries this CR.

## The Field Found What Both Suites Missed (2026-10-15)

**Navigator report:** *"Recebi esse erro ao tentar alterar o modelo da conversa no seletor: Agent
settings root contains unsupported fields."*

**Every write of a conversation choice failed.** The settings file validates its root keys **twice**,
in two languages, and I changed one:

| | |
|---|---|
| `src/domain/agentProfile.ts` — `ROOT_KEYS` | changed to four keys ✅ |
| `src-tauri/src/agent_settings.rs:183` — the command's allowlist | left at three ❌ |

The Rust command refused the payload, so the frontend's own parse never got a say. A second refusal
was waiting behind it: the command also required `schemaVersion == "1.0.0"` exactly, and the new
write emits `1.1.0`.

### Why nothing caught it

**Each side only ever checked its own list.** `cargo test` validated the Rust allowlist against Rust
fixtures that were all three-key `1.0.0` payloads, so it passed. The TypeScript suite validated the
TypeScript allowlist, so it passed. `agentProfileSettings.test.ts` already read the Rust source — but
only for claims about the process boundary, never about the schema.

So **both suites were green on a feature that could not save**, and the gates I reported (`tsc`,
2,172 tests, cargo 324, build, roadmap) were all true and all beside the point.

### The enumeration mistake, in the same shape as the last one

One slice earlier I recorded that my enumeration had been falsely complete because I grepped a name
followed immediately by a quote. Here I did it again at a larger scale: I enumerated *where the
schema lives* by searching TypeScript. **The second validator was in another language, so it was
never in the search.**

The re-check was exhaustive rather than enumerated — every file of any type mentioning
`journeyOverrides` — and it confirms there are **exactly two** such places, which is now asserted
rather than believed.

### Fixed

- The Rust allowlist carries `conversationOverrides`.
- The Rust validator accepts `1.0.0` and `1.1.0`.
- `conversationOverrides` entries are validated Rust-side: the key is `journeyId|threadId` with each
  segment checked on its own and an empty thread accepted, and the body is allowlisted to
  `model`/`thinkingLevel`. Override validation was extracted so both grains share one routine rather
  than two copies drifting apart.
- Three Rust tests, including the exact payload the frontend writes.

### The durable repair: a guard that reads both sides

`agentProfileSettings.test.ts` now derives each list **from its own source** and asserts they are
equal — the root key allowlist and the accepted schema versions. Neither module exports anything for
the other's test, and both lists are asserted **non-empty first**, because two failed extractions
would otherwise agree perfectly.

A third guard pins the **conversation key rule** on both sides: splitting on the separator, requiring
two segments, accepting an empty thread, and reusing the Journey identifier rule. It is **structural,
not behavioural equality** — vitest cannot execute the Rust validator — and it says so, because the
same divergence there would fail every write the same way.

### A control that proved nothing, and was rebuilt

The key-rule guard's first control failed — but with `no declaration follows
assertConversationKey`, because that function is the **last** in its file and my helper required a
following declaration. It failed identically whether or not the guarded property held, so it was not
a guard working. The helper now falls back to the end of the file and asserts the body is non-empty;
the control then failed on the right assertion, naming the Journey identifier rule.

### Controls

Three, each confirmed applied before its result was read:

| control | TS cross-language guard | `cargo test` |
|---|---|---|
| Rust allowlist without `conversationOverrides` — **the field defect, reproduced** | failed | failed |
| Rust accepting only `1.0.0` | failed | failed |
| Rust conversation key unvalidated | passed — **correctly**, it is not that guard's claim | failed |

The third is not a hole. The cross-language guard speaks about the key *lists*, and the rule guard
added afterwards is what covers the validator — confirmed by its own control.

`tsc` clean · **265 files / 2,175 tests** · `cargo test` **327** passed / 3 ignored · build clean ·
`roadmap:check` READY.

### What the Navigator's file suffered

**Nothing.** The command refuses before writing and the frontend surfaces the error, so the failure
was fail-closed: no partial payload reached disk and no choice was silently lost. The saved file is
still the untouched `1.0.0` three-key record.

## Dev Rebuilt With Both Halves (2026-10-15)

Source `85206c9`. Installed binary `cb465db8397402ffd053042695270de8a0cb96485aee13972046ef65da118f72`,
identical to the built one, replacing `ab11e165…`. Backup at
`/tmp/Mirror Desktop Dev-20261015-120500.app`, hash-verified before removal; identity checked before
the destination was touched; `ps` gate twice.

### A fourth false zero, and the A/B that settled it

My first verification searched the binary for the new Rust error sentences and got **0**. The signal
that it was the instrument and not the build: `"Agent settings Journey ID is invalid."` — a literal
that has been in this validator for many versions — is **also 0**, and so is every other full
`"Agent settings …"` sentence, in **both** binaries. Short fragments are findable
(`contains unsupported fields`, `agent-settings.json`, `mirror-append-rebinds.jsonl`, each 1×), the
long sentences are not. **`strings` and byte-grep are not a sound instrument for Rust error literals
in this build**, and that is a property of the build rather than of this change.

The sound check was available and better: the backup taken moments earlier is the **previous Dev
build, which carried the TypeScript half and not the Rust half** — an exact A/B.

| literal | new binary | previous binary |
|---|---|---|
| `conversationOverrides` | **1×** | **0×** |

The frontend ships compressed, so the only uncompressed source of that literal is the Rust
allowlist. It is present now and absent before, and **the instrument demonstrated it can return zero
by returning zero** — which is what a zero needs before it means anything.

Beyond that, the Rust half is verified where it is actually verifiable: `cargo test` **327 passed**,
including three new tests that validate the exact payload the frontend writes, and the hash chain
built → installed.

## The Cleanup, Still Blocked (2026-10-15)

Attempted and **aborted by its own gate**: production was open at pid 67744, so the file was not
touched. The script is written and asserted end to end — backup with a hash check, remove the 8,
preserve the 7 byte for byte, re-read from disk, and assert the root still has three keys and
`schemaVersion` is still `1.0.0`.

It deliberately does **not** migrate. Production is `alpha.50`, whose command enforces an exact
three-key root, so writing `conversationOverrides` into that file would make production refuse to
load agent settings entirely. Migration belongs to the first write of a build carrying this CR.
