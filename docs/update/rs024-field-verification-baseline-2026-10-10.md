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

## The prompts, and why they are shaped this way

The sequence has a timing requirement the table above does not express: **the first turn must still
be running when the second and third start.** The most recent Dev turn before this run executed in
**3.5 seconds** (`startedAt 15:04:18.868` → `committedAt 15:04:22.401`), which leaves no window to
click into another conversation at all. So the prompts are deliberately long, and ordered longest
first, so each one outlives the turns started after it.

Two constraints shape the text itself.

**Attribution must come from something recorded.** `terminalEvidence.piExecution.assistantText` is
in the journal, so each prompt instructs the model to begin its reply with a unique marker —
`RS024-D1A`, `RS024-D1B`, `RS024-D2ROOT`. The marker must be first, because `assistantText` is
truncated. Without it, the only way to match a durable record to a turn would be its position in
time, which is exactly the inference this verification exists to avoid.

**Dev runs in `invocationMode: "mirror"` against the `mirror-dev` checkout** (`openai-codex` /
`gpt-5.6-luna`, `pi-default`). Every prompt therefore forbids reading files, running commands and
writing to disk, and asks for purely generated text. This reduces tool use; it cannot guarantee
zero, and that limit is stated rather than assumed away.

### D0 — calibration, recommended

Measures whether a long prompt actually runs long enough before the sequence depends on it. Costs
one journal record (51 of 64). In "New conversation":

```
RS024-D0-CAL — comece a primeira linha da resposta exatamente com RS024-D0-CAL e nada antes dela.

Não leia arquivos, não rode comandos, não escreva nada em disco. Responda apenas do seu próprio conhecimento.

Escreva 150 afirmações numeradas, de uma frase cada, sobre por que concorrência é difícil em sistemas de software. Não repita nenhuma afirmação.
```

Under ~40 s, raise the counts below. Over ~40 s, proceed as written.

### D1 — two workspaces running at once

In "Pensar sobre uma nova feature: journey card":

```
RS024-D1A — comece a primeira linha da resposta exatamente com RS024-D1A e nada antes dela.

Não leia arquivos, não rode comandos, não escreva nada em disco. Responda apenas do seu próprio conhecimento.

Escreva 250 afirmações numeradas, de uma frase cada, sobre falhas de projeto em sistemas distribuídos. Não repita nenhuma afirmação.
```

Then, **without waiting**, in "New conversation":

```
RS024-D1B — comece a primeira linha da resposta exatamente com RS024-D1B e nada antes dela.

Não leia arquivos, não rode comandos, não escreva nada em disco. Responda apenas do seu próprio conhecimento.

Escreva 200 afirmações numeradas, de uma frase cada, sobre armadilhas de cache. Não repita nenhuma afirmação.
```

### D2 — the third slot, the Journey's own workspace

With both running, leave every conversation and send from the Journey's own Composer:

```
RS024-D2ROOT — comece a primeira linha da resposta exatamente com RS024-D2ROOT e nada antes dela.

Não leia arquivos, não rode comandos, não escreva nada em disco. Responda apenas do seu próprio conhecimento.

Escreva 150 afirmações numeradas, de uma frase cada, sobre por que nomes importam em código. Não repita nenhuma afirmação.
```

### D3 and D4 — the refusals

Nothing is sent. Create a fourth conversation, try to send, and read the notice; then return to
"journey card" and try again. The expected strings, from `admissionRefusal.ts`:

| | Title | Sentence |
|---|---|---|
| D3 | *This Journey is running all it can at once* | *This Journey is already running as much work as it can at once — <occupants>. Send becomes available when one of them finishes.* |
| D4 | *This conversation is already working* | *This conversation already has native work in progress.* |

Both are prefixed on screen by *"You can keep drafting, but Send remains unavailable."*

D3 is where the `rootThreadId` prediction is tested: the root occupant should read *"this Journey's
own workspace"*, and `nautilus-thread-mirror-desktop` would mean the deliberate id fallback
engaged.

### Divergences that are findings rather than failures

- **D1-B refused** — the grain did not flip. A defect, and the run stops.
- **A finished before B was sent** — no overlap, so no evidence. Repeat D1 with larger counts; two
  sequential turns are not evidence of concurrency.
- **`turn_journal_full` appears** — capture it rather than retrying past it. Unplanned evidence of
  CR139's fail-closed refusal reaching the Navigator through CR140's sentence.
- **"Global Pi capacity occupied"** — the global limit of four, not the share of three, meaning
  another Journey holds a slot.

### What closes this

Read from disk afterwards: records in `turn-journal/mirror-desktop.json` whose `assistantText`
begins with each marker, and whether their `piExecution.startedAt`–`committedAt` windows
**intersect**. The intersection is the claim.

## Observed Run — D0 and D1A, and where it stopped (2026-10-10, 17:37–17:39 UTC)

The run stopped at D1B, which was refused. The Navigator asked whether they were in the right
bundle. They were, and the refusal turned out to be a different finding than the one the step table
anticipated.

### Proven

**The instrument was correct.** The Dev app was running (pid 25964, launched 14:35 local) from
`/Applications/Mirror Desktop Dev.app` with binary `61d6af14911513e0f6a68068e33fa5e050ee8e8ad4d099fadfe257989add6de5`
— the bundle installed and hash-verified above. Both markers landed in the **Dev** journal, not
production's. Worth keeping: **both apps report `0.2.0-alpha.43`**, and only the hash distinguishes
them, which is why identity is proved by hash and not by the version string.

**D0-CAL calibrated usefully.** Pi execution `17:37:09.898 → 17:37:28.265`, 18.4 s, `settled`,
`totalMs: 2351`. The long prompt did lengthen the turn from the 3.5 s baseline.

**D1A ran and then stopped settling.** Pi execution `17:38:12.994 → 17:38:42.447`, 29.5 s, and the
record is stuck:

- `phase: terminal_durable`, `terminalOutcome: completed`, `revision: 3`
- the journal file has not been written since `17:38:42.472`
- `settlement-timings/mirror-desktop.json` holds **no record for D1A**; its last entry is D0-CAL

So the turn executed to completion and its settlement never finished. This is a live instance of
the hang CR132 was built for and CR129 was captured for, arriving unprompted.

**Send has a global gate this CR did not enumerate.** `turnRecoveryBusy` (`App.tsx:891`) is a single
`useState(false)`, not per workspace. It feeds `recoveryInspectionActive`
(`App.tsx:1353`) into `decideConversationAvailability`, which returns
`blocked("recovery_inspection", "wait_for_recovery_inspection")` and therefore `canSend: false` for
**whichever** workspace is selected. A grep for `recovery_inspection` outside the domain module and
its tests returns nothing: like `journey_lease_occupied` before this CR, the condition is computed
and never rendered.

### A correction to this CR's own Finding 3, at its source

Finding 3 said `runtimeBusy`'s two global sources do not gate Send, and that Send was "already
workspace-scoped through `conversationAvailability`". The first half holds. **The second half was
incomplete**: `conversationAvailability` is workspace-scoped in its *admission* input and global in
its `recoveryInspectionActive` input. Enumerating two global predicates and stopping there was the
error — there is a third, it reaches Send, and it is silent when it fires.

This does not change what CR140 shipped, and it is not a defect CR140 introduced. It changes what
CR140 may claim: **the Acceptance criterion that no refusal degrades to silence is met for every
refusal the admission type can produce, and is not met for `recovery_inspection`.** Stated here
rather than discovered at closure.

### Hypothesis, explicitly not yet fact

That `turnRecoveryBusy` is what refused D1B. The stuck settlement is measured and the global
mechanism is read from source, but the causal link needs the one observation only the Navigator
has: whether the screen showed nothing (consistent with `recovery_inspection`), a share sentence
(which would instead mean the share logic misfired), *"Finalizing turn…"* (the retained lease), or
*"Wait until the previous message is ready."* (the blocking journal record).

### Consequences for the sequence

D1's durable claim is **not yet collected**: there is one marked record, not two with intersecting
Pi execution windows. The sequence cannot continue past a stuck settlement, because the gate above
refuses every workspace regardless of grain.

Two observations are available in the stuck state and are worth more than resuming:

1. **CR132's abandonment offer**, owed since alpha.42 and never provocable because a hang cannot be
   scheduled. A settlement stuck past `ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000` should present
   *Stop waiting* naming the elapsed wait. Present means CR132's field evidence; absent means a
   CR132 defect, which is worth more than the rest of this script.
2. **Why a settlement hangs**, which CR132's own record lists as still unknown.

Restarting the app destroys the native registry and both observations, so the state was left
untouched pending the Navigator's reading.

## Status

Baseline recorded; the run is the Navigator's, since opening a Journey and sending a turn are GUI
actions. CR140 and RS024 stay open until D1 is read from disk and appended below.
