[< RS021](index.md)

# CR109: Make Conversations First-Class Workspaces

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The daily experience of working with the agent inside a Journey conversation is unstable. Four
observed symptoms are one product-level problem: the Desktop does not consistently distinguish the
Journey container, its conversations and the work actually owned by a conversation.

1. **Conversation list has no workable visibility control.** The sidebar shows many conversations
   that are no longer in focus: old work and imported Mirror Core history compete with active work.
   The Navigator cannot quickly hide and later reveal them without treating them as deleted.
2. **Runtime status belongs to the wrong level.** `Working`, `Ready` and related status signals are
   attached to the Journey even when the work is happening in one conversation below it. This is
   misleading in the sidebar, Journey header and above the Composer.
3. **Parent work is blocked by child work.** When a conversation is `Working`, the Navigator cannot
   send work to the parent Journey. Distinct workspaces are treated as one busy owner.
4. **Sidebar navigation changes selection when it should change only expansion.** Switching to
   another Journey collapses the original Journey's conversation list, losing direct access to the
   work in flight. Reopening that list by its disclosure arrow also selects the parent Journey and
   loads it, even when the Navigator wanted only to reveal its conversations. This makes stable
   alternation among concurrent work in several Journeys or conversations impossible.

## Outcome

A Journey is a durable container and a conversation is a first-class workspace within it. The
Navigator can keep active work visible, distinguish its exact owner, work in an independent parent
workspace while a child conversation runs when native authority permits it, and expand/collapse
sidebar structure without changing selection or losing access to ongoing work.

## First Investigation

Characterise before changing presentation or admission:

1. Inventory the conversation catalog, including dedicated Desktop conversations, Mirror Core
   history and their current source/provenance, lifecycle and persistence coordinates. Establish
   which states may be hidden safely without deleting or mutating their authority.
2. Trace identity through sidebar rows, headers, Composer status and `JourneyRuntimeState`: identify
   whether current runtime entries are keyed by Journey, conversation, generation or run, and where
   ownership is deliberately collapsed.
3. Map actual native admission constraints: Pi process capacity, exact Journey/thread/generation
   authority, parent workspace provisioning, and same-conversation exclusion. Do not infer that
   “different conversations” automatically means safely concurrent.
4. Trace sidebar selection, expansion and persistence separately. Reproduce the exact sequence:
   active conversation → select another Journey → return/disclose original Journey, and record every
   state transition that selects or reloads a workspace.
5. Compare a current Desktop conversation, a parent Journey workspace and a Mirror Core history
   entry. The visibility model must preserve provenance and never represent a hidden imported record
   as deleted or a selected parent as the active child.

## Acceptance

- The Navigator can hide a conversation from the sidebar's ordinary working set and reveal it again
  through an explicit, discoverable control; hiding is reversible and does not delete, retire,
  mutate, merge or lose its transcript, Mirror provenance, thread or run evidence.
- The sidebar, selected-workspace header and Composer name runtime status at the conversation/workspace
  that owns it. A parent Journey does not read `Working` merely because a child is working; aggregate
  Journey state, if shown, is explicitly aggregate rather than impersonating the child.
- Work in a parent Journey workspace can be admitted while a child conversation works when exact
  native admission and authority permit it. A genuine shared constraint names itself precisely
  (capacity, same workspace, generation or process authority) rather than using a generic global
  busy state.
- Expanding or collapsing a Journey's conversation disclosure never changes selected Journey,
  selected conversation, Composer target, loaded transcript or run ownership. Selection and
  structural visibility are separately operable with keyboard and pointer.
- Changing selected Journey does not silently collapse unrelated expanded conversation groups that
  contain active work. The Navigator can return to an active conversation directly from the sidebar.
- Old Desktop conversations and Mirror Core history remain distinguishable by provenance in any
  visibility/reveal surface.
- Reload preserves visibility choices and selected-workspace truth without fabricating a run owner
  or losing access to an active native process.

## Boundaries

No automatic deletion, archival, migration or pruning of conversations. No changes to Pi/Mirror
transcript authority. No fabricated concurrency: distinct visual workspaces may run together only
where native process capacity and exact Journey/thread/generation authority admit them. This CR does
not turn a disclosure click into selection, a hide into a delete, or a parent aggregate into a child
runtime claim.

## Strategy and first characterisation (2026-10-08)

The Navigator prioritised this CR as *the last fragile point of the app and the part that cannot yet
be considered stable*. This section records what was verified in the code before any strategy, as the
First Investigation requires. **Status stays `captured`**: the strategy below recommends a split, and
re-scoping is a Workbench decision.

### The CR is not stale, it is the verdict on what shipped

`conversationSpaces.ts` and `FocusedConversationSidebar.tsx` were created **2026-09-14**. This CR was
captured **2026-09-30**, sixteen days later, and has not been touched since. So it does not describe a
pre-Conversation-Spaces world — it describes the one CV-008 / DS-004 delivered.

### One root, four faces

The app has a single notion of *where I am*, `selectedJourney`, and three unrelated concerns are all
derived from it: runtime ownership, native admission, and sidebar structure.

| Investigation item | Verified fact | Coordinate |
|---|---|---|
| 2 · how runtime is keyed | `JourneyRuntimeState.entries` is `Record<journeyId, Entry>`, and `register` **quarantines** a second run for the same Journey as `serial_capacity_rejected` | `journeyRuntimeState.ts:50`, `:104`–`:107` |
| 3 · native admission | the TS filter refuses on `entry.authority.journeyId === journeyId` → `same_journey_occupied` | `piInvocationOccupancy.ts:289`–`:291` |
| 3 · native registry | **the Rust registry's `entries` map is keyed by `journey_id`** — `self.entries.get(&journey_id)` inside `reserve` | `pi_process_registry.rs:263`–`:292` |
| 4 · expansion vs selection | `expandJourneyConversations` **calls `selectJourney` first**, then dispatches `expand` | `App.tsx:3998`–`:4004` |
| 1 · visibility | `FocusedConversationSidebar` has `hiddenCount` and *Show N more*, which is the app's **truncation cap**, not a Navigator-controlled hide | `FocusedConversationSidebar.tsx:33`, `:96`–`:98` |

**A trap worth recording.** `PiInvocationAuthorityInspection` carries `threadId`, `generation`,
`piSessionId` and `mirrorConversationId`, which makes it tempting to conclude that native authority is
already per-workspace and only the bookkeeping is per-Journey. That conclusion is **wrong**. The
authority *inspection* carries workspace coordinates; the registry *index* is `journey_id`. Three
layers are structurally per-Journey, and one of them is Rust, with process lifetime, capacity
accounting and `retire_finalizing_journey` semantics attached to that key.

### Two different CRs are captured here

**A · Workspace legibility and navigation** — symptoms 1, 2 and 4. Renderer and persisted preferences
only. No change to the native registry, no change to authority, no new concurrency.

**B · Per-workspace concurrency** — symptom 3 alone. Requires re-keying the Rust `PiProcessRegistry`,
re-keying `JourneyRuntimeState`, revisiting `serial_capacity_rejected`, changing the occupancy filter,
and re-validating every invariant CR115, CR116 and CR132 pinned on *one run per Journey* — including
`hasActiveNativeExecution`, the post-terminal recovery guard and the abandon-settlement offer.

**The split serves the stated goal rather than deferring it.** The instability the Navigator reports —
losing access to work in flight, status that names the wrong owner, history competing with active work
— is **entirely in A**. None of it needs B. Doing them as one CR makes the daily-use fix wait behind an
authority change that risks regressing the lockout and strand work just stabilised.

### Symptom 2 does not need re-keying, and the acceptance already allows that

A conversation and its Journey workspace share one `journeyId`, so one runtime entry serves both and
cannot distinguish them by key. But the entry carries `identity.authority`, which holds
`mirrorConversationId`, `threadId` and `generation`. **The owner of the single active run is therefore
identifiable from the entry itself.** Comparing the selected workspace against that authority satisfies
this CR's own wording — *"aggregate Journey state, if shown, is explicitly aggregate rather than
impersonating the child"* — with no change to how runtime is keyed.

### Proposed slice sequence for A

**A1 · Expansion stops selecting** (symptom 4). Remove the `selectJourney` call from
`expandJourneyConversations`; make the catalog load take its owner Journey explicitly instead of
reading `selectedJourney`; let expansion be a set rather than one `focused_journey`. Acceptance:
expanding or collapsing never changes selected Journey, selected conversation, Composer target, loaded
transcript or run ownership; changing Journey does not collapse a group containing active work; reload
preserves expansion. *First, because it is the fix for the reported instability.*

**A2 · The status names its owner** (symptom 2). Give `deriveComposerTurnStatus` and
`deriveJourneyNavigationPresentation` the selected workspace, and derive the owner by comparing it with
`entry.identity.authority`. When the selected workspace is not the owner, show an explicit aggregate,
never `Working`. *Second, because legible ownership is what de-risks B.*

**A3 · Visibility becomes the Navigator's** (symptom 1). A reversible hide/reveal persisted in
preferences, distinct from the existing truncation cap, preserving `desktop_conversation` versus
`mirror_history` provenance in the reveal surface. *Independent; may go at any point.*

Each slice is independently releasable.

### Exclusions for A

No automatic deletion, archival, migration or pruning — A3 is a visibility preference and must not
drift into archival. No fabricated concurrency: A changes nothing about admission, so a shared
constraint must still refuse, only now naming itself precisely. B is not started before A is in the
field.

### Open decisions, all Workbench

1. **Split A from B**, or keep one CR with the sequence above.
2. **Position in the canonical index.** This CR has **no row** there, so it has no recorded order
   despite now being prioritised. RS021's open CRs sit at 4 (CR099), 5 (CR098) and 6 (CR100).
3. **Driver and Delivery** for the first slice.
4. Whether **CR099** overlaps A1/A2 enough to be folded or resequenced.
