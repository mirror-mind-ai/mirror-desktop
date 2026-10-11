# CR145 + CR142 Negative Field Check — 2026-10-11

Two owed negative checks have the same shape — **a healthy long turn must show no notice** — so one
run collects both. A false positive from either is worse than the defect it rescues: it would tell
the Navigator a turn has ended while it is still working.

## Instrument

Dev app `/Applications/Mirror Desktop Dev.app`, binary
`714da8b4138470a2155a2e1f4836cba7acb7af4b2a6bd9cb757fdeabc1e663da` (alpha.44 + CR142 + CR145),
installed 16:53:14 with the previous bundle (`88d404cc…`) retained as
`/tmp/Mirror Desktop Dev-20261011-165314.app`.

## Baseline — recorded before the run, by the assistant

| | |
|---|---|
| Turn journal | **60 records** — {'settled': 50, 'interrupted': 10} |
| Journal sha256 (prefix) / mtime | `b642c5a583a4f040` / 15:30:16 |
| Settlement timings | **18 records**, mtime 23:29:22 |
| Free journal slots | 4 of 64 |

## What must NOT appear — the two falsifiers

| CR | Notice that must never show during a healthy turn | Produced by |
|---|---|---|
| CR142 | *"This turn has already finished"* | `deriveStrandedTurn` — polls every 15 s while the selected workspace streams |
| CR145 | *"This turn's process has already ended"* | `deriveDeadChildRelease` — reads `childLiveness` from each occupancy re-inspection |

CR145's predicate is the sharper of the two to falsify: during a live turn the OS reports the child
**running**, and `try_wait` is consulted on every `inspect_pi_invocations`. If the notice appears
while Pi is visibly producing output, the measurement is wrong and the CR is not done.

## Expected after — the prediction, written before the run

1. Journal gains **one** record, phase `settled`: 60 → 61. No `running` survives.
2. Settlement timings gain one record: 18 → 19. **If not, that is CR129's third
   instance**, recorded as such rather than ignored.
3. Neither notice appears at any point. The CR143 mark reads `WORKING` during the turn and clears
   after.
4. The conversation's catalog `messageCount` is whatever it is — CR146 item 5, not this check.

## Result

_(pending the Navigator's run)_
