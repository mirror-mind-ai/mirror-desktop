[< RS023](index.md)

# CR137: Bring the Navigator Back to the Conversation They Left

**Status:** planned
**Driver:** —
**Delivery:** —

## Friction

Found by the Navigator while field-validating CR133 on the Dev channel, 2026-10-09: the active selection was a conversation, `⌘Q`, and the app reopened showing the Journey workspace instead.

The Journey is remembered; the conversation inside it is not. `activeJourneyId` is persisted in `journey-preferences.json`, and CR133 added `expandedConversationJourneyIds`, but no conversation coordinate is stored anywhere. The selection reducer initialises to `{ kind: "journey_workspace", journeyId: "" }` (`App.tsx:731`–`:734`), which `resolveSelectedConversationSpace` then resolves to the restored Journey's workspace.

**This is not a CR133 regression.** Before CR133 the initial focus was `{ kind: "all_journeys" }`, which derived to exactly the same thing: the Journey workspace. The outcome on relaunch is unchanged.

What CR133 changed is that the gap is now **visible, and two surfaces disagree**. Before, nothing came back expanded, so there was nothing to contradict. Now the Journey's group returns open with the conversation the Navigator was in sitting right there in the list, while the main surface shows the Journey workspace. The sidebar says *you were here* and the transcript says *you were somewhere else*.

CR133's plan recorded this as an explicit exclusion — "no per-Journey selection memory … recorded as a possible follow-up, not folded in" — and CR133's acceptance only ever promised that reload preserves *expansion*. That acceptance is met. This is the follow-up materialising, now with field evidence behind it.

A second consequence, **derived from the code and not witnessed in the field** (the Dev drafts file was empty at the time of writing): a composer draft typed inside a conversation is stored under `conversationDraftKey(journeyId, conversationId)` — `journeyId__conversation_<hex>` (`conversationSpaces.ts:117`–`:121`) — and is restored into the draft map, but the load path shows `restoredDrafts[nextActiveJourney]` (`App.tsx:1670`), which is the *Journey* key. So a conversation's draft should survive a relaunch and stay invisible until that conversation is clicked again. This needs confirming before it is treated as fact.

## Outcome

A relaunch returns the Navigator to the workspace they left, whether that is a Journey workspace or a conversation inside one. A conversation that cannot be restored degrades to its Journey workspace and says so rather than failing.

## First Investigation

1. Decide what is persisted: one global "last workspace", or a last selection **per Journey**. The second is the mechanism CR133 excluded, and it would also answer "return to A and be where I was in A" without a click. Establish whether one mechanism serves both or whether they are genuinely separate.
2. Establish what a restored conversation coordinate must be validated against before it is trusted — the catalog has not loaded yet at restore time, and the conversation may have been deleted, renamed, or left `needs_attention`.
3. Determine whether restoring a conversation selection must load its transcript eagerly, or whether it can resolve lazily once that Journey's catalog arrives. CR133 made catalogs per-Journey and sequential on startup, so the selection may be restored before its catalog exists.
4. Establish whether the visible composer draft must follow the restored selection, and confirm or refute the derived draft consequence above.
5. Check the interaction with CR135: a hidden conversation that was the last selection must not be restored into a surface that hides it.

## Acceptance

- A relaunch restores the workspace the Navigator left, and the sidebar and the main surface agree about where that is.
- A stored conversation that no longer exists, or cannot be opened, degrades to its Journey workspace without an error state.
- Restoring a selection never starts, provisions, restarts or activates a Journey or a conversation.
- The visible composer draft matches the restored selection.
- A conversation hidden under CR135 is never silently restored as the active surface.

## Boundaries

No change to run admission, occupancy or runtime keying. Restoration is renderer and preference state only and must never participate in deciding who owns work. No change to expansion, which CR133 already persists.


---

## First Investigation — answered against source (2026-10-11)

**The CR's own line references had drifted** and are corrected here: the selection reducer's initial
value is at `App.tsx:769`-`:770`, not `:731`-`:734`, and the draft restore is at `:1790`, not
`:1670`. CR145 grew the file between the capture and the plan.

### 1. One global last workspace, or one per Journey — they are separate, and the per-Journey map serves both

`resolveSelectedConversationSpace(selection, selectedJourneyId)` resolves a selection that **carries
its own `journeyId`** against the currently selected Journey, degrading to that Journey's workspace
when they disagree. So a single stored selection restores correctly on relaunch and is then
destroyed by the first Journey switch — leaving *"come back to A and be where I was in A"*
unanswered.

A per-Journey map subsumes the global case entirely: restoring is `map[activeJourneyId]`. **Only one
mechanism is needed, and it is the per-Journey one.**

**But it is not free, and the cost is a behaviour change the plan must own.** Storing per Journey
makes it tempting to also restore on every in-session Journey switch, which is *not* what this CR's
Outcome promises and would change a deliberate design: the comment above
`resolveSelectedConversationSpace` says the degrade-on-mismatch guard was deliberately moved there
"so selecting inside a Journey the Navigator has not gone to yet stays expressible." **This plan
persists per Journey and restores only at startup.** In-session switching keeps today's behaviour.
Honouring the map on every switch is a separate decision, and naming it is cheaper than discovering
it.

### 2 and 3. What validates a restored coordinate — and the route already exists

**The route this CR needs is already written, for a different trigger.** CR134's
`navigateToJourneyWorkOwner` (`App.tsx:4316`) does exactly these four steps: select the Journey;
take the catalog if ready **or `await expandJourneyConversations(journeyId)` if not**; find the
entry; dispatch `select_desktop` — and when no entry matches, dispatch `select_root`, with the
comment calling the Journey "the honest fallback."

That answers item 3 directly: **neither eagerly nor lazily — the route loads the catalog itself.**
An earlier reading of mine was wrong and is corrected here: I noted that the catalog is gated on
expansion and self-cancelling (`if (!expandedConversationJourneyIdsRef.current.has(…)) return`,
on both the success and failure paths) and concluded a restored selection might never get a
validator. The expansion-gating is real; the conclusion was not, because this route expands the
Journey before reading.

**And that is exactly why the route cannot be reused unchanged.** Two consequences:

- `expandJourneyConversations` dispatches `{ type: "expand", journeyId }`, which is **persisted
  state CR133 owns**. Restoring a conversation would therefore also open — and persist — that
  Journey's disclosure. In production `expandedConversationJourneyIds` is `[]` today, so this would
  write a value the Navigator never set. The plan accepts this for the *restored* Journey only and
  says so, on the reasoning that a conversation you were working in having its group open is
  coherent rather than surprising; it is recorded as a deviation to be vetoed, not as a detail.
- **CR134 and CR137 want opposite behaviour on a hidden conversation.** CR134's documented intent is
  to reach the owner of running work *even when it is hidden* — overriding CR135 is correct there,
  because work is really happening. CR137's acceptance line 5 forbids exactly that. So the shared
  route must take the hidden policy as an argument rather than hard-coding CR134's.

### 4. The draft consequence — CONFIRMED, and then dissolved by the fix

The consequence derived in the Friction section was marked *"needs confirming before it is treated
as fact."* **It is confirmed, with live field data on both channels**, and the production instance is
the more telling one: `composer-drafts.json` holds exactly one key, conversation-scoped
(`mirror-desktop__conversation_<hex>` decoding to
`desktop-conversation-mirror-desktop-18d5d76503aee718`), carrying a 203-character unsent message
written on 2026-10-12. Dev holds one of the same shape.

The draft is **not lost** — it is on disk and returns the moment that conversation is clicked. It is
*unfindable*, and in production it is worse than the CR describes, because `activeJourneyId` is
`livro-lideranca-soberana`: a relaunch opens a different Journey entirely, putting that unsent
message two navigations away with no surface anywhere indicating it exists.

**And the repair needs no draft code at all.** There are two effects writing the visible draft: one
keyed on `[selectedJourney, composerDraftsLoaded]` reading the **Journey** key (`:1822`), and a
second keyed on the **selection** reading `conversationDraftKey(selectedJourney, conversationId)`
(`:1831`). The second is *total* — `conversationDraftKey(journeyId, undefined)` returns the bare
`journeyId` — and it runs after the first, so it wins. **The visible draft is already derived from
the selection.** Restore the selection and the right draft appears by construction; acceptance line
4 is satisfied with zero new wiring, and `:1790` and `:1822`'s draft write are already redundant.

So the stranded-draft condition is a **symptom of the unstored selection, not a second problem**.

### 5. CR135 — live material to test against

Dev's `hiddenConversationIdsByJourneyId` already holds two hidden Desktop conversations under
`mirror-desktop`, so the degrade path has real data behind it rather than a fixture. Production's is
empty.

## Scope

Persist the last selection per Journey, and restore it at startup through the existing navigation
route with a hidden-conversation policy of its own.

1. **Persistence.** Add `lastConversationSelectionByJourneyId` to `PersistedJourneyPreferences`,
   parsed defensively and sanitized against the registry like its neighbours, defaulting to empty so
   an older file loads unchanged.
2. **A `restore` action on the selection reducer.** The expansion reducer already has one
   (`conversationExpansionActionTypes` includes `"restore"`); selection does not
   (`["select_root", "select_desktop", "select_mirror"]`). This mirrors CR133's shape deliberately.
3. **Parameterise the shared route's hidden policy** so CR134 keeps overriding CR135 and CR137 does
   not, with CR134's existing behaviour pinned by test.
4. **Restore at startup** in `restoreJourneyRegistryAndPreferences`, after the Journey is selected,
   degrading to the Journey workspace whenever the coordinate cannot be resolved, is hidden, or
   names a conversation that no longer exists.

### Files

- `src/domain/journeyPreferencePersistence.ts` — the new field, its parse, default and sanitize.
- `src/domain/conversationSpaces.ts` — the `restore` selection action.
- `src/app/App.tsx` — persist on selection change; the hidden-policy argument; the startup restore.
- `src/tests/` — one new suite; `conversationDisclosureSeparation` and the CR134 route suite
  re-asserted rather than edited.

## Acceptance

Unchanged from the capture, with one line now satisfied by construction rather than by new code:

- A relaunch restores the workspace the Navigator left, and the sidebar and the main surface agree.
- A stored conversation that no longer exists, or cannot be opened, degrades to its Journey
  workspace without an error state.
- Restoring a selection never starts, provisions, restarts or activates a Journey or a conversation.
- The visible composer draft matches the restored selection — **already true**, because the draft is
  derived from the selection at `:1831`. A test pins it so a later change cannot quietly break it.
- A conversation hidden under CR135 is never silently restored as the active surface.

## Validation

- A negative suite that outnumbers the positive, as in CR142 and CR145: a missing conversation, a
  hidden conversation, a Journey that no longer exists, an older preferences file with no such key,
  and a malformed coordinate must each degrade to the Journey workspace rather than throwing or
  showing an empty conversation surface.
- CR134's hidden-override pinned **verbatim** — if a test has to be edited to make CR137 pass, the
  slice has grown past its scope.
- A source guard that the restore path calls no start, provision or activation function.
- Field check: with Dev's two already-hidden conversations, select one, relaunch, and land on the
  Journey workspace. The positive half is provocable for once — select a conversation, `⌘Q`,
  relaunch — so unlike CR145 this CR can be field-verified in both directions.

## Exclusions

- **No in-session restore on Journey switch.** The map makes it possible; this CR does not do it.
- No change to expansion as a *feature* — but the restore does open the restored Journey's
  disclosure as a consequence of reusing the catalog route, named above as a deviation.
- No change to run admission, occupancy or runtime keying, per the original Boundaries.
- The `activeJourneyId` behaviour is untouched: this restores *where in a Journey*, not *which
  Journey*.
- Nothing is done about the one incidental anomaly this investigation turned up: the Dev registry
  carries a Journey whose id is its own slug twice, `us1-rerun-a-0831us1-rerun-a-0831`, in a family
  where every sibling is well-formed. It arrives from Mirror through the synced registry, it is
  harmless here because `sanitizeJourneyPreferenceState` filters against the registry it came from,
  and **it is deliberately not minted as a CR** — recording it costs a sentence and a numbered row
  would not earn its keep.
