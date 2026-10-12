[< Updates](../index.md)

# CR146 field verification — 2026-10-12

**The negative half only, written before the run, with the baseline, the prediction, the falsifiers
and the report specified together.**

## Why a negative check is the whole check here

CR146's positive half cannot be provoked. Producing the defect requires a turn that completes in Pi
while its harness fails to commit — which is CR147's defect, repaired yesterday. So the positive
half rests on the test suite, and the field is asked one question instead: **does slice 1's new
binding route leave a healthy turn, and the Navigator's existing records, exactly as they were?**

That question is not decoration. Slice 1 binds a turn whose `pi.state` is `pending`, and **a healthy
turn is `pending` from admission until commit.** I allowed that deliberately during implementation
and failed to record it until afterwards. This run is the only instrument that can show it
misfiring on real data.

## Build under test

| | |
|---|---|
| Dev binary | `8329e4a427e9c41f0331e4a3006df7b9ef1375d0f362b0655df11e4636e9e5c6` |
| Installed | 2026-10-12 16:01:26 local, over `77dcc1e8…` (CR147) |
| Backup retained | `/tmp/Mirror Desktop Dev-20261012-160126.app`, hash-verified before removal |
| Production | `834f9b2fb9540cee…`, pid 85557 since 15:55:07, untouched |

## Pre-state, read with the app closed

| | |
|---|---|
| `turn-journal/mirror-desktop.json` | **62** records — `settled` 52, `interrupted` 10, `running` 0 |
| `settlement-timings/mirror-desktop.json` | **20** records |
| `native-panics.jsonl` | absent |
| Restored selection | `desktop-conversation-mirror-desktop-18d5cf4842b669b0` |
| Its stored conversation | **30 messages**, 16 turns |
| Message identities | **14 `user-…`, 14 `assistant-…`, 2 `pi-…`** |
| Turn Pi states | **14 `committed`, 2 `pending`** |

The two `pi-` messages and two `pending` turns are **not** CR146's shape. Each is a request with no
answer after it, whose harness pair is absent from the file — a third sub-shape, captured separately
as CR148. **Slice 1 declines them on purpose**, because its route requires a run that closed with an
answer, so they are the sharpest part of this prediction: they must not move.

## Prediction

One healthy turn in that conversation will:

1. settle normally, answer on screen, composer released;
2. advance the journal 62 → **63**, the new record `settled`, `running` still 0;
3. advance the timings 20 → **21**, every phase completed;
4. grow the stored conversation from 30 to **exactly 32** messages;
5. store the new pair under **harness identities** — `user-2026-10-12T…` and `assistant-2026-10-12T…` — and **not** under `pi-` ids;
6. leave the **two `pi-` messages and two `pending` turns byte-identical**;
7. leave `native-panics.jsonl` absent.

## Falsifiers, named before the run

- **33 or more messages**, or a second pair for one turn. That is CR146's defect reappearing, and
  the ids would say which producer.
- **The new pair stored under `pi-` ids.** The route did not fire where it should, or a projection
  replaced the harness identities.
- **The two `pi-` messages change id, content, or disappear.** Slice 1 over-reaching onto records it
  was built to decline — the single most important falsifier, because it is the Navigator's own data.
- **A `pending` turn count other than 2**, which would mean the new route marked something.
- **Partial answer content stored**, which is the agentic mid-run case the code comment names.
- **The turn's `pi` body still `pending` after it settles.** Slice 2's evidence did not reach it.

## What the Navigator does, and what to report

1. Open **Mirror Desktop Dev**. It should land in *"Pensar sobre uma nova feature: journey card"*.
2. Send one short turn: `CR146-NEG · responda em uma frase: por que identidade importa mais que conteúdo num registro?`
3. When the answer finishes, **quit the app** and say so.

**Report three things:** whether the answer arrived and the composer was released; whether the
transcript above it still reads correctly, with no question appearing twice; and that the app is
closed. The disk half is mine, read only after `ps` confirms the app is gone.

---

## Result

*To be completed after the run.*
