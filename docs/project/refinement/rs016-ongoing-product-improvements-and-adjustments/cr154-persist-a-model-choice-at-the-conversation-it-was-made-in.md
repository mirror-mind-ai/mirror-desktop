[< RS016](index.md)

# CR154: Persist a Model Choice at the Conversation It Was Made In

**Status:** planned
**Driver:** — (decision owed before `in_progress`)
**Delivery:** —
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
| identical to the global, carrying no distinction | **12** |
| real distinctions | **3** — `mirror-desktop` → `claude-bridge/claude-opus-5`, `alissonvale-com` → `gpt-5.6-sol`, `fabio-henri` → `gpt-5.5` |

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
