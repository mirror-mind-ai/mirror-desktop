[< RS024](index.md)

# CR143: Say Which Conversation Is Working

**Status:** captured
**Driver:** —
**Delivery:** —

**Reported by the Navigator from the field**, 2026-10-10, immediately after RS024's verification
passed: *"a única falta que senti foi de algum indicador que o agente estava rodando no contexto de
uma conversa."*

## Friction

Three turns can now run at once inside one Journey. Nothing on screen says which three.

The conversation list shows titles and message counts. While work runs, the Journey row reports
that something is working — CR134's `JourneyAgentStatusIndicator` — and the open conversation shows
its own stream. But a Navigator looking at the list, which is where they choose what to look at,
cannot tell a conversation that is working from one that is idle. They have to open each one.

**This gap was created by the work that just shipped.** While one turn per Journey was possible,
*the Journey is working* was a complete statement, and CR134's Journey-level indicator was the
right grain. RS024 made the grain wrong without making it incorrect: the indicator still tells the
truth, and it no longer tells enough of it.

## What was established against source, 2026-10-10

- `FocusedConversationSidebar` takes a single `busy?: boolean` in its `Props`, used only by the New
  Conversation button (`:116`, `:120`, `:179`). It is a property of the group, not of an entry.
- Its `entries: ConversationCatalogEntry[]` carry catalog data — kind, title, thread, message
  count, status — and no execution state.
- `JourneyAgentStatusIndicator` is rendered at `App.tsx:5520` and `:5652`, outside the list, and is
  parameterised by Journey with a locus.
- The state needed already exists and is already correct at the right grain: CR141 added
  `selectWorkspaceNativeLease(state, workspace)`, and `liveWorkspacesInJourney(state, journeyId)`
  has reported this Journey's live authorities since CR140.

So the question is a rendering one, not a state one. That should be confirmed rather than assumed.

## Desired Outcome

A Navigator scanning the conversation list can tell which conversations are working, without
opening them.

## First Investigation

1. Establish whether the indicator should distinguish *phases* — running, finishing, waiting on
   settlement — or only working versus idle. CR134 settled a related question for the Journey row;
   re-deciding it at this grain is cheap now and expensive later.
2. Decide what a **hidden** conversation does when it starts working. CR135 lets the Navigator hide
   conversations from their working set, and a hidden conversation holding a live run is exactly
   the case where hiding could conceal something that matters. Related to CR134's rule that a
   refusal must not hide that work runs.
3. Establish how the state reaches the list. `liveWorkspacesInJourney` is per Journey and the
   sidebar renders per Journey group, which looks like a direct fit — but several groups can be
   open at once (CR133), so confirm the indicator is scoped to the group's own Journey and not to
   the selected one.
4. Decide whether the indicator is also a route. CR134 made its Journey indicator navigable to the
   owner. An indicator in a list whose entries are already clickable may not need to be.
5. Establish whether anything else in the list is now under-grained for the same reason. This item
   exists because RS024's fourth slice was missed by four investigations that each surveyed one
   path exhaustively; asking the general form of the question is the correction.

## Acceptance

- A conversation with a live run is visibly distinguishable in the list from one without, and the
  distinction disappears when the run ends.
- Two conversations running at once are both marked; the marking is per entry, never per group.
- The indicator is derived from occupancy at the workspace grain, not from the selected
  conversation's state.
- A hidden conversation's behaviour is whatever item 2 decides, decided explicitly and recorded.
- No existing surface loses information: CR134's Journey-level indicator keeps its meaning.

## Boundaries

No change to admission, the registry, the event transport or the refusal sentences. This is a
rendering slice over state that already exists. Whether it belongs to RS024 — whose subject it is —
or to RS016, and whether RS024 reopens to hold it, is a Workbench decision.
