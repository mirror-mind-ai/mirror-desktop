[< RS021](index.md)

# CR114: Make the Current Segment the Default Working Set

**Status:** captured
**Driver:** —
**Delivery:** —

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
- No selection, Driver assignment, Delivery branch, implementation, commit, push or release.

## Dependencies

Independent of CR113 in delivery; both descend from the same diagnosis. It implements part of
[CV-008.DS-004](../../roadmap/cv-008-conversation-spaces/ds-004-multiple-conversations-per-journey/index.md),
whose working-set contract it should not contradict, and it must preserve the CR046 authority
boundary that Segments are presentation pagination only.
