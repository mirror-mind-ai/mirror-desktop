[< RS016](index.md)

# CR146: Stop a Recovered Turn from Being Stored Twice

*Renamed 2026-10-11. The original title, ~~Stop Recovery from Asking the Question Twice~~, asserted a
symptom the Navigator does not have.*

**Status:** planned
**Driver:** —
**Delivery:** —

Found on 2026-10-11 by the restart experiment in CR145, which recovered an answer and damaged the
transcript doing it.

## Correction before anything else

I wrote that the Navigator sees their question twice. **They do not.** They scrolled up, twice,
including after a further restart, and the transcript reads correctly: one question, one answer.

I asserted a screen symptom from a file reading. `ConversationTranscript` applies **no** filter for
empty or duplicate messages, so a four-message state would render as four. The displayed
conversation therefore is not the stored one, and the defect is the divergence — not the symptom I
claimed.

**The file is not the screen.** This is the third time this session I over-read a durable artifact:
a truncated JSON field, a question that could not discriminate, and now a stored record read as a
rendered one.

## Friction

~~A turn whose process vanished was recovered after a restart. The answer came back. But the
conversation durably reads:~~

A turn whose process vanished was recovered after a restart. The answer came back and **the screen
is correct**. The stored conversation is not. It holds:

| # | Role | Size | |
|---|---|---|---|
| 1 | user | 353 chars | the prompt |
| 2 | assistant | **0 chars** | the placeholder written at admission |
| 3 | user | 353 chars | **the same prompt again** |
| 4 | assistant | 65,474 chars | the answer |

Messages 0 and 2 carry **identical content hashes**. Message 1 is the empty placeholder. The ids
say where each came from: `user-2026-10-11T…` and `assistant-2026-10-11T…` are the renderer's,
written at admission; `pi-f50e7acb` and `pi-491588d7` match entry ids in the Pi session file.

Written at `11:24:21` — by the most recent restart, so this is what the app stores *now*, not a
leftover from the first one.

## What is established, and what is not

**Established.** The stored conversation has four messages with a duplicated user turn. The
transcript filters nothing. The Navigator sees two. `projectPiBackedConversationSurface` rebuilds
the surface from the Pi session and binds Pi entries to harness messages through
`reconciliation.turns`, and **this turn's `pi` evidence is `{state: "pending"}`** — no
`userEntryId`, no `assistantEntryId` — so no binding existed to match the Pi entries to the
placeholder waiting for them.

**Not established.** Which write path produced the four-message file, and why the projection the
renderer displays contains two. Those are the same question from both ends and the investigation
should answer it once.

`dedicated-journey-conversations/mirror-desktop/threads/desktop-thread-mirror-desktop-18dd7a36acc7f288/generation-1.json`,
4 messages, 69,473 bytes, written `11:08:25`, twelve seconds after launch.

## Desired Outcome

A recovered turn fills the place that was held for it. The Navigator's question appears once.

## First Investigation

1. Establish why stored and displayed diverge — which of the four
   `projectPiBackedConversationSurface` call sites produced the persisted four, and what the
   displayed two come from. **This is the whole CR**; the rest follows from the answer.
2. Establish whether the binding can be made. The placeholder exists and the Pi entries exist; what
   is missing is `turn.pi.userEntryId`/`assistantEntryId`, never written because the turn never
   committed. Ask whether recovery should write that evidence before projecting, which would make
   the binding work and the duplicate never occur.
3. Decide whether a divergence between stored and displayed should be **visible**. The project's
   standing rule is to show a divergence rather than hide it, and here the store is silently wrong
   while the screen is silently right — the dangerous polarity, because nothing prompts a repair.
4. Decide what happens to the record already duplicated on this profile. **Forward-only is the
   likely answer** and should be said rather than assumed.
5. Establish whether this explains the catalog reporting `messageCount: 0` for a file holding four.
   The catalog was not rewritten at either restart.

## Boundaries

Not a change to recovery's decision to recover. The content route works, the screen is correct,
and both were the valuable findings. This is about the record disagreeing with them.

## First Investigation — answered 2026-10-12, against source and against the stored file

### 1. Why stored and displayed diverge — answered, except for one half, which is named

**Established: the stored four is not the output of any single function.** The proof is identity.
The `pi-` prefix is minted at exactly three sites, all inside `piBackedConversationSurface.ts`
(`:377`, `:448`, `:449`). The admission ids are minted at exactly two: `piTaskPacket.ts:86` for the
user message and `App.tsx:3167` for the assistant placeholder. The file therefore provably holds the
output of **two different producers**.

`projectPiBackedConversationSurface` builds its `messages` array **solely** from
`inspection.entries`, starting from `[]`, and returns `{...metadata, messages}` — it **replaces**
`metadata.messages` rather than merging. It also skips every entry with no visible text
(`!entry.visibleText.trim()`), so it cannot emit a 0-character message at all, and it cannot emit a
renderer id without a binding. The displayed two are its output, which is exactly why the screen is
right and the store is wrong.

**Not established: which save persisted the union.** Every TypeScript call site replaces — the
launch restore (`App.tsx:1945`), the send path (`:3140`), the compaction reprojection (`:5320`) and
the full-history load (`:5441`). The native side writes the candidate's messages for the
`lifecycle`, `admitted_pre_frontier` and `active_pre_frontier` modes.

**The hunt was bounded on purpose, and the reason it no longer blocks the work is in section 2:**
the repair makes the two producers agree on identity, after which *any* union of them is correct.
The producer stays unidentified rather than guessed at.

### A native identity-blind union, found while looking, and refuted as the cause

`merge_post_frontier_receipt_into_persisted` (`main.rs:9087`) has a branch for when the persisted
file holds no turn matching the authority — and in it, at `:9166`-`:9186`, it unions messages
**by `id`** and then sorts them **by `createdAt`**. That reproduces the observed file exactly,
**including its order**: the stored array is byte-for-byte what sorting those four by `createdAt`
produces, verified against the file.

**It is refuted as the cause of this file.** The mode requires a candidate turn whose `mirror.state`
is `committed` and a `checkpoints.mirror`, and it would have written both. The stored turn has
`mirror: {"state": "pending"}` and `checkpoints: {}`. Recorded as a refutation rather than dropped,
because it is a **real latent defect of the same shape** — a union keyed on identity, in a codebase
where identity is the thing that gets lost. It also becomes correct for free once section 2 is fixed.

### 2. Whether the binding can be made — yes, and the gap is exact

The projection has **two** routes from a Pi entry to a harness message, and this turn falls through
**both**.

| Route | Requires | This turn |
|---|---|---|
| `turn.pi.userEntryId` + `turn.harness.userMessageId` (`:273`-`:279`) | the turn committed | `pi: {"state": "pending"}` — never committed |
| CR089's `matchInterruptedTurnsByUserEntryId` (`:204`) | `close()` returns early when `closedWithAnswer` | the run closed **with** a 65,474-character answer |

CR089's route is also deliberately user-side only — *"the assistant side is deliberately left
unbound: the harness models one answer per turn while Pi recorded several messages"* — so even if it
matched, the answer would still arrive under a `pi-` identity.

**A turn that completed in Pi but never committed in the harness has no binding route at all.** That
is not an edge case; it is precisely the 2026-10-11 shape, and it is the whole defect.

### The causal chain, complete

1. The run loop died in silence — **CR147** — so the journal froze at `running` with no terminal
   evidence.
2. The journal-based recovery at `turnFinalizationCoordinator.ts:320` requires
   `terminalEvidence.piExecution` and throws `turn_journal_completed_evidence_missing` without it,
   so it could not run.
3. `turn.pi` therefore stayed `pending`, and no binding route was open.
4. The projection recovered the **content** correctly from the Pi session — which is why the answer
   came back and the screen is right — but under `pi-` identities.
5. Some save persisted the union of the admission pair and the projected pair.

**CR146 is a downstream consequence of CR147.** CR147 removed the cause going forward; this CR is
about the record not being corrupted when a turn completes without committing, for any reason.

### The repair already exists, and cannot reach the state that needs it

`turnFinalizationCoordinator.ts:320`-`:336` does exactly what this CR's Desired Outcome asks. It
fills the placeholder **in place** with `execution.assistantText`, keeping the renderer's own id,
then writes the execution evidence and commits the harness turn. No message is added. That is *a
recovered turn filling the place that was held for it*, already implemented.

**It is gated on evidence that the recovery paths do not produce.** Both CR145's reap
(`main.rs:5825`) and CR147's unwind path (`:7945`) adopt the terminal journal with
`empty_terminal_evidence()`, whose `pi_execution` is `None`; and the normal completion path sets
`pi_execution` only when the terminal state is `Completed`, never for `ProcessDied` (`:8346`). So a
turn recovered by any of those three routes still has no `piExecution`, still cannot reach `:320`,
and still produces this CR's shape.

**That is the finding that reframes the repair, and it is a gap CR147 did not close.** It is said
here rather than reopened there, because CR147 is closed. `terminal_pi_execution_evidence`
(`main.rs:7598`) needs only the run authority and a baseline leaf, reads the session file itself, and
**returns `None` when it cannot project a complete user-and-assistant pair** — so attempting it on
those paths is already bounded by its own refusal rather than by a new guess.

### 3. Whether the divergence should be visible — a reasoned departure from the standing rule

**Recommendation: make it impossible rather than visible, and add no renderer surface.**

The project's rule is to show a divergence rather than resolve or hide it. That rule is for when two
sources legitimately disagree and the Navigator must choose. Here they do not: the screen is right
and the store is simply wrong. A notice would alarm the Navigator about a transcript that is already
correct, which is the opposite of what the rule is for.

What the dangerous polarity does justify is a **diagnostic**, not a surface: a script under
`scripts/diagnostics/` reporting any stored conversation that holds an empty harness assistant
message for a turn which also owns a `pi-` prefixed assistant message. That is a named, specific
shape rather than a duplicate-content heuristic, which would false-positive on a Navigator who
genuinely asked the same thing twice.

**This is a departure from a standing rule and the Navigator may veto it.**

### 4. The record already duplicated — forward-only, confirmed

**Leave it.** The transcript reads correctly, so there is nothing for the Navigator to gain, and
editing their conversation file is a mutation that would need them to name the target. A manual
reclamation is not a repair. Said rather than assumed, as the capture asked.

### 5. Whether this explains the catalog's `messageCount: 0` — no, and the capture's premise is now stale

It does not, and **the capture's reasoning no longer holds**. It said the catalog had not been
rewritten at either restart. The catalog **has** been rewritten since — `catalog.json` mtime is
2026-10-12 15:03:33, from today's CR147 field-check turn — and this entry still reads
`messageCount: 0` with `updatedAt: 2026-10-11T12:43:22.008Z`, the generation's activation time,
which **predates the turn entirely**.

So it is not an un-refreshed leftover; it is a live staleness. The count is not recomputed from the
conversation file for an entry the Navigator is not in. That is the already-recorded
write-only-`messageCount` debt and it stays its own item.

## Plan

**Two slices, with the authority-touching change last and gated**, plus one recommended capture.

**Slice 1 — give the projection a route for a turn that completed without committing.** TypeScript
only.

- `src/domain/piBackedConversationSurface.ts`: a third binding route for a turn whose
  `harness.userMessageId` and `harness.assistantMessageId` are both present, whose `pi.state` is
  `pending`, and whose run window closed **with** an answer — binding **both** sides, which CR089's
  route deliberately does not. CR089's route is pinned by **not changing**: its own tests must pass
  untouched, and a source assertion keeps `closedWithAnswer` governing it alone.
- New tests in `src/tests/piBackedConversationSurface.test.ts` (21 today) driven by a **reduced
  fixture** reproducing the measured shape: a pending turn with a harness pair, one user entry, one
  assistant entry with text. The real 145 KB session is not used — it carries the Navigator's
  content and its size would make the fixture unreadable.
- A test pinning that with the route open the projection emits the harness ids, so a union by id
  **cannot** duplicate. That is what makes the unidentified producer harmless.

**Slice 2 — let a recovered turn carry the evidence its repair needs.** Rust, last because it
touches what CR145 and CR147 just shipped.

- `src-tauri/src/main.rs`: attempt `terminal_pi_execution_evidence` on the three paths that
  currently adopt an empty one — CR147's unwind path, CR145's reap, and the `ProcessDied` branch of
  normal completion — letting its own `None` be the refusal. **No new guess about whether an answer
  exists**; the function already declines when the session holds no complete pair.
- Characterised with a fixture session file on disk, asserting evidence is produced for a complete
  pair and `None` for a truncated or absent one.
- CR147's unwind contract is pinned by its existing wiring guard, which must pass unchanged.

**Recommended capture, not folded in:** the identity-blind union in
`merge_post_frontier_receipt_into_persisted`. Slice 1 makes it correct for this shape, but it
remains a union keyed on an identity that other failures can also lose. It is pre-existing, it is
not caused by this change, and it deserves its own acceptance.

**Acceptance.** For a turn whose Pi run completed but whose harness never committed: the stored
conversation holds exactly one user message and one assistant message for it, under the harness's
own ids, with the answer in the place that was held for it. CR089's interrupted-run behaviour is
unchanged. No existing record is mutated.

**Validation.** `tsc --noEmit` clean; vitest 2,033 plus the new cases; `cargo test` 314 plus the new
cases; `npm run tauri:build:dev` clean; control runs on every new guard. **Field verification is not
available by construction** — provoking it requires a turn that completes while its harness fails to
commit, which is CR147's defect, now repaired. The honest check is the negative half: a healthy turn
still stores exactly two messages under harness ids.

**Exclusions.** No mutation of the existing four-message record. No renderer surface for the
divergence. No change to CR089's route. The catalog `messageCount` staleness stays its own debt. The
save that persisted the union stays unidentified, and the repair does not depend on identifying it.
