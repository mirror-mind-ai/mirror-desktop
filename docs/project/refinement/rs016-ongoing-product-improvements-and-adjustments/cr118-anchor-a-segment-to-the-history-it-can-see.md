[< RS016](index.md)

# CR118: Anchor a Segment to the History It Can See

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Navigator sent a turn in Journey `mirror-desktop` on the Dev channel and saw:

> Conversation synchronization needs attention
> The agent is inactive, but Mirror Desktop could not complete the preserved persistence path.
> **Repair synchronization** · Details
> Conversation Segment turn range is invalid. 1 exact Mirror settlement operation also needs
> attention.
> No recovery action will run the agent again.

After the turn finished, a second notice of the same kind appeared with buttons, was visible for a
few seconds, and disappeared. The conversation then read normally.

## Evidence

Read-only inspection of the Dev data for Journey `mirror-desktop`, thread
`nautilus-thread-mirror-desktop`, generation 2, on 2026-10-03. Provenance is recorded because the
runs belong to that Journey; the behaviour is a Desktop one.

**Nothing is broken now.** All 43 turn-journal records are `settled` / `completed` with
`recoveryDisposition: complete` at revision 5, and `mirror-append-outbox.json` holds zero items. The
second notice disappearing was the recovery completing, which is the CR115/CR116 surface behaving as
designed. The settlement half of the message — "1 exact Mirror settlement operation also needs
attention" — is therefore already resolved and leaves nothing to repair.

**The notice belongs to run `agent-run-2026-10-03T19:24:27.786Z`**, the second CR117 homologation
round. It predates the build carrying CR117's guard repair, so it is not a symptom of that build.

**The Segment half is a real and still-live fragility.** `Conversation Segment turn range is
invalid.` is thrown by `partitionConversationBySegments`
(`src/domain/conversationSegmentProjection.ts:27`) when no segment's `firstTurnId` can be located in
the turn list of the conversation being partitioned. The two sides of that comparison come from
different places:

- `refresh_conversation_segments` (`src-tauri/src/main.rs:4453`) reads turns from the **durable
  projection file** at `conversation_projection_path`, and sets `firstTurnId` to the first turn whose
  Pi entries fall inside the segment's entry range (`main.rs:4400`).
- `partitionConversationBySegments` then validates that id against the **in-memory** conversation
  passed by `App.tsx:3407`, which under CR114 is deliberately bounded to recent history.

Measured on the live data: the session holds 113 entries; the current segment's anchor `74fa610e`
sits at position 1 and the tail at 112, so a refresh spans the whole session and resolves
`firstTurnId` to `turn-agent-run-2026-09-30T11:52:38.069Z` — the **oldest** durable turn, 8 of the 9
durable turns falling in range. The anchor is therefore pinned to the start of history while the
loaded working set is bounded to its end. The further history grows, the more reliably the anchor
falls outside the window the Desktop actually loaded.

**The existing tolerance cannot help here.** `firstAvailable` was written to skip *leading*
unresolvable segments, but this manifest has exactly one segment, so an unresolvable start makes
`firstAvailable` `-1` and the function throws instead of degrading.

**The stored manifest is also stale.** `generation-2.json` still carries `sourceEntryCount: 45` and
`turnCount: 0` with no `firstTurnId`, written on 2026-09-30, against a session that now has 113
entries and 9 durable turns. In that stored shape it cannot throw, because an absent `firstTurnId`
maps to `turns.length`; the throw only becomes reachable after a refresh fills the anchor in.

**Side observation, not the defect.** One of the nine durable turns has no Pi entry inside the
session's range at all. Worth establishing why before assuming the turn list and the session agree.

## Diagnosis

Two turn lists answer the same question and are allowed to disagree. The anchor is computed against
everything that was ever persisted and checked against what is currently loaded, so CR114's
intentional bounding of the working set is enough to invalidate it. No code owns the invariant that
these two lists must be comparable.

Not established: which turns the in-memory projection actually held at that moment. That is runtime
state and was not recorded, so the mechanism above is consistent with every observation but was not
reproduced on demand. The notice is transient and gone.

## Proposed Scope

- Decide the authority question explicitly: either the anchor is resolved against the same turn list
  that will be partitioned, or the partition tolerates an anchor it cannot see rather than throwing.
- Make a single-segment manifest degrade the way a multi-segment one already does, so an
  unresolvable anchor is skipped rather than fatal.
- Establish whether a stale manifest should be refreshed or rewritten when its
  `sourceEntryCount` no longer matches the session.
- Establish why one durable turn has no Pi entry in range.

## Acceptance

- A Journey whose loaded history is narrower than its persisted history opens, takes a turn and
  settles without a synchronization notice.
- A manifest with one segment whose anchor is outside the loaded window degrades instead of throwing.
- No Segment publication writes a projection narrower than the segment it claims to describe.
- The existing CR114 chapter behaviour and CR080 chapter evidence are unchanged.

## Exclusions

- No change to how the working set is bounded; CR114's default stands.
- No change to the recovery surface itself, which behaved correctly here.
- No rewriting of Pi session files.

## Dependencies

Shares the Segment surface with CR114 and the recovery surface with CR115 and CR116. Independent of
CR117 and CR097: the Segment projection code was not touched by either.
