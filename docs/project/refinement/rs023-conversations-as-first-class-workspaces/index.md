[< Refinement Workbench](../index.md)

# RS023: Conversations as First-Class Workspaces

**Status:** active

## Framing

Promoted from [CR109](../rs021-ux-pre-beta-evolution/cr109-make-conversations-first-class-workspaces.md), captured 2026-09-30 and prioritised by the Navigator on 2026-10-08 as *the last fragile point of the app and the part that cannot yet be considered stable*.

CR109 was captured sixteen days after Conversation Spaces shipped (`conversationSpaces.ts` and `FocusedConversationSidebar.tsx`, 2026-09-14). It is therefore not a pre-DS-004 complaint but the lived verdict on what CV-008.DS-004 delivered: the Desktop gained multiple conversations per Journey while keeping one Journey-level workspace, and the four symptoms below are the cost of that gap.

It was promoted rather than planned because its four symptoms are not one change. Three are renderer and preference work, independently releasable, with no authority change. The fourth is an authority change in Rust. Holding them in one CR would have forced three independently releasable changes onto one Delivery branch and made the daily-use fix wait behind a change that risks regressing the lockout and strand work stabilised by CR115, CR116 and CR132.

### One root, four faces

The app has a single notion of *where I am*, `selectedJourney`, and three unrelated concerns are all derived from it: runtime ownership, native admission, and sidebar structure.

| Symptom | Verified fact | Coordinate | CR |
|---|---|---|---|
| Sidebar navigation changes selection when it should change only expansion | `expandJourneyConversations` **calls `selectJourney` first**, then dispatches `expand` | `App.tsx:3998`–`:4004` | CR133 |
| Runtime status belongs to the wrong level | `JourneyRuntimeState.entries` is `Record<journeyId, Entry>`; one entry serves a Journey workspace and its conversations alike | `journeyRuntimeState.ts:50` | CR134 |
| Conversation list has no workable visibility control | `FocusedConversationSidebar` has `hiddenCount` and *Show N more*, which is the app's **truncation cap**, not a Navigator-controlled hide | `FocusedConversationSidebar.tsx:33`, `:96`–`:98` | CR135 |
| Parent work is blocked by child work | `register` **quarantines** a second run for the same Journey as `serial_capacity_rejected`; the TS filter refuses on `entry.authority.journeyId === journeyId`; and **the Rust registry's `entries` map is keyed by `journey_id`** inside `reserve` | `journeyRuntimeState.ts:104`–`:107`, `piInvocationOccupancy.ts:289`–`:291`, `pi_process_registry.rs:263`–`:292` | CR136 |

**A trap recorded so it is not re-entered.** `PiInvocationAuthorityInspection` carries `threadId`, `generation`, `piSessionId` and `mirrorConversationId`, which invites the conclusion that native authority is already per-workspace and only the bookkeeping is per-Journey. That conclusion is wrong. The authority *inspection* carries workspace coordinates; the registry *index* is `journey_id`. Three layers are structurally per-Journey, and one of them is Rust, with process lifetime, capacity accounting and `retire_finalizing_journey` semantics attached to that key.

**A finding that makes CR134 far cheaper than it looks.** A conversation and its Journey workspace share one `journeyId`, so one runtime entry cannot distinguish them by key. But the entry carries `identity.authority`, holding `mirrorConversationId`, `threadId` and `generation`, so the owner of the single active run is already identifiable. CR109's acceptance was written to permit exactly that answer — an explicit aggregate rather than a child impersonation — with no re-keying at all.

## Desired Outcome

A Journey is a durable container and a conversation is a first-class workspace within it. The Navigator can keep active work visible, distinguish its exact owner, work in an independent parent workspace while a child conversation runs when native authority permits it, and expand/collapse sidebar structure without changing selection or losing access to ongoing work.

## Authority Contract

- Journey authority is exactly `mirror-desktop`.
- Pi JSONL remains the sole transcript and native-entry authority. No CR here changes transcript authority or Mirror provenance.
- A hide is a presentation preference. It never deletes, retires, archives, migrates, prunes, merges or mutates a conversation, its transcript, its thread, its run evidence or its Mirror record.
- Expansion and visibility are renderer state persisted alongside the existing sidebar preferences. They never participate in run admission and never create or release occupancy.
- Runtime ownership stays keyed by Journey for CR133, CR134 and CR135. Only CR136 may change that key, and it must change the Rust registry and the TypeScript reducer together or neither.
- No fabricated concurrency. Distinct visual workspaces may run together only where native process capacity and exact Journey/thread/generation authority admit them; a genuine shared constraint must still refuse, naming itself precisely.
- A refusal may become narrower but never silent. CR132 left a named gap — a refusal the surface does not explain — and nothing here may widen it.
- No Mirror Core change.

## Work Shape

Ordered slices. CR135 is independent and may be taken at any point; CR136 is gated.

1. **CR133** separates expansion from selection, which is the fix for the reported instability: the Navigator stops losing access to work in flight.
2. **CR134** derives the owner of the active run from `identity.authority` and makes every status surface name the workspace that owns it, or an explicit aggregate. Legible ownership is what de-risks CR136.
3. **CR135** gives the Navigator a reversible hide and reveal, distinct from the existing truncation cap, preserving provenance.
4. **CR136** admits concurrent work inside one Journey. **Gate: not started before CR133, CR134 and CR135 are in the field.** It carries its own First Investigation, and if that investigation shows it to be Story-sized it is promoted in turn — the mechanism that produced this Story.

## Acceptance Horizon

RS023 is complete only when:

- expanding or collapsing a Journey's conversations never changes selected Journey, selected conversation, Composer target, loaded transcript or run ownership, and changing Journey never collapses a group containing active work;
- no status surface reads `Working` for a workspace that does not own the work, and any aggregate is explicitly aggregate;
- a conversation can be hidden and revealed reversibly, with `desktop_conversation` and `mirror_history` provenance preserved in the reveal surface, and no durable record altered;
- reload preserves expansion and visibility choices without fabricating a run owner or losing access to an active native process;
- either concurrent work inside one Journey is admitted where native authority permits, or CR136 records why it must not be, with the refusal named on the surface.

## Boundaries

- No automatic deletion, archival, migration or pruning of conversations. CR135 is a visibility preference and must not drift into archival.
- No change to Pi or Mirror transcript authority.
- This Story does not turn a disclosure click into selection, a hide into a delete, or a parent aggregate into a child runtime claim.
- Push, merge, publication, release and installation remain separate Navigator decisions.

## Change Requests

- [CR133: Stop a Disclosure From Selecting a Journey](cr133-stop-a-disclosure-from-selecting-a-journey.md)
- [CR134: Name the Workspace That Owns the Work](cr134-name-the-workspace-that-owns-the-work.md)
- [CR135: Let the Navigator Hide a Conversation Without Deleting It](cr135-let-the-navigator-hide-a-conversation-without-deleting-it.md)
- [CR136: Admit Concurrent Work Inside One Journey](cr136-admit-concurrent-work-inside-one-journey.md)
