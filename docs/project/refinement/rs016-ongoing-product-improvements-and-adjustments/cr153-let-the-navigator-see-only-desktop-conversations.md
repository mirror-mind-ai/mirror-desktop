[< RS016](index.md)

# CR153: Let the Navigator See Only Desktop Conversations

**Status:** in_progress
**Driver:** assistant
**Delivery:** `refinement/cr152-cr153-conversation-list-reduction`
**Navigator priority:** 5 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"opção 'show only desktop conversations' na lista de conversas"*

The conversation list mixes kinds, and the Navigator wants to see only the one they work in.

## What Exists

The list carries **three** kinds, not two:

| kind | what it is |
|---|---|
| `desktop_conversation` | a conversation created and worked in the application |
| `journey_workspace` | the Journey's own workspace entry |
| `mirror_history` | history coming from Mirror |

So "only desktop conversations" excludes two different things for two different reasons, and the
Navigator should confirm both are meant — `journey_workspace` is the Journey's own entry, and hiding
it may remove the way into the Journey itself rather than merely tidying the list.

## This Is a Filter, Not Hiding — and the Difference Matters

CR135's hiding and this filter look alike on screen and are not the same thing:

| | CR135 hiding | this filter |
|---|---|---|
| grain | one named conversation | a whole kind |
| durability | written per Journey in `HiddenConversationsByJourney` | a view preference |
| meaning | *I am done with this one* | *do not show me this category* |
| survives a new conversation of that kind | the new one is visible | the new one is filtered too |

**Implementing this as a bulk hide would be wrong**, and would look right at first: it would hide
today's non-desktop entries and then let tomorrow's appear, which is exactly the behaviour the
Navigator is asking to be rid of. The last row is the test that tells the two designs apart.

## Outcome

The conversation list has a filter that shows only desktop conversations, it persists across restart,
and a newly arriving non-desktop entry stays filtered without the Navigator acting again.

## First Investigation

- ~~**Does it mean all three excluded, or only `mirror_history`?**~~ **Answered by the Navigator
  (2026-10-12): only `mirror_history` is excluded.** `journey_workspace` stays visible. So the filter
  hides exactly one kind, which makes the label *"show only desktop conversations"* narrower than it
  reads — it keeps the Journey's own workspace entry too. **The label should say what it does**, or
  the Navigator will eventually wonder why a non-desktop entry is still there.
- **Where does the preference live?** `journey-preferences.json` already persists per-Journey
  selection state and would make the filter per-Journey; a global filter would need a different home.
  Per-Journey and global are different products — one is *this Journey is noisy*, the other is *I
  never want these*.
- **What happens to a filtered conversation that is selected, or running?** Filtering out the active
  conversation would be a worse version of the defect CR137 repaired, where the Navigator's work was
  present and unfindable. A filter must not be able to hide the thing being worked in.
- **How does it compose with CR135's hidden set?** Both reduce the list. A conversation that is both
  filtered and hidden must have one unambiguous way back, or the Navigator will not find it.
- **Is the filter's state visible when it is on?** A list that is quietly short is the beginning of
  believing something was lost.

## Boundaries

Does not delete, does not write hidden state, and does not change what any kind means or how entries
are produced. Does not change CR135's hiding. Shares a surface with
[CR152](cr152-let-the-navigator-hide-every-conversation-but-one.md) and may ship alongside it; the
mechanisms stay separate.

## Provenance

The three kinds read from `conversationSpaces.ts` and `journeyConversation.ts` on 2026-10-12.
CR135's store shape read from `conversationVisibility.ts`. The distinction between a durable hide and
a view filter is reasoned from those two shapes, not observed in the field.

---

## The Friction Measured (2026-10-13)

CR153's Provenance admitted the three kinds were *"read from `conversationSpaces.ts` and
`journeyConversation.ts`"* — from the types, never from the field. Measured now, by running the same
script the application runs (`uv run python scripts/mirror_conversation_catalog.py catalog`, which is
what `load_mirror_conversation_catalog` invokes):

| Journey | `mirror_history` | untitled **and** empty | named **with** messages |
|---|---|---|---|
| `mirror-desktop` | 41 | 22 | 18 |
| `alissonvale-com` | 45 | 19 | 24 |
| `livro-lideranca-soberana` | 57 | 36 | 20 |

Against **4** `desktop_conversation` entries in `mirror-desktop` and **1** in
`nautilus-agentic-method` — the only two Journeys with a `catalog.json` at all.

**Two caveats on my own numbers.** I ran with `--limit 100`; the application calls with `limit: 50`
and additionally excludes `managedMirrorConversationIds`, the Mirror conversations the Desktop
already owns. So the count the Navigator sees is **at most** these figures, not exactly them. And
`INITIAL_VISIBLE_CONVERSATIONS = 6`, so the list is not 46 rows — it is 6 rows and a *Show 39 more*
button.

**That is where the friction actually lives.** `App.tsx:4396` builds the list as
`[...desktopEntries, ...mirrorEntries].sort(by updatedAt desc)` — a single recency-interleaved union.
So the Navigator's four Desktop conversations compete for six slots against dozens of Mirror
entries, **half of which are untitled and have zero messages**. The complaint is not that the list is
long; it is that the things being worked in can be pushed out of view by conversations that contain
nothing.

### A correction to my own reading

My first measurement read `catalog.json` and found **zero** `mirror_history` entries, and I was about
to report that this CR had no field basis. That was wrong. `catalog.json` is written by
`load_desktop_conversation_catalog` and holds **only** Desktop entries; `mirror_history` entries are
fetched **live** from the Mirror database on every catalog load and never persisted. Absence from
that file was by design, and reading one of two sources is not a measurement of the union.

## Investigation Answered

### Only `mirror_history`, and the catalog has two kinds rather than three

`conversationVisibility.ts` states it directly: *"`journey_workspace` is a selection kind and never a
catalog entry, so it cannot be hidden."* So the filterable catalog is a union of **two** kinds, and
excluding `mirror_history` leaves exactly `desktop_conversation`. The Journey's own row is a
different surface element and is untouched without any special case.

**The label still should not be the Navigator's phrasing.** *"Show only Desktop conversations"* would
be read as a promise about everything on screen, while the Journey row stays. The control says
**"Desktop only"** and the status line names what it did: *"N Mirror conversations hidden by this
filter."*

### Global, and the data decided it

Both grains already live in the same file, so this was never a structural question:
`journeyPreferencePersistence.ts` holds **global** values (`sidebarCompact`, `applicationTheme`,
`voiceLanguage`) beside **per-Journey** ones (`hiddenConversationIdsByJourneyId`,
`expandedConversationJourneyIds`, `lastConversationSelectionByJourneyId`). A global filter needs no
new home, which CR153 supposed it would.

With equal cost, the measurement chooses: the noise is **41, 45 and 57** — universal, not
*"this Journey is noisy"*. Per-Journey would make the Navigator state one intent thirteen times.

**The cost, named rather than discovered later.** `FocusedConversationSidebar` is rendered inside a
per-Journey map and CR133 allows several groups open at once, so a global control in the group
heading appears **once per open group**, every copy reflecting and toggling the same state. That is
consistent rather than broken, and it is the price of the grain the data argued for. Moving the
control to a single site later is a render change and not a data migration.

### A filter must not hide the conversation being worked in

`partitionConversationVisibility` already solves this for hiding, with `shownBecauseSelected`, and
the reason is recorded there: a list that omits the conversation the transcript is showing is
*"the same two-surfaces-disagree defect used to characterise CR137, except guaranteed rather than
incidental."* The filter therefore **never removes the selected entry**, by the same mechanism and
with the same marking, and that is asserted rather than assumed.

### Composition: three reducers, three counts, three inverses

This file already distinguishes two ways a conversation can be concealed and keeps their counts
apart on purpose — CR143's comment: *"only one of them was the Navigator's choice… so each closed
control carries the count for its own partition and for nothing else."* The filter is a **third**,
and it follows the same rule: it is applied **before** partitioning, so hidden-section membership is
computed on what survives the filter, and it reports its own count through its own control.

Each reduction keeps its own way back: the filter has a toggle, CR135's hiding has *Reveal*, the
app's cap of six has *Show N more*. Nothing is reachable only through someone else's inverse.

## Plan

**Scope.** A new `src/domain/conversationKindFilter.ts` with a pure
`applyConversationKindFilter({entries, hideMirrorHistory, selected})` returning the surviving
entries, the count removed, and the selected entry preserved. A global `hideMirrorHistory: boolean`
in the preference shape with parse and default. The sidebar applies it before partitioning and
renders a toggle plus a status line.

**Files.** `src/domain/conversationKindFilter.ts` (new) · `src/domain/journeyPreferencePersistence.ts`
· `src/app/FocusedConversationSidebar.tsx` · `src/app/App.tsx` · `src/styles/app.css` ·
`src/tests/conversationKindFilter.test.tsx` (new).

**Acceptance.** (1) With the filter on, no `mirror_history` entry is listed. (2) Every
`desktop_conversation` entry remains. (3) The selected conversation is never removed, even when it
is `mirror_history`. (4) The count of what was filtered is shown while the filter is on. (5) The
preference survives a relaunch. (6) A newly arriving `mirror_history` entry is filtered without the
Navigator acting again. (7) CR135's hidden set and the app's cap of six keep their own separate
counts.

**Validation.** Pure-function assertions including the new-arrival case, which is the test that tells
a filter apart from a bulk hide; `renderToStaticMarkup` for the toggle, the status line and the
absence of Mirror rows; a persistence round-trip; a source guard that the filter runs **before**
`partitionConversationVisibility`.

**Exclusions.** Does not delete, does not write CR135's hidden state, does not change what any kind
means, does not touch the Mirror side where those untitled empty conversations are produced, and
does not change the recency sort or `INITIAL_VISIBLE_CONVERSATIONS`.

## Delivery (2026-10-13)

`src/domain/conversationKindFilter.ts`, a pure `applyConversationKindFilter`, kept as its own module
because this CR's whole argument is that a filter and a bulk hide are different mechanisms. A global
`hideMirrorHistory: boolean` joins `sidebarCompact` in the preference file, degrading to `false` on a
bad value under the departure CR133 established — a view preference must never cost the Navigator
their pins.

**The filter runs before the hidden partition**, so CR135's hidden section is computed on what
survives it and a kind is never concealed in two places at once. Three reductions now act on this
list and CR143's rule governs all three: each carries the count for its own partition and offers its
own way back. The filter has a toggle and a line naming what it removed, hiding has *Reveal*, the cap
of six has *Show N more*.

### A guard of CR135's caught a wrong decision of mine

I changed the heading to report the surviving count. CR135 had pinned it to the factual total on
purpose, and `conversationVisibilitySeparation.test.ts` failed immediately. The guard was right: a
filter that also edits the heading makes the Navigator believe conversations stopped existing rather
than stopped being shown, and it merges two counts the file requires to stay apart. Reverted, and
the revert is now itself a test.

14 tests, including the one that tells this design from the wrong one — a Mirror conversation
**arriving after** the choice was made is filtered without the Navigator acting again. Five controls
run across both CRs, each compiling and then failing on the right assertion.

## Field Check Owed

On Eval, where the Journeys are real. Predictions written first.

1. **Open a Journey's conversation list.** Note the count in the heading and how many rows are
   Mirror (`◇`) against Desktop (`◆`).
2. **Press "Desktop only".** Every Mirror row should go, Desktop rows should stay, the heading
   should keep the **original** total, and a line should say *"N Mirror conversations hidden by this
   filter."*
   *If the heading changes,* the CR135 revert did not reach the build.
3. **Open a second Journey's list.** It should already be filtered, with its own count.
   *If it is not,* the preference is not global and the measurement that chose that grain was wrong.
4. **Quit and relaunch.** The filter should still be on.
5. **Press it again.** Everything comes back.
6. **Right-click a conversation → "Hide Other N".** The others go to the hidden section; this one
   stays. Open the section and **Reveal** one — only that one returns.
   *If the kept conversation disappears,* the keep-guard is not firing.