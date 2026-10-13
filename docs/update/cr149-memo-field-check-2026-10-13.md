# CR149 memo slice field check — 2026-10-13

**Kind:** field verification record for CR149's memo slice
**Written before the run.** This is the fifth field check on this CR. Three of the four before it
refuted the hypothesis under test, which is why the falsifiers keep being written first.

## What shipped

`ConversationTranscript` is wrapped in `memo` and, until now, that prevented nothing: a fresh
`onLoadEarlierHistory` arrow on every render defeated the shallow compare every time. Two props are
now stable — `liveResponseModel` through a `useMemo`, and the earlier-history action through a
`useCallback([])` over a ref.

**An audit of all twenty props found only those two unstable**, so the five-memo chain the plan
described was never needed and was not built.

During a `Finishing`, `setFinishingPhases` fires once per phase and `setConversation` is never
called. So the ~14 root renders should now **skip the transcript entirely**, and that is where the
profile put 76.8% of sampled main-thread time.

## Builds

| | binary sha256 |
|---|---|
| **Eval, with the memo slice** | `11216a6978789fefa742b4ed6b3fa0c0cc67caddc658210117a5a5984d456658` |
| Eval, previous (uncontrolled input, no memo fix) | `054e513a857300c5cbb64cf22ba676da509998e711eaf7337cd2e603d6af56f1` — retained at `/tmp/Mirror Desktop Eval-20261013-154409.app` |

Both report `0.2.0-alpha.47`; only the hash distinguishes them. **The `ps` gate was used as a gate
this time** — the build aborts if Eval is open — after I replaced a running bundle yesterday.

## The run

1. **Quit Mirror Desktop Eval and reopen it**, so the running instance is not the old code.
2. Open the same large conversation that reproduced the stall.
3. Send a short turn. From the moment the answer finishes appearing, **type continuously** until the
   `Finishing` indicator clears.
4. **Repeat on 3–5 turns.**
5. Quit Eval before reopening production.

## Predictions and falsifiers

### 1. Typing during `Finishing` no longer stalls

**Falsified if** it still stalls.

**And this time a refutation has a cheap next step rather than another guess**: the Eval build still
carries the Web Inspector, so a second Timeline recording would show whether the long tasks are gone
and what replaced them. `setAttribute` at 19.5% of the first profile is still unattributed and would
be the first suspect.

### 2. The two changed props still work — provocable, and specific to this slice

**Falsified if** either breaks:

- **Earlier history.** The control that loads the rest of the branch — the one at the top of a long
  transcript — must still load it. All three call sites of that action now share one identity, so a
  mistake here would break all three at once.
- **The live model badge.** While a turn is streaming, the arriving answer must still be attributed
  to the model producing it. That is `liveResponseModel`, which is now memoized.

These are the only two behaviours this slice could have broken, which is why they are named
individually rather than as "nothing else changed".

### 3. Settlements get measurably faster

Baseline from 779 production records: **p50 4,821 ms, p90 7,897 ms.** If main-thread contention was
inflating every awaited operation — which a 27 ms versus 3,109 ms `load_journal` against the same
file established — then removing fourteen full transcript renders per settlement should shorten the
settlements themselves.

**Falsified if** the new records sit inside the old distribution with no shift. I will read the
ledger and compare against this Journey's own recent records, including the cheap phases
(`load_journal`, `advance_journal`, `cleanup_lease`) whose cost is pure contention.

**A handful of turns cannot move a 779-record median**, and if the sample is too small to say
anything I will say that rather than read a trend into four numbers.

### 4. A healthy turn is unaffected

**Falsified if** the journal does not advance by one per turn with `running: 0`, or the timing ledger
gains fewer records than turns sent, or any new record's outcome is not `settled`.

### 5. Nothing panics

**Falsified if** `native-panics.jsonl` appears in the production data directory.

## What this run cannot establish

- **That the memo is skipping.** This suite has no DOM, so no test counts renders, and the field
  cannot see it either. The evidence for skipping is the prop audit plus a behavioural test that the
  derivation hands back the same array and conversation by reference. **If typing is still slow, the
  memo may be working and simply not be the whole cost.**
- **Anything about the empty-conversation case**, where the derivation returns a fresh `[]` each
  call and the stability claim does not hold. The transcript has nothing to render there.
- **The abandonment offer**, still needing 60 s of `Finishing`, still unprovoked since `alpha.42`,
  and with its threshold already falsified by two legitimate settlements above it — see CR155.

## Result

*(to be completed after the run)*
