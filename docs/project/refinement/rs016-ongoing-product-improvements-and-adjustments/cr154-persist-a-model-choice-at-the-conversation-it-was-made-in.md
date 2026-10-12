[< RS016](index.md)

# CR154: Persist a Model Choice at the Conversation It Was Made In

**Status:** captured
**Driver:** —
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

## The Likely Mechanism, Stated as a Hypothesis

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
