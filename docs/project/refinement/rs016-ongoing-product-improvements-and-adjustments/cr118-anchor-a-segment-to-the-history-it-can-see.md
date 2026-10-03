[< RS016](index.md)

# CR118: Anchor a Segment to the History It Can See

**Status:** planned
**Driver:** —
**Delivery:** —

## Problem

The Navigator sent a turn in Journey `mirror-desktop` on the **production** bundle at
`v0.2.0-alpha.30` and saw:

> Conversation synchronization needs attention
> The agent is inactive, but Mirror Desktop could not complete the preserved persistence path.
> **Repair synchronization** · Details
> Conversation Segment turn range is invalid. 1 exact Mirror settlement operation also needs
> attention.
> No recovery action will run the agent again.

After the turn finished, a second notice of the same kind appeared with buttons, was visible for a
few seconds, and disappeared. The conversation then read normally.

## Provenance Correction

This CR was first captured against the **Dev** store, because the first reading treated the report
as a possible regression from the CR117 work then in flight. That was the wrong store and the wrong
frame, and the first evidence section and its proposed mechanism were both wrong as a result. The
Navigator corrected it: the incident is on production `alpha.30`, and CR117 had not been validated
in Dev at the time of the report.

The correction matters beyond bookkeeping. `alpha.30` predates CR114, so the discarded mechanism —
an anchor pinned to the start of history while CR114 bounds the loaded window to its end — cannot
apply. The real mechanism runs in the opposite direction, and is established below.

## Evidence

Read-only inspection of the production store `ai.mirrormind.desktop` on 2026-10-03. The production
application was not launched, closed or otherwise touched; it was not running during the inspection.
Provenance is recorded because the runs belong to Journey `mirror-desktop`; the behaviour is a
Desktop one.

**Installed production build.** `/Applications/Mirror Desktop.app`, `0.2.0-alpha.30`, bundle
`ai.mirrormind.desktop`. `alpha.30` delivered CR113 and CR115. CR114 shipped in `alpha.31`, CR116 in
`alpha.32`, and CR117 has never been released.

**The manifest.** `conversation-segments/mirror-desktop/nautilus-thread-mirror-desktop/generation-4.json`
holds 29 segments over `sourceEntryCount: 8356`. Segments 1 to 26 carry no `firstTurnId` and
`turnCount: 0`. The last three do carry anchors:

| segment | status | turnCount | firstTurnId | lastTurnId |
|---|---|---|---|---|
| segment-27 | closed | 1 | `turn-agent-run-2026-10-03T00:46:07.343Z` | same |
| segment-28 | closed | 9 | `turn-agent-run-2026-10-03T00:46:07.343Z` | `…T17:18:23.831Z` |
| segment-29 | current | 2 | `turn-agent-run-2026-10-03T15:27:35.373Z` | `…T17:18:23.831Z` |

**The durable ledger.** `dedicated-journey-conversations/mirror-desktop/generation-4.json` is 7.7 MB
and holds **13 turns** and 2,178 messages. Its oldest turn is `turn-agent-run-2026-10-03T15:27:35.373Z`.
`turn-agent-run-2026-10-03T00:46:07.343Z` — the anchor of segments 27 and 28 — **is not in it.**

**Demonstrated, not inferred.** The guard from `partitionConversationBySegments`
(`src/domain/conversationSegmentProjection.ts:21-27`) was run verbatim against those two real files:

```
turns in durable ledger : 13
segments in manifest    : 29
starts                  : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1,0]
firstAvailable          : 0
condition firstAvailable < 0 : false
condition any start < 0      : true
condition non-monotonic      : true
=> THROWS 'Conversation Segment turn range is invalid.' : true
   unresolvable: segment-27 firstTurnId=turn-agent-run-2026-10-03T00:46:07.343Z
   unresolvable: segment-28 firstTurnId=turn-agent-run-2026-10-03T00:46:07.343Z
```

Two of the three throw conditions fire. This is **deterministic**: with the manifest and ledger as
they sit on disk, every partition of this Journey throws. It is not an intermittent or timing
effect.

**The settlement half — resolved at planning.** `mirror-append-outbox.json` holds zero items, so no
durable Mirror append debt remains. The "1 exact Mirror settlement operation also needs attention"
count was **the same throw counted twice**: the settlement `catch` (`src/app/App.tsx:3276-3278`)
calls both `setExactSettlementError` and `recordSyncFailureOrDeferral` with the one error, and
`projectSettlementNotices` (`src/app/settlementDiagnostics.ts:44-48`) then renders the sync failure
as the Journey notice and the exact error as an "also needs attention" count. One fault, reported as
two. Not an independent failure.

**An unsettled run.** The newest turn-journal record, created `2026-10-03T21:40:01.669Z`, is still
`phase: running` at revision 2 with `recoveryDisposition: resume_execution`, while the application
is closed. One run is therefore mid-flight on disk and awaiting recovery on next open. The 63
records before it are all `settled` / `completed`.

## Diagnosis

**The ledger lost history the manifest still points at.**

`alpha.30` carries the defect `alpha.31` fixed, described in that release note: closed Segment
publication overwrote the active durable projection with the current Segment's payload, and the
active projection is the only durable turn ledger, so the overwrite kept shrinking it. The ledger is
now 13 turns long for a Journey with 29 segments and 64 journal records.

The stored manifest, by contrast, still holds anchors from refreshes taken while the ledger was
longer — segments 27 and 28 were written when `turn-…00:46:07.343Z` was present. Nothing rewrote
them when it disappeared, so the manifest references turns the ledger no longer has.

**Why it recurs on an ordinary turn.** `App.tsx:3403-3407` refreshes the manifest only when a
compaction has just settled, and otherwise calls `loadConversationSegments`, which reads the stored
file. So the ordinary post-turn settlement path partitions against the stale manifest every time.

**Why it does not heal itself.** A refresh would clear it: `project_conversation_segment_manifest`
starts from `let mut segments = Vec::new()` (`src-tauri/src/main.rs:4330`) and rebuilds segments from
the session's compaction entries, writing `firstTurnId` only when turns actually match
(`main.rs:4399-4403`). Segments 27 and 28 would simply get no anchor and map to `0`. But nothing in
the ordinary path triggers that refresh, and neither does the notice's own control: **Repair
synchronization** calls `recoverPostTerminalPersistence`, which does not refresh the manifest. The
one other refresh, at `App.tsx:2427`, is gated on missing chapter evidence and on a once-per-key
ref, so it is not a general repair either.

**Consequence for the upgrade.** Moving production past `alpha.31` stops the truncation that caused
this, but does not repair a manifest and ledger that have already diverged. This Journey would be
expected to keep throwing until a compaction settles and forces a rebuild.

**Not caused by the current work.** `alpha.30` contains neither CR114, CR116 nor CR117, and the
Segment projection code was not touched by CR117 or CR097.

**Also worth noting.** The existing `firstAvailable` tolerance was written to skip *leading*
unresolvable segments. It cannot help when the unresolvable ones sit in the middle, as here, because
the `some(start => start < 0)` check then fires regardless.

## Authorized Production Repair (2026-10-03)

The Navigator authorized the surgical repair rather than waiting for the durable fix. Applied with
the production application closed, verified not running before and after.

The values written were **computed, not chosen**: the native refresh rule
(`src-tauri/src/main.rs:4391-4404`) was replicated against the real session, the real ledger and the
real manifest, so the edit is exactly what a refresh would have produced. Only the two segments whose
stored values differed from that computation were touched.

| segment | was | now |
|---|---|---|
| segment-27 | `firstTurnId`/`lastTurnId` = `turn-…00:46:07.343Z`, `turnCount` 1 | no anchor, `turnCount` 0 |
| segment-28 | `firstTurnId` = `turn-…00:46:07.343Z`, `turnCount` 9 | `firstTurnId` = `turn-…15:27:35.373Z`, `turnCount` 2 |

Segment-27 legitimately loses its anchor because no surviving turn falls in its entry range at all.
Segment-28 keeps one, but pointing at the oldest turn the ledger still has.

The repair aborted-by-design unless three things held: the condition was present before, absent
after, and the manifest still satisfied the parser's sequence, id, closed-checkpoint and `turnCount`
constraints. A pre-existing backup would also have aborted it rather than being overwritten.

Verified independently afterwards by re-running the partition guard against the file on disk:
`starts` is now all zeroes across 29 segments and all three throw conditions are false.

Backup retained at
`conversation-segments/mirror-desktop/nautilus-thread-mirror-desktop/generation-4.json.cr118-backup-2026-10-03`,
confirmed to still contain the stale anchors.

**This repairs one Journey's state; it does not fix the defect.** The partition still treats an
unresolvable anchor as fatal, **Repair synchronization** still cannot repair what it reports, and any
other store truncated under `alpha.30` remains exposed. Those are this CR's work.

**Noted during the repair:** the durable ledger moved from 13 turns to 15 between two readings
minutes apart, so this state is live and a diagnosis of it is only valid for the moment it was taken.

**Found at planning, and owed to the Navigator plainly.** The repair stops the throw on ordinary
turns. It does not, and could not, prevent a second symptom of the same root cause at the **next
compaction settlement**. On that path the partition hands every available Segment to the publisher,
and closed Segments 1 to 27 — no anchor, so an empty slice — would be offered as empty projections
over files that hold real history (segment-3 alone holds 62 messages). The native publisher rightly
refuses to overwrite an immutable closed Segment whose bytes differ
(`src-tauri/src/main.rs:4621-4626`), so that settlement would fail with
`Immutable Conversation Segment projection diverged.` The repair did not cause this — Segments 1 to
26 were already anchorless before it — and it does not fix it. The receipt confirms `segment-29` is
the prior current, so none of the older ones is exempt. This is deduced from the publish code, not
observed; slice 0 reproduces it in a test before anything is built on it.

## Diagnosis (at planning)

Three facts decide the shape of the work.

**The partition's only tolerance is for a leading gap.** `firstAvailable`
(`src/domain/conversationSegmentProjection.ts:24`) was written in `7362312` for the case where a
manifest predates the turns the ledger starts with. It skips unresolvable Segments only until the
first resolvable one. An unresolvable anchor after that point, which is what prefix truncation
produces, fires `some(start < 0)` and throws. There is no test asserting that throw.

**Closed Segment files are the surviving history, and the publisher already defends them.** The
production files hold far more than the 15-turn ledger. `publish_conversation_segment_projections`
treats a closed file that exists and was not the prior current as immutable and errors if the bytes
differ. That protection is correct and must stay. But it means the partition must never offer an
empty projection for a closed Segment that has a file, or the compaction path trades one throw for
another.

**Nothing refreshes a stale manifest, and nothing needs to.** The native refresh rebuilds every
Segment from the session and is lossless, since every stored field derives from the session. It runs
when a compaction settles, which is exactly when anchors change. **Repair synchronization** reaches
the partition through `convergeDelivery → ports.saveProjection → saveProjectedTurnLifecycle`, so once
the partition stops throwing, the existing repair route works without a new trigger. The chapter
evidence refresh at `App.tsx:2427` is a different repair for a different gap and is left alone.

A latent third member of the same family: a closed Segment with **no** anchor sitting between two
anchored ones maps to `0` today, which makes `starts` non-monotonic and throws. It cannot occur under
prefix truncation, but the rule chosen below should not leave it in place.

## Plan

**Slice 0 — reproduce both symptoms in tests, from production shapes.** A TypeScript test builds a
manifest in the production shape (closed Segments without anchors, two with anchors the ledger lacks,
a resolvable current) against a prefix-truncated ledger, and asserts the throw. A Rust test asserts
that an empty closed projection over an existing closed file with content is refused today. Both are
red before any change. No production data enters the repository; the fixtures are constructed.

**Slice 1 — an unresolvable anchor is a cut, wherever it sits.** In `partitionConversationBySegments`,
`firstAvailable` becomes the index after the **last** unresolvable anchor rather than the first
resolvable one. Everything up to and including the cut is omitted from the result, exactly as leading
gaps are omitted today, so those Segments are never republished. A closed Segment with no anchor
after the cut inherits the next Segment's start rather than `0`, which closes the latent
non-monotonic case and yields an empty slice. Monotonicity is still enforced among what remains, so
genuinely corrupt order still throws. The current Segment is always returned.

**Slice 2 — an empty closed projection never contradicts a published Segment.** In
`publish_conversation_segment_projections`, a closed projection with zero messages whose file exists
and is not the prior current is skipped: no write, hash untouched, no error. A non-empty divergence
still errors. This is the only case where "empty" means "the ledger cannot see it" rather than "the
content changed", and the file remains the authority. A closed Segment with zero messages and **no**
file is still written, because `load_conversation_segment_projections` needs a file per manifest
Segment and the receipt is written only when all are present.

**Slice 3 — one fault, one notice.** In `projectSettlementNotices`, an exact settlement error whose
message equals the Journey-level failure reason is not appended as an "also needs attention" count.
Distinct errors still are.

**Slice 4 — validation and handoff.** Gates, then the validation below.

## Files

- `src/domain/conversationSegmentProjection.ts` — the cut rule and the no-anchor inheritance.
- `src/tests/conversationSegmentProjection.test.ts` — existing suite stays green; new cases added.
- `src/tests/segmentAnchorTolerance.test.ts` — new: production-shape reproduction, cut in the
  middle, leading (existing behaviour preserved), trailing closed, no-anchor between anchored,
  genuine non-monotonic still throws, current always returned, omitted Segments never in output.
- `src-tauri/src/main.rs` — `publish_conversation_segment_projections` skip rule, plus a Rust test
  for the refused case before and the skipped case after.
- `src/app/settlementDiagnostics.ts` and its test — the duplicate-notice rule.
- This document, the RS016 index, the canonical index, the Canvas.

Nothing in `App.tsx` is expected to change. If a change there turns out to be needed, it is a
guard-level change and gets a guard-level test, per the CR117 lesson.

## Acceptance

- A manifest whose closed Segments carry anchors the ledger no longer holds partitions without
  throwing, wherever those Segments sit, and those Segments are absent from the result.
- The leading-gap behaviour that `7362312` introduced is unchanged and covered.
- A closed Segment with no anchor between two anchored Segments partitions as empty, not as a throw.
- A manifest whose resolvable anchors are genuinely out of order still throws.
- A compaction settlement over a prefix-truncated ledger completes: closed Segments with history
  files are left byte-identical, the just-closed and current Segments are written, the receipt is
  updated.
- A non-empty closed projection that differs from its file still fails as today.
- One settlement failure produces one notice, not a notice plus a count of itself.
- CR114's chapter window, CR080's chapter evidence and CR115's idle quiet are unchanged: existing
  suites green.

## Validation

- **Test-level:** every acceptance line above has a test, red before the slice and green after.
- **Dev:** the Navigator's Dev store has no truncated ledger and this CR will not manufacture one
  there. Dev homologation is limited to a smoke pass: open the Journey, take a turn, trigger a
  compaction, confirm no synchronization notice and intact chapters.
- **Production, after release:** the real proof is observational and honest about it. The production
  Journey carries the repaired manifest and 27 anchorless closed Segments with history files. The
  first compaction to settle there after upgrade must complete without a notice and leave Segments 1
  to 27 byte-identical (their hashes in `complete.json` are the check). **Repair synchronization**
  should also resolve the journal record left `running` at `21:40:01`. Both are recorded as evidence
  when they happen, not assumed at closure.

## Exclusions

- No new refresh trigger for the manifest; the compaction path already refreshes at the right moment.
- No change to the native `firstTurnId` rule or to the TypeScript mirror of it.
- No change to "publish every available Segment on compaction". Whether that should become "publish
  only the just-closed and current Segments" is a real design question raised by this CR and is
  recorded as an open decision below, not taken here.
- No backfill of turns lost from a truncated ledger; closed Segment files remain the only copy.
- No one-time rebuild of other stores. With slices 1 and 2 the stale state is tolerated and heals on
  the next compaction, which is the mechanism that would have been needed anyway.
- No change to the recovery surface's wording.
- The Dev store is not touched.

## Open Decisions

- **D1 — the cut rule versus resolving from entry positions.** The partition cannot re-anchor from
  Pi entry positions because the renderer does not hold them at settlement; that is why the native
  refresh exists. The cut rule is the honest alternative: what the ledger cannot see is left as
  published. Recommended as planned.
- **D2 — publish only what changed on compaction.** The cascade that truncated this ledger was
  possible because every available Segment is republished on each compaction and the design leans on
  byte-identical idempotence. Publishing only the just-closed and current Segments would remove that
  exposure at the source. Recommended as its own CR after this one; it is a design change with its
  own blast radius.
- **D3 — whether the duplicate-notice fix belongs here.** It is small, local and was found while
  diagnosing this incident. Recommended in scope as slice 3; it can be dropped without affecting
  slices 1 and 2.

## Dependencies

Shares the Segment surface with CR114 and the recovery surface with CR115 and CR116. Independent of
CR117 and CR097. The originating defect is the one CR114's release fixed, so this CR covers the
residue that fix left in already-affected stores rather than the cause itself.
