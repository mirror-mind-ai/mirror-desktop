[< Update](../index.md)

# CR137 Field Verification — baseline and prediction

**Date:** 2026-10-12
**Build:** `0.2.0-alpha.45` + CR137, Dev channel
**Binary SHA-256:** `7529e05de01b0e3a339420281af820872ac33b96b9f99dbe6353a3baba87f193`
**Installed:** 08:21:33 local, over `714da8b4…` (alpha.45 as released, no CR137)
**Backup retained:** `/tmp/Mirror Desktop Dev-20261012-082133.app` (`714da8b4…`), hash-verified
against the installed app **before** it was removed, with `ps` re-checked immediately before the
copy. Production (`45b9add5…`, pid 28603) was not touched.

Written before the run, by the assistant, so the Navigator carries only the gestures.

## Baseline, read from disk at 08:2x

### The one fact that makes the first launch a test in itself

`journey-preferences.json` (mtime 2026-10-11 17:01:56) **does not contain
`lastConversationSelectionByJourneyId` at all.** This is the first launch of a build that reads it,
so the older-file path is exercised on this very launch rather than having to be simulated.

| | |
|---|---|
| `activeJourneyId` | `mirror-desktop` |
| `expandedConversationJourneyIds` | 5 Journeys, **including `mirror-desktop`** |
| `hiddenConversationIdsByJourneyId` | 2 entries under `mirror-desktop` |
| `lastConversationSelectionByJourneyId` | **absent** |
| Turn journal | 61 records (51 settled, 10 interrupted), 3 free slots |
| Settlement timings | 19 records |

### `mirror-desktop`'s conversations, and which gesture each one serves

| | Title | msgs (catalog) | Role in this check |
|---|---|---|---|
| visible | *Pensar sobre uma nova feature: journey…* | 26 | **the positive case** — and it carries a saved draft |
| visible | *New Conversation* | 0 | — |
| visible | *New Conversation #1* | 0 | — |
| 🚫 hidden | *New conversation - old* | 0 (12 on disk) | **the refusal case** |
| 🚫 hidden | *Generated handoff recovery probe* | 0 | second refusal case |

The 26-message conversation holds a **5-character composer draft, `"Sadas"`**, saved under its own
conversation key. That is the Navigator's own pre-existing data, and it makes acceptance line 4
checkable with no setup: restoring the selection must bring that draft back into view.

The catalog's `messageCount` is read from a cached file whose staleness is already captured
(CR146 item 5), which is why the disk count is given beside it. It does not affect this check.

## Prediction

**1. First launch — lands on the Journey workspace, and that is a PASS.** With no stored
coordinate, `resolveRestoredConversationSelection` returns `no_memory` and nothing is dispatched.
Landing on `mirror-desktop`'s workspace is the correct degrade for an older preference file. After
this launch the key should **appear** in the file, as `{}`.

**2. Positive — select the 26-message conversation, quit, relaunch.** Expect to land **inside it**,
with its own transcript, and with **`Sadas` in the composer**. Expect the preference file to then
carry `{"mirror-desktop": {"kind": "desktop_conversation", "conversationId":
"desktop-conversation-mirror-desktop-18d5cf4842b669b0"}}`.

**3. Refusal — select a hidden conversation, quit, relaunch.** A hidden conversation that is
selected is deliberately still rendered, marked, so selecting it is possible. Expect the relaunch to
land on the **Journey workspace**, not inside it: `conversation_hidden`. CR135 wins here; CR134's
route keeps winning where work is actually running.

**4. Nothing runs.** The journal stays at **61** and timings at **19**. A restore that started,
provisioned or activated anything would move one of them, which is the field counterpart of the
allow-list guard.

### Falsifiers — any one of these fails the check

- Landing inside a conversation while the sidebar shows a different one selected. That is the
  original defect, mirrored.
- Landing inside the conversation but showing the **Journey's** transcript. That is the
  catalog-before-dispatch ordering failing in the field, which is the specific risk the correction
  to my own earlier reading uncovered.
- Landing inside the **hidden** conversation.
- An empty composer while `Sadas` is still on disk.
- The journal or the timings ledger advancing without the Navigator sending anything.

## Optional — observing the deviation that was flagged for veto

Restoring reuses `expandJourneyConversations`, which **opens and persists** the Journey's
disclosure — state CR133 owns. `mirror-desktop` is already expanded, so this launch cannot show it.
To see it: collapse `mirror-desktop`'s conversation group while staying inside a conversation, quit,
relaunch. The group should come back **open**. That is the recorded deviation, not a defect, and
seeing it is the point of naming it.

## Result — all five acceptance lines met, in both directions, and one regression found

Navigator's report: *"(a) sim e sim; (b) no workspace; (c) não, mostrou tudo certo."*

### Against the prediction

| Predicted | Measured | |
|---|---|---|
| 1. First launch degrades to the Journey workspace | Confirmed. The key then **appeared** in the file | ✅ |
| 2. Restores the conversation, with `Sadas` in the composer | Confirmed by the Navigator; the stored coordinate is `desktop-conversation-mirror-desktop-18d5cf4842b669b0` and **that conversation's `generation-1.json` was written at 08:28:32**, this launch | ✅ |
| 3. A hidden conversation lands on the Journey workspace | Confirmed — `conversation_hidden` | ✅ |
| 4. Nothing runs | Journal **61**, timings **19**, both unmoved. Draft `Sadas` still on disk | ✅ |
| 5. No surface disagreement | *"mostrou tudo certo"* | ✅ |

**Acceptance line 4 was satisfied with no code**, as the investigation predicted: the draft returned
because the visible draft is already derived from the selection.

~~**The refusal is self-erasing, and the record shows it.** After the hidden conversation was
refused and the Navigator landed on the workspace, the remember effect recorded *workspace* — which
deletes the key.~~ **Superseded 2026-10-12** — see the correction at the end. The behaviour follows
from the code, but **the record never showed it**: the post-step-6 state had already been overwritten
before I read it.

### An instrument error of mine, corrected

I first read `journey-preferences.json` **mid-startup** and got the previous launch's write
(mtime 08:28:04) while the current launch's write (08:28:32) had not yet landed. I reported a
mismatch with my own prediction on that basis. **The mismatch was my snapshot, not the behaviour**;
re-reading showed the file exactly as predicted. A snapshot taken during startup is not a
measurement of startup's outcome.

### A regression INDICATED, not established — CR137 may break a line of CR133's acceptance

**Heading corrected 2026-10-12.** It read *"The regression the check found — CR137 breaks a line of
CR133's acceptance."* That claim is not earned; the discriminating evidence is missing. See the
correction at the end. What follows is the indication and the argument, both of which stand.

`expandedConversationJourneyIds` tells a story the Navigator did not report:

- baseline: `[builder-mode-evolution, soul-mode, **mirror-desktop**, mirror-ts-core, us1-rerun-…]`
- at the previous shutdown (08:28:04): **`mirror-desktop` absent** — the group had been collapsed
- now (08:28:32): present again, **appended last** — the position of a fresh `expand`, not a
  restored order

So the group was collapsed, and **the restore reopened it and persisted that**. This is the
deviation recorded in CR137's exclusions as *"a deviation to be vetoed"* — observed in the field,
with evidence rather than as a prediction.

It is more than a deviation. **CR133's acceptance says: *"Reload preserves expansion choices***
*without fabricating a run owner and without losing access to an active native process."* A
collapsed group coming back open is that line failing. CR137's own field check found CR137 limited
by work shipped earlier in the same Story — the third time in this session that a slice's validation
has met a defect in the slice itself.

**The straightforward repair is not available.** `expandJourneyConversations` cannot simply skip the
`expand` dispatch, because it abandons its own result unless the Journey *is* expanded
(`if (!expandedConversationJourneyIdsRef.current.has(ownerJourneyId)) return undefined`, on both the
success and failure paths). A read-only variant has to relax that guard too, in a function CR133's
sequential restore and CR134's route both depend on.

**And there is an argument that the behaviour is right and the criterion needs the exception.**
CR135's `partitionConversationVisibility` already renders a hidden conversation when it is selected,
for a stated reason: otherwise *"the list would deny the existence of the conversation the transcript
is showing."* A collapsed group holding the selected conversation hides it from the list completely
— the same family of defect, by a different mechanism. By that principle, opening the disclosure is
the correct behaviour and CR133's line needs an exception written into it, dated, with the
superseded text struck through.

**Recommended, not done:** keep the behaviour and correct CR133's acceptance at its source. Amending
another CR's shipped acceptance is a Workbench decision. **CR137 stays `in_progress` until that
decision is made**, because closing it would mean closing a slice that breaks a criterion still
written as unqualified.


---

## Correction (2026-10-12) — the field was still moving while I measured it

After this check was written and committed, the Navigator said: *"Depois que eu mandei o turno aqui,
eu percebi que não tinha validado sua sugestão de teste opcional. Aí fui fazer isso enquanto vc
preparava sua resposta nesse turno."*

They ran the **optional** gesture — collapse the disclosure, quit, relaunch — concurrently with my
reading. Four things in this document have to change, and one of them is a finding I did not earn.

### 1. My process error, which caused the rest

I wrote a prediction for the optional step and **never asked for a report on it**. So I inferred
from disk what I should have received as an observation. Every confusion below follows from that one
omission: a specified experiment with no specified report is an experiment whose result I have to
guess at.

### 2. The instrument error was worse than I said

I wrote that I had read the file *mid-startup*. The mechanism is right and the framing is too
flattering. **The Navigator was operating the app while I read it.** My two reads straddled their
actions, and I treated successive reads of a live, concurrently-mutated target as one consistent
observation. That is the general trap, and "don't snapshot during startup" is only its narrowest
instance.

### 3. The self-erasing refusal was never measured

I claimed *"the record shows it."* It does not. The state after step 6 — the hidden conversation
refused, the coordinate deleted — had already been overwritten by the optional relaunch before my
first read. The behaviour still follows from the code, which is why the claim is retained rather
than withdrawn, but it is **inference, not measurement**, and it was published as the latter.

### 4. The regression is INDICATED, and I cannot discriminate the cause

The expansion evidence is real: `mirror-desktop` was absent from
`expandedConversationJourneyIds` at the previous shutdown and is present now, **appended last**. But
the Navigator was in the app at that moment, so **a human click on the disclosure explains it
exactly as well as the restore does**, and an appended position is the signature of a fresh `expand`
dispatch from *either* source.

What the disk can and cannot settle:

- **It cannot settle it by write count.** The save effect fires on every dependency change and
  `mtime` records only the last write, so one timestamp cannot distinguish one cause from another.
- **No preferences write occurred after 08:28:32** (only `window-geometry.json`). So whatever
  reopened the group did so within ~8 seconds of launch — comfortably reachable by a human click.
- **One chain is suggestive but not decisive.** That conversation's `generation-1.json` was written
  in the *same second*, 08:28:32, which is the conversation-load effect running for the restored
  selection; and with the group collapsed no catalog would have been loaded, so a *restore* could
  only have succeeded by calling `expandJourneyConversations` itself. But a Navigator who clicked
  the disclosure open and then clicked the conversation produces the identical trace.

**So the finding is downgraded.** The argument for which way to resolve it — CR135's principle that
the list must not deny the existence of the conversation the transcript is showing — is untouched
and still stands on its own merits. What is missing is whether CR137 actually causes the reopening.

**One question settles it, and the Navigator's eyes are the only instrument:** on the relaunch after
collapsing the group, was `mirror-desktop`'s conversation list **already open**, and were they
**already inside** the conversation, *before clicking anything*?

**CR137 stays `in_progress` either way** — on the pending CR133 decision if the regression is real,
and on confirming the optional observation if it is not.


---

## Experiment B — designed so it does not depend on anyone's memory

The Navigator's answer to the discriminating question was *"eu não lembro, melhor refazer esse
teste"*, which is the right call. Rather than ask the question again, the experiment is redesigned
so that **no human recollection is load-bearing**.

### The design change that settles it

**The Navigator clicks nothing on the relaunch.** If the disclosure is open after a launch in which
no click occurred, no click can explain it. Their visual observation becomes corroboration rather
than the sole instrument, which is the inverse of Experiment A.

**And both reads happen with the app closed.** Experiment A's confusion came from my reading a live
target while the Navigator was still operating it. A closed app cannot move under the instrument.

### My process error, fixed in the protocol rather than promised against

Experiment A specified an optional gesture and **no report for it**, so I inferred from disk what I
should have received as an observation. Here the report is specified before the run, in the same
breath as the gesture, and the protocol has an explicit pause where I read the pre-state and confirm
the setup actually took.

### Why Experiment A could not have revealed this, and a correction to my own reasoning

I first thought the positive case *"never exercised the expand path."* **That is wrong.** The
restore effect reads `conversationCatalogs` from its closure on its single run, and at that moment
the map is empty — CR133's sequential restore is async and has not completed any Journey yet. So
`expandJourneyConversations("mirror-desktop")` **was** called in Experiment A.

The precise statement is narrower: what was never exercised is **`expand` against a *collapsed*
group**, where the dispatch is not idempotent. In Experiment A the group was already open, so the
expand changed nothing and persisted nothing. That is exactly why the run could not reveal the
conflict, and why the collapsed pre-state is the whole point here.

### Starting point, read at 08:46:24 with the app closed

| | |
|---|---|
| `lastConversationSelectionByJourneyId` | `{mirror-desktop: {desktop_conversation, …18d5cf4842b669b0}}` |
| `mirror-desktop` disclosure | **expanded**, position 5 of 5 |
| Hidden under `mirror-desktop` | 2 |
| Turn journal / timings | 61 / 19 |

### Prediction — three outcomes, each meaning something different

**Outcome 1, predicted: disclosure open, and inside the conversation, with zero clicks.** The restore
awaits `expandJourneyConversations`, which dispatches `expand` before loading; against a collapsed
group that is a real change and it persists. **This establishes the conflict with CR133's *"Reload
preserves expansion choices."***

**Outcome 2: disclosure still collapsed, landed on the Journey workspace.** The restore refused with
`catalog_unavailable`. No conflict with CR133 — but then **restoring silently does not work for a
collapsed Journey**, which is a worse defect than the one being investigated and would be a new
finding against CR137's own first acceptance line.

**Outcome 3: disclosure open, but landed on the Journey workspace.** The expand dispatched and the
catalog result was abandoned anyway — `expandJourneyConversations` returns `undefined` when its own
guard finds the Journey not expanded, and the ref it reads is assigned during render. This is the
worst case: both defects at once, and a bug in my slice rather than a conflict with CR133. Judged
unlikely, because `await waitForCatalogLoadingFeedbackPaint()` sits between the dispatch and the
guard precisely so a paint — and therefore the ref assignment — happens first.

**In all three outcomes the journal stays at 61 and the ledger at 19.** A restore that starts or
provisions anything would move one of them.

### Result

_(pending)_
