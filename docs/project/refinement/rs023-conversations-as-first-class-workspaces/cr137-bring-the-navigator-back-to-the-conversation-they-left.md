[< RS023](index.md)

# CR137: Bring the Navigator Back to the Conversation They Left

**Status:** captured
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
