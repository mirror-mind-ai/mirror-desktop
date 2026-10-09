[< RS023](index.md)

# CR133: Stop a Disclosure From Selecting a Journey

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Revealing a Journey's conversations is not a structural act in this app; it is a navigation act. `expandJourneyConversations` calls `selectJourney(ownerJourneyId, "pointer")` and dispatches `journey_selected` **before** dispatching `expand` (`App.tsx:3998`–`:4004`), and the catalog load that follows reads `selectedJourney` to decide whether it may reuse the loaded thread.

Two consequences, both reported:

1. Opening a Journey's conversation list by its disclosure arrow **selects and loads that Journey**, even when the Navigator wanted only to see what is inside it.
2. Switching to another Journey collapses the original Journey's conversation list, because conversation focus is a single `focused_journey` state rather than a set, so direct access to work in flight is lost.

Together these make stable alternation among concurrent work in several Journeys or conversations impossible. This is the symptom the Navigator describes as the app not feeling stable.

## Outcome

Structural visibility and selection are separately operable. The Navigator can reveal what is inside a Journey without going there, keep several conversation groups open at once, and return directly to an active conversation from the sidebar.

## First Investigation

1. Trace selection, expansion and persistence as three separate concerns through `conversationFocus`, `selectedJourney`, `collapsedJourneyIds` and the sidebar preferences file. Record which of them the catalog load actually requires.
2. Establish what the catalog load genuinely needs from `selectedJourney`. It currently reuses `journeyThreadState.thread` only when `ownerJourneyId === selectedJourney`; determine whether loading a non-selected Journey's thread is safe, idempotent and free of provisioning side effects.
3. Reproduce the exact reported sequence and record every state transition that selects or reloads a workspace: active conversation → select another Journey → return to or disclose the original Journey.
4. Determine whether expansion must become a set, and whether an expanded group containing active work needs different retention from an idle one.

## Acceptance

- Expanding or collapsing a Journey's conversation disclosure never changes selected Journey, selected conversation, Composer target, loaded transcript or run ownership.
- Selection and structural visibility are separately operable with both keyboard and pointer.
- Changing selected Journey does not silently collapse unrelated expanded conversation groups, and never one that contains active work.
- The Navigator can return to an active conversation directly from the sidebar.
- Reload preserves expansion choices without fabricating a run owner and without losing access to an active native process.
- Revealing a Journey's conversations does not provision, start, restart or otherwise mutate that Journey.

## Boundaries

No change to admission, occupancy or runtime keying — a Journey that refuses work still refuses it, and this CR does not make anything concurrent. No change to transcript authority or Mirror provenance. Expansion state is renderer state; it must never participate in run admission.
