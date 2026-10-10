[< RS024](index.md)

# CR143: Say Which Conversation Is Working

**Status:** planned
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

## Investigation Findings and Plan (2026-10-10)

All five items answered against source. **Two findings changed this capture**: the same invisibility
arrives by a second mechanism nobody reported, and the list already uses the word this CR wants.

### Item 1 — two live states, and the reason is measured rather than chosen

`JourneyAgentStatus` carries six values. Only two of them apply here, and CR134 already drew that
line: `locusApplies` (`JourneyAgentStatusIndicator.tsx`) qualifies a locus **only** for `working`
and `finishing`, because *"the terminal states describe what already happened."* A conversation
entry answers *is this one running*, which is the live question.

So: **`working` and `finishing`, nothing else.** `finished`, `interrupted` and `failed` are
per-Journey attention states with a 5 s visibility window and a whole reducer
(`JOURNEY_FINISHED_VISIBLE_MS`, `journeyFinishedAttentionReducer`); replicating that per entry is a
much larger change than the reported need, and it is excluded explicitly rather than forgotten.

Including `finishing` is not free: `liveWorkspacesInJourney` filters by `isActivePiInvocationLease`,
which is `reserved | running` and **excludes `finalizing`**. The source that carries both is the one
`deriveJourneyWorkLocus` already uses — occupancy entries with `terminalState === "open"`, mapped to
`running` or `finalizing` by lease phase.

### Item 2 — hiding must not hide that work runs, and the rule already exists

CR134's title is *"Name the Owner of Running Work Without Hiding That It Runs."* That settles this
item without inventing a product rule: **a hidden conversation that is working must say so from
the closed state.**

It has to, because the hidden section is collapsed by default and renders only
`{partition.hidden.length} hidden`. A working hidden conversation is, today, completely absent from
the surface. Marking it only *inside* the expanded section would satisfy the letter of this CR and
miss its point, the same way CR135's reassurance had to be reachable before the section was opened.

### Finding 1 — the same invisibility arrives a second way, unreported

`INITIAL_VISIBLE_CONVERSATIONS = 6` caps the visible list, with *"Show N more"* below it. A working
conversation **below the cap is exactly as invisible as a hidden one**, by a different mechanism and
with no hiding gesture from the Navigator at all.

CR135 shipped partition-before-cap so hiding could not be confused with capping; this CR has to
cover both, because the Navigator's question — *which conversation is working* — is unanswered in
either case. The *"Show N more"* control must carry the same signal as the hidden toggle.

This was not in the report. It is in scope because it is the same defect, and naming it as the same
defect is cheaper than discovering it after delivery.

### Item 3 — the state is already per Journey at the call site

`FocusedConversationSidebar` is rendered inside the Journey map with `journeyId={journey.id}` and
`entries={journeyCatalog.entries}`, so every group is already scoped to its own Journey and CR133's
several-groups-open case needs no special handling — provided the new input is derived from
`journey.id` and not from `selectedJourney`. A guard asserts that, because it is precisely the slip
CR133's comment warns about and `busy` demonstrates below.

### Finding 2 — the list already says "Working…", and it means something else

`props.busy` renders the New button as `◌ Working…` (`:120`). It is
`journeyIsSelected && (conversationActionBusy || selectedRuntimeBusy || Boolean(runStartReservation))`
— a property of *the create action in the selected Journey*, partly driven by the selected
workspace's run.

So the sidebar already shows the word this CR is about, at the group level, meaning *you cannot
create a conversation right now*. Adding a per-entry working mark beside it without deciding this
would produce two "working" signals at two grains meaning two different things — the generic busy
state RS024 set out to remove, re-created inside the list.

**Decision: the per-entry mark is a glyph, not the word.** It reuses CR102's topology — every state
owns a shape, so the glyph alone identifies it, which was measured against colour and motion and
chosen for that reason. The New button's `Working…` is left alone: it is correct for what it
reports, and changing it is a different question.

**Named and not folded in**: `selectedRuntimeBusy` disabling *New* means a running conversation
blocks creating an unrelated one. That looks wrong after CR141, and it is **not** repaired here.

### Item 4 — the mark is not a route

CR134 made its indicator navigable because *"the Journey row is the one carrier no sidebar
configuration can remove, so it has to lead somewhere rather than only report."* That reasoning does
not transfer: a list entry **is** already a route — CR133 established that clicking a conversation
is navigation by design. A second route inside it would duplicate the gesture.

The two places that do need to lead somewhere are the collapsed hidden section and the capped
remainder, and both already have their gesture. Their marks make the existing gesture worth using.

### Item 5 — what else is under-grained

Beyond Finding 2: the entry's `metadata` line reads `Desktop · N messages` or `Not started`, from
the catalog. `Not started` describes a conversation with no messages, which is **not** the same as
*not running*, and the two will sit one line apart. The mark must be visually separate from the
metadata line so the distinction is not left to the reader. No other list element presents
Journey-level state as per-entry.

## Scope

- **New `src/app/conversationWorkIndicator.ts`** — a pure derivation, preferred over editing a
  widely-depended-on module for the sixth time in this Story:
  `deriveConversationWork(occupancy, journeyId)` → `ReadonlyMap<string, "working" | "finishing">`
  keyed by `threadId`, from entries with `terminalState === "open"`, mapping
  `isActivePiInvocationLease` → `working` and `leasePhase === "finalizing"` → `finishing`.
  Plus `summariseConversationWork(map, entries)` → `{ working, finishing }` counts for a set of
  entries, which is what the hidden toggle and the capped control need.
- **`FocusedConversationSidebar.tsx`** — a new `work: ReadonlyMap<string, ConversationWorkState>`
  prop; `renderEntry` draws a mark for a `desktop_conversation` whose `threadId` is in the map;
  the hidden toggle and the *"Show N more"* control each append a count when their own partition
  contains working entries.
- **`App.tsx`** — one wiring point: `work={deriveConversationWork(piInvocationOccupancy, journey.id)}`,
  memoised per Journey.
- **`src/styles/app.css`** — the mark, reusing CR102's registers.
- **No change** to admission, occupancy, the transport, the catalog or CR135's partition.

## Tests

- `deriveConversationWork`: two live siblings both appear; a `finalizing` lease reads `finishing`;
  a released or terminal lease is absent; another Journey's entries never appear.
- `summariseConversationWork`: counts only the entries given, so the hidden count cannot include a
  visible one.
- Component, via `renderToStaticMarkup`: two entries marked at once; the mark is per entry and never
  per group; an unmarked entry renders exactly as before; **a working hidden conversation is
  announced on the closed toggle**; **a working capped conversation is announced on "Show N more"**.
- Source guard: the sidebar's work input is derived from the group's `journey.id`, never from
  `selectedJourney`, and the component reads `props.work` rather than `props.busy` for the mark.
- Accessibility: the mark carries text, so it is not colour-only — CR102's rule, re-asserted here.

## Validation

`tsc` 0; `vitest` green; `cargo test` 285 unchanged with **0 native diff lines**; both builds;
`roadmap:check` READY.

**Field**: with two turns running in one Journey — the state RS024's verification just produced —
both conversations are marked in the list, and the mark clears as each finishes. Provocable by the
same D1 prompts, and **cheap now**, because the sequence is written and the instrument is installed.

## Exclusions

No terminal states per entry. No change to the New button's `Working…`, and no repair of
`selectedRuntimeBusy` disabling creation — both named above, neither folded in. No change to
CR134's Journey-level indicator, which keeps its meaning. Mirror-history entries are not marked:
they have no thread that can hold a lease.

## Three decisions written so they can be overruled rather than discovered

1. **Two live states only** — `working` and `finishing`, on the line CR134 already drew.
2. **A glyph, not the word** — because the list already says `Working…` at a different grain for a
   different reason.
3. **Hidden and capped conversations are announced from their closed controls** — treating the two
   mechanisms as one defect, which widens the reported scope and is the main thing to overrule if
   it is unwanted.

## Acceptance

- A conversation with a live run is visibly distinguishable in the list from one without, and the
  distinction disappears when the run ends.
- **A working conversation that is hidden or below the visible cap is announced on its closed
  control**, so neither mechanism can conceal running work.
- The mark is a glyph with text, never colour alone, and never the word `Working…` that the group
  heading already owns for a different meaning.
- Two conversations running at once are both marked; the marking is per entry, never per group.
- The indicator is derived from occupancy at the workspace grain, not from the selected
  conversation's state.
- A hidden conversation's behaviour is whatever item 2 decides, decided explicitly and recorded.
- No existing surface loses information: CR134's Journey-level indicator keeps its meaning.

## Boundaries

No change to admission, the registry, the event transport or the refusal sentences. This is a
rendering slice over state that already exists. Whether it belongs to RS024 — whose subject it is —
or to RS016, and whether RS024 reopens to hold it, is a Workbench decision.
