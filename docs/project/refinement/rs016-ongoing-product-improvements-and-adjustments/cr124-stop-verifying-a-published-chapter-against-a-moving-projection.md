[< RS016](index.md)

# CR124: Stop Verifying a Published Chapter Against a Moving Projection

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

When a compaction publishes, the publisher re-derives a projection for every closed chapter and
compares it byte for byte against the file already on disk. A difference is reported as
`Immutable Conversation Segment projection diverged.` and fails the publication.

The file is immutable. The projection is not. It is derived from the durable ledger, whose loaded
window and turn boundaries change by design — CR114 bounded the window, CR118 made unresolvable
anchors a cut, CR122 committed harness bodies that had been refused. So a chapter published under one
ledger state cannot match a projection derived under a later one, and the comparison fails for
reasons that have nothing to do with the chapter's content being wrong.

Measured against the current store: of the 14 closed chapters a compaction would supply non-empty,
**11 diverge**, across three Journeys. Each of those three will fail the publication half of its next
compaction.

CR118 already named this illness for the empty case — its comment reads "the publisher used to
compare bytes and refuse, turning a stale manifest into a failed compaction" — and fixed it by
deferring to the file. CR120 extended that to a file holding nothing. The case where the file holds
*different* content is the same illness untreated.

## Evidence

Read-only replay of the shipped partition and decision table against the production store,
2026-10-05, application on `0.2.0-alpha.36`.

| Journey | chapter | supplied | file | shape |
|---|---|---:|---:|---|
| `livro-lideranca-soberana` | `segment-2` | 64 msgs / 32 turns | 88 / 44 | file holds the manifest's full `turnCount`; partition supplies fewer |
| | `segment-3` | 56 / 28 | 68 / 34 | same |
| | `segment-4` | 24 / 12 | 34 / 17 | same |
| | `segment-5` | 61 / 31 | 69 / 35 | same |
| | `segment-6` | 33 / 17 | 37 / 19 | same |
| | `segment-7` | 16 / 8 | 19 / 10 | same |
| | `segment-8` | 22 / 11 | 29 / 15 | same |
| `mirror-desktop` | `segment-31` | 16 / 9 | 17 / 10 | boundary moved: the file's last turn is now `segment-32`'s anchor |
| `alissonvale-com` | `segment-9` | 90 / 45 | 89 / 45 | same turns, one message more in the window |

Three distinct causes, one symptom:

- **A moved boundary.** `mirror-desktop` `segment-31` was written at `21:07:37` while it was current
  and held ten turns. The compaction at `21:21:38` closed it at a boundary excluding the last, which
  became `segment-32`'s anchor, and never rewrote the file because its publication had already
  aborted on `segment-30`. The file is stale by one turn, permanently.
- **A narrower window.** `livro-lideranca-soberana`'s files hold the manifest's own `turnCount`,
  written when the ledger reached further back. The partition now slices fewer turns from a bounded
  ledger, so every closed chapter is under-supplied.
- **A wider window.** `alissonvale-com` `segment-9` is supplied one message *more* than its file
  holds, which is a turn CR122 healed being present in the window now.

Both directions fail the same comparison, which is the clearest sign the comparison is not measuring
what it claims to.

## Why the guard is redundant as well as wrong

A published chapter's integrity is already verified where it matters — on **read**, by hash against
the completion receipt:

- `load_conversation_segment_projections` (`src-tauri/src/main.rs:5057`) rejects any chapter whose
  bytes do not match the receipt's recorded `sha256`.
- `load_current_conversation_segment_projection` (`:4998`) does the same for the current chapter.

So corruption of a published file is caught when the file is used. The publish-time byte-compare adds
no detection the read path lacks, and it converts a benign difference between an immutable file and a
mutable derivation into a failed settlement.

## Candidate directions

Not decided. Recorded for the Navigator.

- **Once published, defer to the file.** Extend CR118's rule from "an empty projection defers" to "a
  published closed chapter defers", keeping the prior-current exemption so a chapter closing with
  content still replaces the shorter file it had while current. `VerifyImmutable` disappears. This is
  the simplest rule, it matches what the system already treats as authoritative, and the read-time
  hash keeps the integrity guarantee. It is also the largest single deletion of a guard in this area,
  which is why it is a decision rather than a tidy-up.
- **Compare content rather than bytes.** Verify that the file's messages are a superset of the
  supplied ones, and only fail when the file is *missing* content the projection has. More
  permissive than byte equality and still protective, at the cost of a rule with a direction.
- **Rewrite rather than verify when the boundary moved.** Narrower: detect that the file's turns are
  not the manifest's turns for that chapter and rewrite. This fixes `mirror-desktop` and does nothing
  for the window-width cases, so it is probably the wrong size.
- **Address the upstream cause instead.** The shared anchor (CR120 D3) and the manifest's `turnCount`
  disagreeing with the ledger's slices are both upstream of this. Fixing them would not remove the
  guard's unsoundness, because the window will keep changing.

## What is not wrong

No conversation is lost. The chapter files hold their history, the ledger holds the recent window,
and the Pi session holds everything. Settlement completes through recovery, as it has been doing for
days, so the cost is the `Finishing` detour and a publication that silently does not happen.

CR121 ships in `alpha.36`, so the next such failure will name itself in the settlement record rather
than requiring another replay.

## Dependencies

Found while closing CR120, which corrected its own prediction after this replay. Independent of
CR120's three slices, which are correct and shipped on their own. Touches the rule CR118 introduced
and would most likely extend it.
