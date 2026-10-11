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

## Result — both negative checks PASSED, and the prediction held on every measurable point

Run `agent-run-2026-10-11T20:01:56.147Z`, thread `desktop-thread-mirror-desktop-18dd9221c3c8b078`,
Pi session `2026-10-11T20-01-40-972Z_desktop-mirror-desktop-18dd9221c3c8b078.jsonl`.

### Against the prediction

| Predicted | Measured | |
|---|---|---|
| Journal 60 → 61, `settled`, no `running` | **61**; `settled` 51, `interrupted` 10, **`running` 0**; rev 5, `terminalOutcome: completed`, `recoveryDisposition: complete`, terminal evidence present | ✅ |
| Timings 18 → 19 | **19** | ✅ — **CR129 did not recur** |
| Neither notice appears | Navigator: *"nenhum dos dois avisos apareceu"* | ✅ (attested) |
| Answer whole, Send released | 39,206 chars, **1,201 lines**, first line exactly `RS024-CR142-LONG`, last line `1200. O cesto mantém itens juntos.`, `stopReason: stop` | ✅ |

### Where attestation begins, said exactly

The disk cannot prove a notice did not render. It proves the turn settled healthily, which is
**consistent with** both predicates staying silent and is not the same claim. For a visual absence
the Navigator's observation is the only possible instrument, and it is the evidence here. The
corroboration the disk does give is strong: a turn that reached `settled` rev 5 with complete
terminal evidence is exactly the state in which `deriveStrandedTurn` returns `journal_agrees` and
`deriveDeadChildRelease` returns `child_running` then `no_lease`.

### What the measurement bought beyond the check

**The new measurement did not disturb the healthy path.** CR145 added a `try_wait` to every
`inspect_pi_invocations`, and `inspect_pi_invocations` is called on every occupancy reconciliation
during a live turn. This turn ran **20 settlement phases with zero non-completed**, including
`cleanup_lease` and `notify_lease_released` — the normal release ran normally.

**An eighth measured settlement: 2,299 ms.** The series is now 1.6, 1.9, 2.2, 2.3, 2.3, 2.5, 2.9,
3.0 s. Both thresholds derived from it remain unfalsified with wide margin —
`STRANDED_SETTLEMENT_GRACE_MS = 10_000` (4.3×) and `ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000`
(26×).

**A fourteenth measured Pi execution: ~74 s** (`20:01:56` → `20:03:10`), for 1,200 items and
25,363 tokens. The comparable 2026-10-11 incident run produced 65,474 characters in 94 s; this one
produced 39,206 in 74 s. Both far exceed the twelve earlier samples (15.4–62.1 s), so the long-turn
provocation works as intended.

### A note of mine, corrected

I had recorded that *a settlement-timings record's `runId` lives under `authority`*. **It does
not.** This record's top-level keys are exactly `finishedAt, generation, journeyId, outcome,
phases, runId, schemaVersion, startedAt, totalMs, turnId` — there is **no `authority` key at all**.
My first inspection script read `authority.runId` and printed `None`, which is how the error
surfaced. The turn-journal record is the one that nests identity under `authority`; the timing
record does not. Two neighbouring files, two different shapes.

### Still owed, and why it cannot be collected

**CR145's positive half.** The offer appears only when a child exits without its lease being
terminalized, and that cannot be provoked on demand — the cause remains unestablished. It is
**tested and not field-verified**, counted as such rather than folded into this pass.
