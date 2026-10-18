# Production Reading — v0.2.0-alpha.53

**Read:** 2026-10-18T01:31Z (2026-10-17 22:31 local, UTC−03)
**Upgraded by:** the Navigator
**Scope:** read-only, with production running.

## Upgrade Confirmed by Hash

| | |
|---|---|
| `/Applications/Mirror Desktop.app` binary | **`d24caa0c200fa13433b9493fb2b258cb4d90d9def33172f2fe4fc6d866a67457`** |
| expected, from the binary inside the served updater tarball | identical |
| identity / version | `ai.mirrormind.desktop` · `0.2.0-alpha.53` |
| process | pid **10107**, since 2026-10-17 21:16:00 local (= 2026-10-18T00:16Z) |

Previous: `c6053cb6…` (alpha.52, pid 95585).

## CR161's Field Falsifier — Not Yet Collectable

**No turn has frozen at *Finishing* on alpha.53.** The falsifier stands open.

Only two turns are recorded on this build so far:

| created | phase | outcome | rev |
|---|---|---|---|
| 2026-10-18T01:30:45.177Z | `terminal_durable` | `cancelled` | 4 |
| 2026-10-18T01:30:59.003Z | `running` | — | 2 |

The second is the turn reading this. So the **negative case is barely exercised** — roughly 75 minutes
of uptime and two turns, no spurious notice reported — and the **positive case not at all**.

The turn that was live when the pre-state was recorded, `run-2026-10-17T14:05:23.112Z`, **settled
normally** at 14:34:58.757 with evidence `fc6a7d91`. It did not freeze, and it was on alpha.52.

`mirror-append-recovery-skips.jsonl` is **unchanged at 14 records, mtime 11:25:32Z**: the attribution
refused nothing across the upgrade. Stale records in `mirror-desktop` remain **2** — the legacy
2026-10-08 residue CR160 named, and the live turn.

## Two Corrections to My Own Instruments

Both of these were findings I reported and then refuted by measuring properly. Neither is a defect in
the application.

**`piExecution` is not a root key on a journal record.** It lives inside `terminalEvidence`. My first
post-upgrade script read `record["piExecution"]`, got `None` for every record, and reported
*"0 of 644 settled records carry evidence"* — which would have been alarming and was entirely an
artefact of the wrong path. Read correctly: **643 of 643 settled records carry
`terminalEvidence.piExecution`**, including both turns above. There is no finding here.

**The record count holding at 64 while two records were added is not unexplained.**
`JOURNAL_MAX_RECORDS = 64`, and `compact_turn_journal_for_write` prunes to the cap by retention
priority. My first guess — eviction by age — was refuted on the spot, because the window still begins
2026-09-08; the rule is phase and outcome, not age.

## An Observation Named, Not Scoped

`can_prune_retained_record` protects unfinished records: `Admitted | Running` are unprunable under
`UnfinishedPruning::Forbidden`, and under `SameWorkspaceOnly` only an unfinished record in the *same*
journey and thread may be reclaimed. When nothing is prunable, `compact_turn_journal_for_write`
returns `turn_journal_full` and the arriving turn **fails closed** — the code says so deliberately,
because reclaiming a sibling workspace's record would delete live state.

So a stale unfinished record consumes a slot, and the permanently-unattributable residue CR160
accepted has a second cost that was not named when it was accepted. **Measured margin now: 2 of 64
slots unfinished in `mirror-desktop`, one of which is the live turn.** Immaterial today. The mechanism
matters only if unattributable records accumulate across threads, which concurrent work inside one
Journey (RS024) makes possible in principle. Recorded as an observation; no CR minted.

## Pre-Existing Documentation Debt, Found While Checking My Own Links

Widening the link check from `docs/project/refinement/**` to all of `docs/**` surfaced **17 broken
relative links, all pre-existing** — the identical count resolves at tag `v0.2.0-alpha.52`, and none
of them is in a file written this turn. `docs/index.md` does not exist and ten documents link to it;
the remainder are four `index.md`, two `../ds-001-inherited-desktop-agent-baseline/index.md`, and one
`cv-001-operable-agent-cockpit/index.md`.

Not repaired here: it is a repo-wide navigation question, not part of this release. Recorded so the
count is known and so a future check does not read it as a regression.

## Still Owed

- **CR161's positive field case** — the next turn that freezes at *Finishing*. One minute with nothing
  drawn refutes it.
- **CR155's and CR159's field checks** — neither symptom has recurred. CR155's 60-second sentence is
  now expected to be masked by CR161's recovery notice at ~10 s, which was accepted and recorded in
  advance; it will be verified by fixture, not by the field.
- **CR160's status decision**, and **CR129's RS025 membership**.
