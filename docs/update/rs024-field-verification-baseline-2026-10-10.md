# RS024 Field Verification — Baseline Before D1 (2026-10-10)

Covers the field evidence owed by **CR138**, **CR139** and **CR140** together. None of the three
could provoke it alone: CR138 and CR139 were unobservable while the renderer refused a sibling, and
CR140 is the slice that makes a sibling admissible. This document records the **before** state so
the after is a measurement rather than an impression.

## Instrument

Dev app installed over `/Applications/Mirror Desktop Dev.app` and verified by hash:

| | |
|---|---|
| Installed binary | `61d6af14911513e0f6a68068e33fa5e050ee8e8ad4d099fadfe257989add6de5` |
| Equal to built | yes — `src-tauri/target/release/bundle/macos/Mirror Desktop Dev.app` |
| Version / bundle id | `0.2.0-alpha.43` / `ai.mirrormind.desktop.dev` |
| Replaced | `ef0707fdd9cacc7c35a3ef069314501237fd1e027bd84126f123c785ab6fe74e` (alpha.42) |
| Backup retained | `/tmp/mirror-desktop-dev-backup-20261010-141420.app`, hash-verified before removal |
| Dev app running at install time | no, checked twice |
| Production | untouched, running (pid 95044), `e8eda125…` = alpha.43 |

The frontend assets are embedded compressed inside the binary — `Contents/Resources` holds only an
icon and two scripts, and there is no `.js` file. A `grep` for CR140's TypeScript strings found
nothing, **and so did a control grep for `Active journey` and `Start this Journey`**, which have
shipped for many versions. The instrument is blind to frontend strings by construction, so it was
discarded; the hash equality above is the proof of identity.

## Baseline — `turn-journal/mirror-desktop.json`

The durable target of D1. Read read-only from
`~/Library/Application Support/ai.mirrormind.desktop.dev/`.

- **50 records** of `JOURNAL_MAX_RECORDS = 64`; **106,128 bytes** of the 8 MiB ceiling.
- Phases: 38 `settled`, 10 `interrupted`, **2 `running`**.
- By thread:

| Records | Thread |
|---|---|
| 36 | `nautilus-thread-mirror-desktop` (the Journey's own workspace) |
| 10 | `desktop-thread-mirror-desktop-18d5cf4842b669b0` ("Pensar sobre uma nova feature: journey card") |
| 2 | `desktop-thread-mirror-desktop-18d58ef5a20a4938` ("New conversation") |
| 1 | `desktop-thread-mirror-desktop-18d591ec0de7a738` (no catalog entry) |
| 1 | `desktop-thread-handoff-recovery-dd3ab18ea755dbd6` ("Generated handoff recovery probe") |

- Most recent record before D1: `2026-10-09T15:04:16.579Z → 2026-10-09T15:04:24.591Z` on
  `desktop-thread-handoff-recovery-dd3ab18ea755dbd6`, `settled`.

### Two observations the baseline forces, neither repaired here

**The journal is 14 records from its limit.** D1–D3 add roughly four, so `turn_journal_full` is not
expected to fire. If it does, the Navigator meets CR139's fail-closed refusal through CR140's new
sentence, which would be unplanned field evidence for both and is worth capturing rather than
retrying past.

**Two `running` records from 2026-09-18 have no terminal outcome** — `18:10:32` and `18:42:30`, both
on the "journey card" conversation's thread. Pre-existing, unexplained, and deliberately untouched.
They are the exact shape CR139's `SameWorkspaceOnly` policy permits a workspace to reclaim: if the
journal were full, a new turn in *that* conversation could retire them, and a turn anywhere else
could not. Not a repair this document authorises.

## Baseline — `conversation-spaces/mirror-desktop/catalog.json`

| Kind | Messages | Availability | Thread | Title |
|---|---|---|---|---|
| `desktop_conversation` | 16 | `ready` | `desktop-thread-mirror-desktop-18d5cf4842b669b0` | Pensar sobre uma nova feature: journey card |
| `desktop_conversation` | 0 | `ready` | `desktop-thread-handoff-recovery-dd3ab18ea755dbd6` | Generated handoff recovery probe |
| `desktop_conversation` | 0 | `ready` | `desktop-thread-mirror-desktop-18d58ef5a20a4938` | New conversation |

**`rootThreadId` is `null`.** This is load-bearing for one of CR140's sentences and produces a
falsifiable prediction, recorded before the run rather than after.

`describeAdmissionRefusal` names an occupant as *"this Journey's own workspace"* only when the
refusal context carries a `rootThreadId`, which `App.tsx` resolves through
`resolveJourneyRootThreadId(journeyRootThreadIds, selectedJourneyCatalog.rootThreadId, …)`. The
catalog half is null here, so the resolution depends on `journeyRootThreadIds`, which is populated
from the Journeys that appear in occupancy.

- **Prediction:** in D2 and D3, with the Journey's own workspace running, the share sentence names
  it as *"this Journey's own workspace"*.
- **Falsifier:** the sentence names it `nautilus-thread-mirror-desktop`. That is the deliberate
  id fallback working as designed, not a defect — but it would mean the nicer naming depends on a
  catalog field production may not always carry, which is a finding to capture.

## The sequence to run

Three conversations plus the Journey's own workspace give exactly the four workspaces the share of
three needs to be refused. D3 needs a fourth conversation, created during the run.

| | Action | Expected |
|---|---|---|
| **D1** | Start a turn in "journey card", then in "New conversation" while the first still runs | **Both run.** The Journey row reports working, `inside`. |
| **D2** | With both running, start a turn in the Journey's own workspace | **Admitted** — third of three. The Journey row's locus flips to `here`, because the root now holds a lease (CR140's rule, not a sort artifact). |
| **D3** | With three running, create a fourth conversation and try to send | **Refused before Send**, the Composer naming the share and the three occupants. |
| **D4** | Send again in "journey card" while it still runs | **Refused**, naming *this conversation* — not the Journey. |
| **D5** | Let one finish | The refused workspace's Send returns **without a reload**. |

## What is durable and what is attested

**D1 is durable.** Afterwards, `turn-journal/mirror-desktop.json` must hold two records for
`journey_id = mirror-desktop` with **distinct `threadId`** and **overlapping
`createdAt`–`updatedAt` windows**. Overlap is the claim: two separate turns are not evidence of
concurrency, two turns whose windows intersect are. D2 adds a third, on
`nautilus-thread-mirror-desktop`.

**D2 through D5 are attested.** The refusal sentences have **no durable artifact at all**, by
construction: a refused reservation writes no receipt and no journal record. This is said before
the run rather than discovered at closure.

## Status

Baseline recorded; the run is the Navigator's, since opening a Journey and sending a turn are GUI
actions. CR140 and RS024 stay open until D1 is read from disk and appended below.
