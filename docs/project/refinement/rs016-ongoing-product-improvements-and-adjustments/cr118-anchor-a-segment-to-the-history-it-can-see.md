[< RS016](index.md)

# CR118: Anchor a Segment to the History It Can See

**Status:** captured
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

**The settlement half.** `mirror-append-outbox.json` holds zero items, so no durable Mirror append
debt remains. The "1 exact Mirror settlement operation also needs attention" count is assembled from
in-memory settlement errors (`src/app/settlementDiagnostics.ts:48`) and cannot be verified from disk
after the app closed. It is not established whether it was an independent fault or a consequence of
the Segment throw aborting the same settlement path.

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

## Proposed Scope

- Decide the authority question explicitly: either an anchor is always resolved against the same
  turn list that will be partitioned, or the partition degrades for any anchor it cannot resolve
  instead of throwing. Throwing makes a recoverable bookkeeping gap fatal to the whole settlement
  path.
- Give the existing repair a way to rebuild a manifest whose anchors do not resolve, so the notice's
  own button can fix what it reports.
- Establish whether Journeys whose ledgers were already truncated under `alpha.30` need a one-time
  rebuild after upgrading, and whether that can be detected rather than guessed.
- Establish whether the settlement-operation count in the same notice was independent or a
  consequence of the throw.

## Acceptance

- A Journey whose durable ledger no longer contains a segment's anchor opens, takes a turn and
  settles without a synchronization notice.
- An unresolvable anchor degrades wherever it sits in the segment order, not only when leading.
- **Repair synchronization** resolves the condition it names, or the notice stops offering an action
  that cannot address it.
- CR114's chapter behaviour, CR080's chapter evidence and CR115's idle-recovery quiet are unchanged.

## Exclusions

- No rewriting of Pi session files.
- No change to how the working set is bounded; CR114's default stands.
- No change to the recovery surface's wording or to its promise that no recovery action runs the
  agent again.
- No backfill of turns already lost from a truncated ledger; this CR is about tolerating the
  divergence, not reconstructing history.

## Dependencies

Shares the Segment surface with CR114 and the recovery surface with CR115 and CR116. Independent of
CR117 and CR097. The originating defect is the one CR114's release fixed, so this CR covers the
residue that fix left in already-affected stores rather than the cause itself.
