[< RS021](index.md)

# CR114: Make the Current Segment the Default Working Set

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr114-current-segment-working-set`

Pulled on 2026-10-02 by explicit Navigator intent, after `v0.2.0-alpha.30` was published. The
Navigator asked for a plan; the plan below was recorded from a read-only diagnosis of `main` at
`e4d5810` and of the production `mirror-desktop` generation. Driver and Delivery were accepted on
2026-10-02 as proposed. Implementation still requires an explicit Navigator instruction; this
record does not start it.

## Problem

A Journey's loaded Conversation grows without bound even though Pi compaction already closes
chapters and the Desktop already derives Segments from Pi's own cut points. Opening a large Journey
therefore reconstructs and mounts the complete generation every time, and every Segment projection
on disk carries a near-complete copy of the generation's evidence maps.

This is the second remedy separated from the CR113 diagnosis. CR113 is bounded to Composer
keystroke cost; this Change Request is about the size of the working set itself.

## Evidence

Static measurement on 2026-10-02 against the production `mirror-desktop` generation, read without
modification.

The loaded generation projection:

```text
messages                              1,828  (1,527 assistant, 301 user)
chapter dividers                         23
reconciliation turns                      6
projection bytes                  6,359,094
  reconstructedAgentActions       4,820,509   (1,120 messages, 2,685 operations)
    operation arguments           2,618,451
    reasoning summaries           1,483,211
  messages                        1,274,192
  terminalAgentActionEvidence       348,373
  responseModels                    108,304
Pi session JSONL for this generation   52.8 MB
```

The Segment projections for the same generation:

```text
segment files                            24
sum of messages across all files        369
total bytes                          74.3 MB
segment-24 (current): 6 messages, 5,068,296 bytes
  of which reconstructedAgentActions  4,771,054
  of which messages                      12,641
```

Two defects are visible in that shape.

**Segment projections are not scoped to their Segment.**
`partitionConversationBySegments` narrows `messages`, `reconciliation.turns`,
`terminalAgentActionEvidence` and `steeringEvidence`, but spreads the source conversation, so
`reconstructedAgentActions`, `responseModels`, `agentCommentRoles` and `chapterDividers` are copied
into every Segment at generation scope. The current Segment holds 6 messages in 5.07 MB.

**The historical-Segment window never engages.** CV-008.DS-004 specifies loading the current
Segment first and historical Segments on demand, and the `Load N earlier Segments` control is still
mounted. CR080 recorded that all three `setHistoricalSegmentCount` call sites pass `0`, and that is
still true, so the complete history is always the working set and the control can never appear.

## Diagnosis (2026-10-02)

Read-only inspection of `main` at `e4d5810` and of the production `mirror-desktop` root
generation (`generation-4`), which has grown since the capture above.

**The working set is decided by the Pi inspection, not by any projection.** Since CR046 the
transcript body comes from `inspect_dedicated_pi_transcript`, which reads the whole session JSONL
(52.8 MB here), walks the complete active branch and returns every entry with its `nativeContent`.
`projectPiBackedConversationSurface` then rebuilds every message, action, attribution and divider
from those entries. That full reconstruction runs at four points in `App.tsx`: Journey open
(`restoreConversation`), live-send preflight, manual compaction and the `Load earlier Segments`
action. Loading only the current Segment projection would therefore change nothing: the bound has
to exist in the inspection itself.

**The `Load N earlier Segments` action is a no-op by construction.** `loadCompleteSegmentHistory`
reinspects Pi completely, which is exactly what opening already did. Nothing is loaded that was not
already on screen, which is consistent with CR080's observation that the control never had anything
to load. Its count is still never populated: all three `setHistoricalSegmentCount` call sites pass
`0`.

**Derived maps are persisted although the type declares them derived.**
`createPersistedJourneyConversation` spreads the whole `JourneyConversation`, so
`reconstructedAgentActions`, `responseModels`, `chapterDividers`, `agentCommentRoles` and
`interruptedFragments` reach disk in the active projection and in every Segment file. The active
projection today:

```text
dedicated-journey-conversations/mirror-desktop/generation-4.json   6,500,952 bytes
  messages                                   1,893
  reconciliation.turns                           2
  reconstructedAgentActions   1,173 entries  ≈ 5,152,189 bytes
  responseModels              1,584 entries  ≈   112,387 bytes
  agentCommentRoles           1,284 entries  ≈    30,816 bytes
  chapterDividers                25 entries  ≈     5,060 bytes
  terminalAgentActionEvidence     1 entry    ≈   122,080 bytes
```

The Segment files for the same generation now number 26. Because `partitionConversationBySegments`
narrows only `messages`, `reconciliation.turns`, `terminalAgentActionEvidence` and
`steeringEvidence` and spreads everything else, each file carries the generation-wide maps:

```text
segment-1.json    368,551 bytes   10 messages      4 reconstructed actions
segment-12.json  3,565,817 bytes   29 messages    653 reconstructed actions   917 response models
segment-24.json  5,863,168 bytes   16 messages  1,148 reconstructed actions 1,565 response models
```

**Segment publication rewrites the active projection, and the turn ledger has shrunk.** When every
Segment is present, `publish_conversation_segment_projections` writes the current Segment payload
over the active projection path. The active projection now holds 1,893 messages but only 2
reconciliation turns, and the Segment receipt reports `totalMessageCount: 223` against the 1,893
messages Pi reconstructs. CR046 requires counts to be independent of Segments, yet the catalog
`messageCount` is set from that publication return value. This is characterised here as an
observation; whether the turn ledger loss is caused by that overwrite is the first thing slice 0
must establish, because the partition keys every Segment by `firstTurnId`, and turns the ledger
no longer carries cannot be attributed to any Segment.

**Pi already names the boundary.** Each compaction records `firstKeptEntryId`, the first entry Pi
kept in its own context. The current Segment's `sourceFromEntryId` is exactly that entry. A Desktop
working set that begins there is the same working set Pi is reasoning over, which is the honest
default: the Navigator sees what the agent sees, and everything earlier is history on request.

## Design

Bound the working set at its source, the native inspection, and keep every other authority where it
is.

- **Rust: a scoped inspection.** `inspect_dedicated_pi_transcript` gains an optional scope,
  `complete` (today's behaviour, default for callers that need it) or `current_segment`. The scoped
  form still walks the whole active branch for structural facts: leaf entry, compaction count,
  `leafIsCompaction`, chapter closures, incomplete user entry, unknown envelopes and the complete
  turn list. Only `entries` is windowed, from the last compaction's `firstKeptEntryId` to the leaf.
  The response names what it omitted: `window: { fromEntryId, omittedEntryCount,
  omittedChapterCount }`. With no compaction on the branch the two scopes are identical.
- **Frontend: the window is state, and every reprojection honours it.** `App` keeps a
  `loadedHistoryScope` of `current_segment` or `complete`, reset on Journey, Conversation and
  generation change. Journey open uses `current_segment`. `historicalSegmentCount` is populated from
  the inspection's `omittedChapterCount`, which makes the existing `Load N earlier Segments`
  control reachable without a manifest read. Loading earlier history switches the scope to
  `complete` and reinspects; that is the existing `loadCompleteSegmentHistory` path, now meaning
  what it says. Send preflight and manual compaction reproject with the current scope, so a
  reprojection never silently expands or contracts the transcript.
- **Surface reconstruction stays correct on a partial window.** The divider for the current
  chapter opens at the first retained entry, which is inside the window. Earlier dividers are
  absent until loaded. `chapterOpeningMessageIds` therefore yields fewer openings than the manifest
  has Segments, and `projectConversationChapters` already withholds jumps when the counts disagree.
  The chapter index must instead offer `Load earlier chapters` for chapters with no loaded opening,
  then jump once loaded. Response-model attribution and interrupted-run evidence are derived per
  entry and need no change; a test must prove the windowed projection equals the matching suffix of
  the complete projection, message ids included.
- **Projections persist what they own.** `createPersistedJourneyConversation` stops writing the
  derived maps the type already documents as derived. `partitionConversationBySegments` additionally
  scopes any remaining per-message map to its Segment, so a Segment file describes its Segment
  alone. The parser already tolerates absent maps, so existing files remain readable.
- **Existing Segment files are compatible legacy.** Closed Segments are immutable by design
  (CR080 records that republishing them is rejected on byte divergence), and deleting a Segment
  projection is safe (CR046). No migration rewrites them. New and republished files are small; old
  closed files stay large until a Navigator deletes them, which this CR does not do.
- **Counts, admission, settlement and delivery read durable metadata, not the window.**
  `loadActiveSettlementEvidence`, `convergeDelivery` and the catalog reconcile already read
  `loadDedicatedJourneyConversation`; slice 0 verifies that none of them observes the surface, and a
  test pins it.

Rejected alternative: load the current Segment projection file as the transcript. CR046 forbids
Segment-local messages as transcript authority, the files carry stale derived maps, and Pi JSONL
remains the only authority for what was said.

## Plan

0. **Characterise before changing.** Pin the current shape with tests: persisted derived maps,
   generation-wide maps in Segment files, `Load earlier` reinspecting completely. Establish from
   code and production files whether the active-projection overwrite in
   `publish_conversation_segment_projections` is what reduced the turn ledger to 2 turns, and record
   the finding in this document. If it is, the overwrite is corrected in slice 3 and the ledger
   recovery, if any, is a separate decision.
1. **Persist only owned state.** Strip derived maps in `createPersistedJourneyConversation`; scope
   `partitionConversationBySegments` fully; keep the parser tolerant. Tests: round-trip equality
   after reprojection, a Segment file's size tracking its message count.
2. **Scoped native inspection.** Add the scope parameter and `window` facts to
   `inspect_dedicated_pi_transcript`, with Rust tests on a branch with zero, one and many
   compactions, including a compaction as leaf (CR104) and an interrupted tail (CR089).
3. **Default to the current Segment.** Journey open inspects with `current_segment`; populate
   `historicalSegmentCount` from the inspection; make `loadCompleteSegmentHistory` the explicit
   `complete` route; carry the scope through send preflight and manual compaction. Stop the
   active-projection overwrite if slice 0 shows it to be harmful. Tests: open loads the window,
   earlier history loads on request only, windowed plus earlier equals complete.
4. **Truthful surfaces.** `ConversationDetailHeader` already distinguishes current from earlier;
   verify its wording with a populated count. Chapter index: unloaded chapters offer loading rather
   than a dead row. Search: state that earlier chapters are not loaded while scope is
   `current_segment`. Context Map: loaded versus existing counts where it reports history.
5. **Independence of authority.** Tests that admission, settlement, catalog counts and Mirror
   delivery read the same durable metadata regardless of scope.
6. **Validate on the real Journey.** Rebuild Eval; open `mirror-desktop`; record open latency with
   and without the window; navigate chapters; load earlier history; restart during and after a
   turn; run one turn and one manual compaction; confirm settlement and delivery are unaffected.

## Files

- `src-tauri/src/main.rs`: `inspect_dedicated_pi_transcript`, `inspect_complete_pi_transcript`,
  `DedicatedPiTranscriptInspection`, `publish_conversation_segment_projections`.
- `src/app/journeyThreadStorage.ts`: scoped inspection binding.
- `src/domain/piBackedConversationSurface.ts`: inspection type with `window`.
- `src/domain/persistedJourneyConversation.ts`: persist owned state only.
- `src/domain/conversationSegmentProjection.ts`: Segment-scoped maps.
- `src/domain/compactionChapters.ts`: chapters without a loaded opening.
- `src/app/App.tsx`: `loadedHistoryScope`, `restoreConversation`, send preflight, manual
  compaction, `loadCompleteSegmentHistory`, historical-Segment control.
- `src/app/ChapterIndexPanel.tsx`, `src/app/ConversationDetailHeader.tsx`,
  `src/app/JourneySearchControl.tsx`: truthful loaded-versus-existing wording.
- Tests: `conversationSegmentProjection`, `conversationSegmentStorage`, `compactionChapters`,
  `piBackedConversationSurface`, a new `currentSegmentWorkingSet` source/integration test, and Rust
  tests beside the inspection.

## Validation

- Automated: new tests above, complete front-end suite, `tsc`, production build, `cargo test`,
  `cargo check --locked`, `roadmap:check`, `git diff --check`.
- Eval homologation on `mirror-desktop` by the Navigator: faster open, truthful counts, chapter
  navigation, earlier history identical to the complete load, unchanged turn and compaction
  behaviour, unchanged settlement and Mirror delivery.
- No instrumented percentile is claimed unless measured; open latency is recorded as a simple
  before-and-after reading in this document.

## Settled Decisions

All resolved on 2026-10-02 by explicit Navigator decision; none remain open.

- **Earlier history loads all at once.** One explicit request loads the complete generation, which
  is what the existing control's wording already promises. Incremental per-chapter loading is not
  built here and becomes a separate Change Request only if the complete load proves slow in use.
- **Legacy Segment files stay as compatible legacy.** No `Rebuild Segments` repair and no
  migration. Closed Segment projections are immutable by design and only occupy disk; reclaiming
  that space is not the problem this Change Request exists to solve.
- **Driver and Delivery.** `@alissonvale` and `refinement/rs021-cr114-current-segment-working-set`.
- Implementation was authorised on 2026-10-02 by explicit Navigator instruction.

## Implementation Evidence

Implemented on 2026-10-02 on `refinement/rs021-cr114-current-segment-working-set`, from `e4d5810`.

### Slice 0 — the turn-ledger finding, confirmed

The plan required establishing whether the active-projection overwrite in
`publish_conversation_segment_projections` caused the truncated turn ledger. It did, and the
mechanism is worse than the symptom suggested.

When every Segment is present, the command wrote the current Segment's payload over
`conversation_projection_path`. That payload comes from `partitionConversationBySegments`, whose
`reconciliation.turns` contains only the current Segment's turns. The active projection is durable
Desktop metadata and the only place the turn ledger lives, so each publication truncated it, after
which it regrew with new turns until the next publication truncated it again. A reading taken
during implementation shows exactly that shape:

```text
active projection    1,899 messages, 4 turns — all four from the same hour
segment-26 (current)     2 messages, 1 turn
messages reach back to 2026-09-20; the ledger reaches back 50 minutes
```

Messages recover because Pi reconstructs them; turns do not, because nothing else records them.

The compounding part: `refresh_conversation_segments` reads the manifest's turn attribution from
that same file. With a truncated ledger it cannot attribute older Segments, so it assigns them
whatever turn it can still see — in production, `segment-24` and `segment-25` both name
`turn-agent-run-2026-10-02T20:07:12.311Z` as their first turn. The overwrite fed the manifest that
derives from it.

Since CR046 the active projection is not the transcript authority, so the overwrite bought nothing
it was introduced for. It was removed. Segments are presentation pagination; durable Conversation
metadata is not theirs to rewrite.

### What changed

**Storage keeps only what it owns.** `createPersistedJourneyConversation` and
`parsePersistedJourneyConversation` drop `reconstructedAgentActions`, `responseModels`,
`chapterDividers`, `agentCommentRoles` and `interruptedFragments` — the maps `JourneyConversation`
already documented as derived from Pi, which were reaching disk only because the whole Conversation
was spread into the payload. Dropping them on read as well means a file written by an earlier
version stops reintroducing them. `partitionConversationBySegments` additionally scopes every
per-message map to its own Segment's messages, so a Segment file describes its Segment even when
the caller hands over a fully projected surface.

**The native inspection takes a scope.** `inspect_dedicated_pi_transcript` accepts `complete` (the
default, unchanged for every existing caller) or `current_segment`. The scoped reading still walks
the whole branch for structural facts — leaf, entry count, compaction count, `leafIsCompaction`,
chapter closures, unknown envelopes and the complete turn list all still say what exists — and
windows only `entries`, from the last compaction's `firstKeptEntryId` to the leaf. A new `window`
block reports `scope`, `fromEntryId`, `omittedEntryCount` and `omittedChapterCount`, so a caller
can state what is loaded instead of inferring it.

`incompleteUserEntryId` is withheld when the window omits that entry.
`deriveInactiveNativeAttemptCandidate` throws on an id it cannot find among the entries, so
reporting one the window did not return would hand it exactly that.

**The Journey opens on its current chapter.** `App` keeps `loadedHistoryScopeRef`, reset to
`current_segment` on every Journey, Conversation and generation change. Journey open, send preflight
and manual compaction all reproject at that extent, so a reprojection never silently grows or
shrinks the transcript. `historicalSegmentCount` is populated from `window.omittedChapterCount`,
which makes the existing `Load N earlier Segments` control reachable for the first time;
`loadCompleteSegmentHistory` is now the only reading that asks for the whole branch, and it widens
the visit's scope so later reprojections keep the wider extent.

**A bounded surface cannot delete durable history.** This was the constraint the plan did not
anticipate. Several write paths hand whatever is on screen to storage, which was safe only while
the surface was always complete. Writing a window verbatim would have deleted the stored record of
every earlier message, including the attachment provenance no Pi session can rebuild. One seam in
`journeyConversationStorage` now composes the stored projection:
`preserveDurableConversationHistory` keeps the messages before the window and lets the window
replace the ones it loaded, so a removal inside the window is still honoured — which is how CR089
drops an interrupted answer that produced neither words nor work. On a complete load the window
starts where the history starts and the behaviour is the overwrite it has always been.

**Chapter-evidence refresh reads Pi's own count.** `closedChapterCount` came from counting drawn
dividers. A bounded surface draws one, so every visit would have looked like a stale manifest and
rewritten it — from the truncated ledger described above. It now comes from the inspection's
`compactionCount`.

**Surfaces say which of the two they are counting.** Chapters with no loaded opening offer to load
earlier history instead of reading as dead rows, and say so while loading. The search panel, which
already claimed to search loaded content, now states how many earlier Segments are outside the
search and offers the same load. `ConversationDetailHeader` already distinguished the current
Segment from earlier ones and is now exercised with a populated count.

### Tests

New behaviour is pinned by `durableConversationHistory`, `currentSegmentWorkingSet`,
`loadedHistoryTruthfulness`, `workingSetAuthorityIndependence`, additions to
`persistedJourneyConversation`, `conversationSegmentProjection`, `piBackedConversationSurface` and
`chapterIndexPanel`, and five Rust tests beside the scoped inspection. The equivalence test matters
most: a windowed projection equals the matching suffix of the complete projection, message ids,
content, attribution and dividers included, in both Rust and TypeScript.

`workingSetAuthorityIndependence` characterises the CR046 boundary that this change makes real for
the first time: settlement, delivery recovery, catalog counts and terminal-evidence verification
all read durable metadata or the complete branch, never the loaded window.

### Gates

- 219 front-end test files, 1,528 tests.
- `npx tsc --noEmit`.
- `npm run build`.
- `cargo test`: 241 passed, 3 ignored.
- `cargo check --locked`: no warnings.
- `npm run roadmap:check`, `git diff --check`.

One existing expectation changed: `journeyThreadStorage.test.ts` pinned the exact inspection
arguments and now also expects `scope: "complete"`.

### Expected Effect on the Real Journey

Read-only measurement of the production `mirror-desktop` active branch on 2026-10-02, computing the
same window the scoped inspection computes:

```text
Pi session JSONL                        55,775,012 bytes
active branch entries                        7,742
projectable entries                          7,373
compactions on the branch                       25
window begins at                          79af9f30   (last compaction's firstKeptEntryId)
projectable entries inside the window          286   of 7,373
chapters offered as earlier history             24
approximate projected payload               1.30 MB   against 51.53 MB complete
```

So an open crosses the boundary with roughly 1/40th of the entries it used to, and the `Load 24
earlier Segments` control becomes reachable with a truthful count. This is an arithmetic
projection of the window, not a latency measurement.

### Homologation (2026-10-02)

A copy of the durable projections, Segment files, Journey threads and turn journals was taken
before homologation, at
`~/Library/Application Support/ai.mirrormind.desktop.cr114-backup-2026-10-02`, because this change
alters what is written to shared app data. Eval was built and installed at
`~/Applications/Mirror Desktop Eval.app`.

The Navigator accepted the rebuilt Eval. No instrumented Journey-open latency percentile was
claimed; the acceptance is the Navigator's own reading of the Journey opening on its current
chapter with earlier history reachable, against the arithmetic projection recorded above.

The acceptance carried one observation: the product said Segment in some places and chapter in
others. It was the right thing to notice at exactly that moment — the historical-history control
had never been reachable before this Change Request, so its copy had never been read by anyone.
The fix is recorded below.

### Vocabulary: one word for the reader

The two words were not redundant by accident, but the distinction had no business being visible.
CV-008.DS-004 defines Segment as "an internal history/loading boundary" and calls its checkpoints
technical; CR080 introduced chapter as what the product calls the same cut once a reader meets it.
They are one to one, so any surface naming both was naming one thing twice.

Visible copy is now chapter throughout: the historical-history control and its loading and error
states, the empty-Conversation surface, the Conversation detail header, the search scope note and
the delete confirmation. Segment remains the internal name, unchanged, where it is the one the
system actually uses — the manifest schema, the `segment-N.json` projections, the
`current_segment` scope value, the Rust commands and the domain types. Renaming those would be a
storage and contract migration that buys the reader nothing.

`loadedHistoryTruthfulness` grows a guard over the five components that carry visible copy: string
and template literals may not contain Segment unless they are internal coordinates. The guard was
checked against the four strings this change removed and catches all of them, so it is not an empty
assertion.

### Gates after the vocabulary change

- 219 front-end test files, 1,534 tests.
- `npx tsc --noEmit`, `npm run build`.
- `cargo test`: 241 passed, 3 ignored. `cargo check --locked`: no warnings.
- `npm run roadmap:check`, `git diff --check`.

Two existing expectations moved to the new register: `conversationSpaceSurfaces` and the detail
header cases in `loadedHistoryTruthfulness`.

## Expected Behavior

Opening a large Journey presents the current chapter quickly, and earlier chapters are retrievable
on explicit request without reloading or reconstructing the whole generation. A Segment projection
on disk describes its own Segment rather than the whole generation.

Complete durable history remains intact and reachable. No message, evidence record or chapter is
deleted, truncated or hidden from retrieval.

## Proposed Scope

- Scope every evidence map a Segment projection carries to the messages of that Segment, so the
  files stop duplicating generation-wide data. Decide explicitly what a Segment owns.
- Decide whether existing Segment files are rewritten on next publication or treated as a
  compatible legacy shape, since CR046 established that deleting a Segment projection must be safe.
- Make the current Segment the default loaded working set and populate the historical-Segment count
  from the manifest so the existing retrieval control becomes reachable, or replace that control
  deliberately if the chapter index is the better route.
- Keep reconstruction from the Pi session JSONL correct when only part of the generation is loaded,
  including chapter dividers, response-model attribution and interrupted-run evidence at Segment
  boundaries.
- Validate Journey-open latency, chapter navigation, search scope wording, restart recovery and
  settlement against a Journey whose generation spans many chapters.

## Acceptance

- A Segment projection contains only evidence attributable to its own Segment, and a Segment's file
  size tracks its message count rather than the generation's.
- Opening a Journey loads the current Segment first; earlier Segments load only on explicit
  request, and the count offered matches the manifest.
- Every earlier chapter remains retrievable, and retrieved content is identical to what the
  complete load produced.
- Search, chapter navigation and the Context Map keep stating truthfully what is loaded versus what
  exists.
- Turn admission, counts, completion, settlement and Mirror delivery remain independent of what is
  loaded, as CR046 requires.
- Pi JSONL, Mirror records, Journey/thread/generation identity and run authority are unchanged.

## Exclusions

- No deletion or truncation of durable history, evidence or Pi transcript content.
- No change to Pi's compaction behavior or to who owns the active context.
- No general virtualization framework, transcript search backend or persistence migration beyond
  what a scoped Segment projection requires.
- No change to Composer keystroke behavior, which belongs to CR113.
- No implementation, commit, push or release is authorised by this plan; Driver and Delivery
  remain explicit decisions before `in_progress`.

## Dependencies

Independent of CR113 in delivery; both descend from the same diagnosis. It implements part of
[CV-008.DS-004](../../roadmap/cv-008-conversation-spaces/ds-004-multiple-conversations-per-journey/index.md),
whose working-set contract it should not contradict, and it must preserve the CR046 authority
boundary that Segments are presentation pagination only.
