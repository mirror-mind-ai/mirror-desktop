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

**The refusal is self-erasing, and the record shows it.** After the hidden conversation was refused
and the Navigator landed on the workspace, the remember effect recorded *workspace* — which deletes
the key. That is truthful, since they really are at the workspace, but it means a conversation
refused for being hidden is also forgotten. Harmless here; worth knowing.

### An instrument error of mine, corrected

I first read `journey-preferences.json` **mid-startup** and got the previous launch's write
(mtime 08:28:04) while the current launch's write (08:28:32) had not yet landed. I reported a
mismatch with my own prediction on that basis. **The mismatch was my snapshot, not the behaviour**;
re-reading showed the file exactly as predicted. A snapshot taken during startup is not a
measurement of startup's outcome.

### The regression the check found — CR137 breaks a line of CR133's acceptance

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
