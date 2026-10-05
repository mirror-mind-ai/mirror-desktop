[< Updates](../index.md)

# v0.2.0-alpha.35 — the production reading CR122 owed

**Date:** 2026-10-05
**Scope:** read-only inspection of `~/Library/Application Support/ai.mirrormind.desktop`
**Purpose:** the CR122 closure and the `alpha.35` release note both stated that no live run stood
behind the change and that the production upgrade was the verification owed. This is that reading.

## The build under observation

Confirmed on disk rather than taken on report, because a string in a bundle cannot prove what is
running:

| | |
|---|---|
| Bundle | `/Applications/Mirror Desktop.app`, `ai.mirrormind.desktop` |
| Version | `0.2.0-alpha.35` |
| Binary mtime | `2026-10-05 05:14:57` local |
| Process | pid 43712, started `2026-10-05 05:30:12` local |
| Verdict | started **after** the binary, so the observation belongs to this build |

The restart is `08:30:12Z`. Everything below is split on that instant.

## 1. The heal — fired, persisted, and exact

| Journey | stuck turns before | after | `committedTurnCount` written | ledger rewritten since restart |
|---|---:|---:|---|---|
| `livro-lideranca-soberana` | 13 | **0** | 159 | yes |
| `mirror-desktop` | 2 | **0** | 23 | yes |
| `alissonvale-com` | 11 | 11 | — | **no** |

**15 of 28 refused harness bodies are committed and persisted.** The remaining 11 are in
`alissonvale-com`, whose ledger has not been rewritten since the restart: the heal runs where stored
state becomes live state, so a Journey the new build has not opened still carries the old shape on
disk. It will heal on first read. This is the designed behaviour, not a failure, but it means the
reading is **incomplete until that Journey is opened**.

**The new field is exact, not approximate.** Checked against the turns themselves:

- `livro-lideranca-soberana`: 162 turns, 159 committed harness bodies, `committedTurnCount` 159.
- `mirror-desktop`: 25 turns, 23 committed harness bodies, `committedTurnCount` 23.

Both exact, and in both the next commit would report one higher, so no regression is primed. An
inflated count would have been a latent guard defect; it is not inflated.

## 2. No conversation lost a message

Every Journey's stored message array compared against the pre-upgrade baseline:

**Zero ledgers shrank.** Eighteen are unchanged, two grew through ordinary use
(`livro-lideranca-soberana` 364 → 383, `mirror-desktop` 2,347 → 2,381). This was the largest risk in
the change — the heal writes to records that had already been mishandled once — and it is clean.

`venda-de-livros` still holds 24 messages against a checkpoint of 122. That loss predates this
release and nothing here can restore it; what matters is that it did not lose more.

## 3. The D0 trap was live, and is now open

The three ledgers the shipped `alpha.34` build could not parse at all, re-checked against both rules:

| Journey | stored | old rule derives | old parse | new parse | messages still stored |
|---|---|---|---|---|---:|
| `nautilus-agentic-method` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 104 |
| `softwarezen` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 22 |
| `venda-de-livros` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 24 |

All three were unreadable on every load, and every load was an opportunity for the next save to
replace their history with whatever was on screen. Their content is intact. They have not been opened
by the new build yet, so their files still carry the stale classification; it normalises on first
read.

## 4. The Composer block — one of two released

| Journey | latest turn | state | writable |
|---|---|---|---|
| `livro-lideranca-soberana` | all three bodies pending — a turn in flight | not `projection_pending` | **yes** |
| `alissonvale-com` | `pi` committed, `harness` pending | `projection_pending` | **no, still blocked** |

`livro-lideranca-soberana` is released and has in fact accepted and run new turns since the restart.
`alissonvale-com` stays blocked for the same reason its 11 turns stay stuck: the new build has not
read it.

## 5. What this reading does **not** verify

Stated plainly, because the release note promised this reading would be honest about its limits.

**No settlement has completed on the ordinary path under `alpha.35`.** Zero settlement timing records
exist after `08:30:12Z`. The 37 records that exist (`alissonvale-com` 14, `livro-lideranca-soberana`
16, `mirror-desktop` 7) are all `outcome: failed` and all written by `alpha.34`, the last of them at
`08:29:56Z`, some thirty seconds before the restart.

One turn did reach `settled` after the restart — `turn-agent-run-2026-10-05T08:29:21.009Z` in
`livro-lideranca-soberana`, settled at `08:31:03.476Z` with `recoveryDisposition: complete` and a
receipt transitioning `outbox_enqueued → settled`. But it was **created under `alpha.34`**, its first
attempt is the last `failed` timing record, and it was finished by recovery, which does not open a
timing collector. So it proves recovery still works across an upgrade; it does not prove a settlement
now succeeds first time.

**The central claim of the release therefore remains unverified**: that a turn whose commit would
previously have been refused now settles without the detour. It needs one ordinary turn to complete
in a Journey that was affected. The outbox is empty and a turn is in flight, so the next completion
should produce the first `settled` timing record on this build.

## Verdict

Of the three readings the CR122 closure said were owed:

1. **Heal count must read zero** — partially met. Zero in both Journeys the new build has read, with
   the count exact. Eleven remain in one unopened Journey.
2. **No conversation may lose messages** — **met**, with no exceptions.
3. **The two blocked Composers must be writable** — half met, for the same reason as (1).

Nothing contradicts the closure. One claim is confirmed outright, two are confirmed wherever the new
build has actually run, and the settlement-success claim is still waiting on a single ordinary turn.

**Next action, and it is small:** open `alissonvale-com` in the application. That triggers the heal
for its 11 turns and releases its Composer. Opening `nautilus-agentic-method`, `softwarezen` and
`venda-de-livros` normalises their stale classification. Then re-run this reading, which should show
zero stuck turns everywhere and at least one `settled` timing record.
