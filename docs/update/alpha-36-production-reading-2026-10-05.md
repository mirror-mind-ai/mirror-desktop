[< Updates](../index.md)

# v0.2.0-alpha.36 — the two field readings CR121 and CR123 owed

**Date:** 2026-10-05
**Scope:** read-only inspection of `~/Library/Application Support/ai.mirrormind.desktop`
**Purpose:** both closures said no live run stood behind them and named the same single turn as the
field test. This is that reading.

## The build under observation

| | |
|---|---|
| Version | `0.2.0-alpha.36`, bundle `ai.mirrormind.desktop` |
| Binary mtime | `2026-10-05 06:31:46` local |
| Process | pid 90815, started `2026-10-05 06:53:47` local |
| Verdict | started **after** the binary, so this is the new build |

Restart instant: `09:53:47Z`.

## A correction to the first pass of this reading

The first inspection ran 36 seconds after the restart and reported `complete.json` **absent** for both
Journeys. That was premature, not a result: the receipt was written at `06:55:15` local, about ninety
seconds later, by the second turn to settle. The absence was the clock, not the code.

## Reading 1 — CR123: the receipt a Journey could never write

`livro-lideranca-soberana` failed chapter publication on **every ordinary turn** for days, because
writing a first receipt required every chapter the manifest declares to have a file and its
`segment-1` predates publication.

It now has one.

| field | value | predicted |
|---|---|---|
| `complete.json` | written `06:55:15` local, 630 B | — |
| `historicalMessageCount` | **344** | **344** |
| `totalMessageCount` | 401 | 344 + 57 current = 401 |
| `currentSegmentId` | `segment-9` | — |
| `currentLastTurnId` | `turn-agent-run-2026-10-05T09:54:49.647Z` | — |
| `projectionHashes` | 1 — `segment-9` | 1, since an ordinary turn publishes only the current chapter |
| current chapter hash | **verifies** | — |

The historical count matched the replayed prediction exactly, which is the strongest form this
verification could take: the number was computed from the real store before the release and the
release produced it independently.

One hash rather than nine is the `all_present` gate's removal working as designed. The receipt
records what *this publication* covered, not what the session contains.

**`publish_segments` ran in 150 ms and completed.** It is the phase that had been failing
deterministically.

**`nautilus-agentic-method` still has no receipt.** No ordinary turn has published there since the
restart, so its path is unexercised. Expected, and still owed.

## Reading 2 — CR121: a settlement that names itself

The settled record for the same turn carries **19 phases**, two more than `alpha.35` wrote, and the
two new ones sit exactly where the untimed gap was:

```text
cleanup_lease              34 ms  completed
notify_lease_released       0 ms  completed
create_outbox_item          0 ms  completed
enqueue_outbox_item        255 ms completed
```

Depth-0 phases sum to 3,195 ms against a total of 3,200 ms — a 5 ms gap, 0.16%. The arithmetic holds
with the two additions in place. No `failure` field, correctly, because nothing failed.

### Both new steps measured 0 ms, which settles an argument

The CR121 capture asked for these two steps to be *timed*. That slice was deleted during planning on
the grounds that both are synchronous and pure, so a duration for them would mean nothing and would
be misread as a cost. Production now says 0 ms and 0 ms. Deleting the slice was correct, and the
names are doing the only job available to them.

### The failure payload is still unproven

The prediction was that this turn would **fail** and CR121 would name the reason. It settled instead,
because CR123 shipped in the same release and removed the failure. So the structure is verified — the
new phases are present, a settled record carries no `failure` — but the `failure` payload itself has
never been written on a real machine.

That is an honest gap and it is the better outcome of the two. It stays owed until a settlement fails
in production for any reason.

## Reading 3 — nothing regressed

| check | result |
|---|---|
| Turns stuck with a refused harness commit | **0** store-wide, CR122 holding |
| Ledgers that lost messages | **0** |
| Growth through ordinary use | `mirror-desktop` 2,381 → 2,431; `livro` 384 → 423; `alissonvale-com` 511 → 536 |
| Outbox pending | 0 |

## One more data point for CR119's tail

This settlement took **3.2 s**, against the 41.7 s `mirror-desktop` settlement measured on
`alpha.35`. `deliver_outbox_item` was the largest phase at 1,217 ms, 38% of the window — which looks
like the Dev reading from CR119 (75%) and unlike `alpha.35`'s near-uniform spread across every durable
operation.

Two readings, two different shapes, and the `alpha.35` one had a self-inflicted confound. Recorded as
accumulating evidence for CR119's slice 4, not as a conclusion.

## Verdict

CR123 is verified outright, against a number predicted before the release. CR121 is verified in
structure, with its failure payload still unexercised because the other half of the release removed
the failure it was going to describe. Nothing regressed, and no conversation lost a message.

Still owed: a receipt for `nautilus-agentic-method`, which needs one ordinary turn in that Journey,
and the first real `failure` record, which needs a settlement to fail at all.
