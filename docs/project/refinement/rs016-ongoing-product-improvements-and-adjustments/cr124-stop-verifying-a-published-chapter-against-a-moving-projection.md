[< RS016](index.md)

# CR124: Stop Verifying a Published Chapter Against a Moving Projection

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr124-published-chapter-authority`

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

## A discovery that decided the design

There are **two** publication breadths for the same event, and only one of them was failing.

- `compactSelectedConversationNow` — the compaction the Navigator triggers — narrows the bundle with
  `segmentProjectionsTouchedByCompaction`, which keeps only the chapter that closed and the one that
  opened (`src/domain/compactionChapters.ts:167`). Older chapters are never supplied, so they never
  diverge.
- `saveProjectedTurnLifecycle` — the settlement path, which runs when Pi compacts during a turn —
  supplies **every** chapter (`src/app/App.tsx:3452`). That is the path that fires in production and
  the one the evidence above was replayed against.

So CR118's D2 was implemented for the manual path and not for the automatic one. The tempting fix was
to narrow the settlement bundle the same way, which is smaller and reuses a tested function. **It was
rejected**: at the next compaction the last two chapters are `segment-32` and `segment-33`, so
`segment-30` would never be supplied again, and CR120's healing of its 22 messages would become
permanently unreachable. The damage would be hidden rather than repaired.

That is why the fix had to be the native rule.

## Implementation (2026-10-05)

`ClosedSegmentPublication::VerifyImmutable` becomes `DeferToPublishedFile`. The decision table keeps
its shape, so every rule that protects content still runs first:

```rust
if status != "closed" || !file_exists { Write }          // a chapter must have a file
if message_count == 0 { SkipPublished }                  // CR118 + CR120: never write nothing
if was_prior_current { Write }                           // a closing chapter replaces its stale file
DeferToPublishedFile                                     // CR124: the file is the authority
```

The branch still reads the file, for one reason: to notice it holds nothing and heal it. Otherwise it
defers.

**The safety property is where the deferral exits.** The receipt's hash is pushed *after* the match,
from the supplied payload. Falling through on a deferral would record this projection's hash against
a file it does not match, and the read path verifies that hash — so a benign difference would have
become a failed verification on read, which is strictly worse than the failure being removed. The
deferral therefore sets `skipped_published_closed` and `continue`s before the hash and the closed
count, leaving the receipt's existing entry describing the file that is still there. A test asserts
that the `continue` precedes the write.

**Integrity is unchanged.** A published chapter's bytes are verified against the receipt's hash where
they are used — `load_conversation_segment_projections` and
`load_current_conversation_segment_projection` — so removing the publish-time compare removes no
detection. A test asserts both verification sites still exist.

**Gates:** `tsc` clean, **231 test files / 1,659 tests**, `cargo test` **257 passed / 3 ignored**,
`cargo check --locked`, build clean, roadmap READY.

## Verified against the production store

Read-only replay of a settlement-path compaction for every Journey, with the shipped conditions:

| Journey | chapters | outcome |
|---|---:|---|
| `mirror-desktop` | 32 | 29 skipped, **1 healed (`segment-30`)**, 1 deferred, 1 written — **succeeds** |
| `livro-lideranca-soberana` | 9 | 7 deferred, 2 written — **succeeds** |
| `alissonvale-com` | 10 | 8 skipped, 1 deferred, 1 written — **succeeds** |
| 11 others | 1–10 | unchanged — **succeeds** |

**All fourteen succeed.** Before this change the same replay failed on the first deferral in each of
the three Journeys that had one. The nine chapters that diverged now defer, and `segment-30`'s 22
messages are restored by CR120's healing on the way through — which is the event that proves both
changes at once.

## Closure review

**Proportionality: proportional.** One enum variant renamed and redocumented, one failure path
replaced by a deferral, one `continue` placed deliberately, and tests. No new artifact, no schema
change, no renderer change, and the caller untouched.

**Debt review: follow_up.** Three items, none selected.

**The receipt can no longer recount authoritatively on a compaction.** A deferral sets
`skipped_published_closed`, so `includes_all_segments` is false and `historicalMessageCount` stays a
carried delta rather than a recount. In production it was already a delta — 29 chapters were being
skipped as empty — so nothing changes today, but the path that would have corrected a drifted total
is now unreachable. The settlement model's recommendation covers this properly: stop storing derived
counts and compute extent from the files, which is what CR123's scan already does for the first
receipt. This is the natural next change in this area.

**The two publication paths still disagree.** The manual compaction narrows to two chapters and the
settlement path supplies all of them. Both are now correct, because the native rule no longer fails
either way, but the same event producing two different bundles is a difference nobody chose. Worth
reconciling deliberately.

**The shared anchor remains the upstream cause** (CR120 D3). Two chapters resolving to one turn is
what hands the earlier one an empty slice on every settlement; CR118's skip rule, CR120's ordering
and this deferral make it harmless rather than absent.

**No field verification.** A compaction cannot be scheduled, so this rests on unit tests, four source
guards, and the replay. The observable event is `segment-30` returning to 22 messages at the next
compaction in `mirror-desktop`, and CR121 ships already, so a failure would name itself.

## Dependencies

Found while closing CR120, which corrected its own prediction after this replay. Independent of
CR120's three slices, which are correct and shipped on their own. Touches the rule CR118 introduced
and would most likely extend it.
