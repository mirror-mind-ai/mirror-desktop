# Dev Turn-Journal Slot Reclamation — 2026-10-11

Authorized explicitly by the Navigator, naming the three slots. A mutation of their Dev-profile
data, performed once, recorded here.

## Why

`JOURNAL_MAX_RECORDS = 64`. The Dev journal held **63** records, three of them in phase `running`
for processes that no longer exist. CR139 made `UnfinishedPruning::Forbidden` the rule, which was
right for live work and leaves dead work **immortal** — so these three would never have been
reclaimed by the app, and field capacity was down to one turn.

Two of the three were **23 days old**, which is how long the defect behind CR145 has been
consuming slots unnoticed.

## What was removed

| Created | Revision | Thread | Run |
|---|---|---|---|
| `2026-09-18T18:10:32` | 2 | `…18d5cf4842b669b0` | `agent-run-2026-09-18T18:10:32.447Z` |
| `2026-09-18T18:42:30` | 2 | `…18d5cf4842b669b0` | `agent-run-2026-09-18T18:42:30.306Z` |
| `2026-10-11T12:43:58` | 2 | `…18dd7a36acc7f288` | `agent-run-2026-10-11T12:43:58.174Z` |

All three carried `terminalOutcome: null` and `terminalEvidence: null` — asserted before the write,
so nothing with recorded work was eligible.

## How it was done safely

- **No live writer.** The Dev app was confirmed closed by `ps` before the read and again after the
  write. Production was untouched throughout.
- **Backed up first, hash-verified**: `/tmp/dev-turn-journal-backup-20261011-152322.json`,
  `d7b6916022574a4f5fed4286ab23af83edf790fb159b8ec565fb957f107c8340`, 297,354 bytes, **63 records**.
  Confirmed byte-identical to the file immediately before the edit, and confirmed intact
  afterwards. **The removal is reversible.**
- **Serialization matched by measurement**, not assumption: `json.dumps(…, ensure_ascii=False,
  indent=2)` was proven to round-trip the original byte-for-byte before anything was written.
- **Every precondition asserted before the write**: 63 records; exactly three in `running`; their
  run ids equal to an expected set written out in full; each with no terminal evidence.
- **Every survivor compared to its original** by sorted-key serialization, in order.
- **Written to `.tmp`, read back, re-validated, then `os.replace`** — the write could not destroy
  its own target.

## Verified after

| | |
|---|---|
| Records | **63 → 60**, arithmetic checked |
| Phases | `settled` 50, `interrupted` 10, **`running` 0** |
| `schemaVersion` | `0.1.0`, preserved |
| `savedAt` | `2026-10-11T12:43:58.223Z`, preserved |
| Key set | identical across all 60 records |
| Order | chronological, `2026-09-11T11:39:49` → `2026-10-11T02:29:02` |
| Size | 297,354 → 293,838 bytes |
| SHA-256 | `b642c5a583a4f0406f947453117f138150820198a18d06c0b396c2cf731fbc49` |

**Field capacity restored: 4 free slots of 64.**

## What this is not

Not a repair. The defect that produced these records is **CR145**, which is `planned` and not yet
built. Until it ships, every recurrence consumes another slot permanently and this reclamation is
the only remedy — a manual act requiring the app to be closed.

Recorded as an argument for CR145's priority rather than as a solution.

## Owed

**The app accepting the edited file is not yet verified.** Parsing is validated in Python against
the shape; the Rust parser's verdict requires a launch, which is the Navigator's act.
