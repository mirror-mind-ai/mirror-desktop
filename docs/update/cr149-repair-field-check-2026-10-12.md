# CR149 repair field check — 2026-10-12

**Kind:** field verification record for CR149's measured repair
**Written before the run.** Every prediction and falsifier below was committed before the Navigator
touched the application. This is the third time CR149 has done this; the first two refuted the
hypothesis under test, which is why the practice is kept.

## What shipped

| slice | change |
|---|---|
| A | every scan in `ImportedActivity.tsx` refuses content it cannot match before allocating |
| B | `projectAgentTurnPresentation` computes each strip once instead of twice |

Benchmarked outside the app against a 91,688-character message with no surfaces: the strip chain
went **0.920 ms → 0.105 ms (−88.5%)** with identical outputs; an assistant row render went
**2.761 ms → 0.211 ms (−92.4%)**.

**The cache that was also authorised was deliberately not built**, recorded as a reduction in the CR
with the arithmetic behind it.

## An error of mine that changes the procedure

**I replaced the Eval bundle while Eval was running.** The `ps` check was in the sequence, it printed
the running process, and I did not gate on it. The consequences were measured immediately:

| | |
|---|---|
| process pid 22950 | survived, still running |
| installed bundle | complete, hash-identical to the build |
| installer residue | none |
| production data | nothing written by me |

**But the running instance is executing the old code while the disk holds the new.** Both report
`0.2.0-alpha.47` and only the hash distinguishes them, which is precisely how a field check gets
collected against the wrong build and believed.

**So step 1 below is not optional, and it exists because of my mistake rather than for tidiness.**

## Builds

| | binary sha256 |
|---|---|
| **Eval, with the repair** (on disk now) | `28a81aa3d676375bc8d27175cb9290a5a4f406c2a15d72dbb766731ba7372515` |
| Eval, profile build without the repair | `a65628b8b67837989d4d66eb5d072cd2240ad79fea517161e46634c67bad4078` — retained at `/tmp/Mirror Desktop Eval-20261012-220026.app` |

The **Dev** app is stale: it holds only CR149's first slice from earlier today and none of this
repair. It is not part of this check.

## The run

1. **Quit Mirror Desktop Eval and reopen it.** Without this you are running the old code. *(See
   above — this is my error, not a precaution.)*
2. Open the same large conversation that reproduced the stall.
3. Send a short turn. From the moment the answer finishes appearing, **type continuously** until the
   `Finishing` indicator clears.
4. **Repeat on 3–5 turns**, because the ledger shows the same Journey producing 3 s and 16 s
   settlements and one turn can land anywhere in that range.
5. Quit Eval before reopening production.

## Predictions and falsifiers

### 1. Typing during `Finishing` no longer stalls — the one that matters

**Falsified if** typing still stalls.

That outcome would mean the remaining main-thread work is enough to block on its own, and the named
next step is the cache this repair declined to build, plus `setAttribute` at 19.5% and the inert
`memo` — all already on the record with their numbers. **A fourth refutation would still be a
result**, and it would be the first one where the cause was measured rather than nominated.

### 2. Settlements get measurably faster — a number, not an impression

This is the corroboration that needs none of your perception. If main-thread contention was
inflating every awaited operation — which is what a 27 ms versus 3,109 ms `load_journal` on the same
file established — then removing that contention should **shorten the settlements themselves**.

Baseline, from 779 production records: **p50 4,821 ms, p90 7,897 ms.**

**Falsified if** the new records sit inside the old distribution with no shift. I will read the
ledger after the run and compare, including the per-phase breakdown for the cheap phases
(`load_journal`, `advance_journal`, `cleanup_lease`) whose cost is pure contention.

**Stated honestly: a handful of turns cannot move a 779-record median.** The comparison will be
against the same Journey's own recent records, and if the sample is too small to say anything I will
say that instead of reading a trend into four numbers.

### 3. Nothing about what is captured changed — and this half IS provocable

Unlike the previous two field checks, the behaviour-preserving half can be seen directly.

**Falsified if** any of these renders differently than before:

- a conversation containing an **Ariad surface** (`<<<ARIAD:…>>>`) still shows it as a surface, not
  as raw text in the answer;
- a **Mirror mode block** is still stripped from the prose and still shown as its own activity;
- a **boxed Explorer surface** (`╭───╮` … `╰───╯`) still appears as a surface;
- ordinary answers read exactly as before, with no stray blank lines added or removed.

A ten-case differential already asserted byte-identical output from all seven exported functions,
including CRLF content and a mode phrase broken across lines. **This is the field asking whether that
corpus was representative of your real conversations**, which is the one thing a corpus cannot
answer about itself.

### 4. A healthy turn is unaffected

**Falsified if** the turn journal does not advance by one per turn with `running: 0`, or the timing
ledger gains fewer records than turns sent, or any new record's outcome is not `settled`.

### 5. Nothing panics

**Falsified if** `native-panics.jsonl` appears in the production data directory.

## What this run cannot establish

- **The repair's effect on a conversation without large messages.** The benchmark used a 91,688
  character message because that is the shape the profile implicated. A small conversation was never
  slow and will not show a change.
- **Any claim about the cache.** It was not built. If prediction 1 holds, that is evidence it was not
  needed — not evidence it would not have helped.
- **The abandonment offer**, still needing 60 s of `Finishing` and still unprovoked since `alpha.42`.
  And its threshold is already falsified by two legitimate settlements above it — see CR155.

## Result

*(to be completed after the run)*
