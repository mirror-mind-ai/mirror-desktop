[< RS016](index.md)

# CR093: Defend the Mirror Conversation Journey Binding

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr093-cr095-journey-binding-defense`

## Problem

On 2026-09-26 a live Mirror Desktop Conversation on Journey `mirror-desktop` stopped
synchronizing and never recovered, retrying until the Navigator reported it. The surfaced
reason was:

```text
synchronization_convergence_partial:turn-agent-run-2026-09-26T12:58:07.106Z:mirror_append_journey_mismatch
```

Two distinct defects combined.

**The Desktop retried a rejection that can never succeed.** `mirror_append_journey_mismatch`
is Mirror's bounded contract rejection, not a transient failure. Repetition cannot change its
outcome, yet the convergence routine kept attempting it and reported only a generic partial
convergence.

**The Desktop did not defend the binding it owns.** Something outside the Desktop rewrote the
`journey` column of the Mirror conversation the Desktop had provisioned. The Desktop kept
asserting its own authority correctly on every attempt and was rejected forever, with no
verification, no re-assertion and no diagnosis naming the actual divergence.

The cost was not only a stuck outbox. Two turns of that session had already been accepted
before the rewrite and were persisted under the wrong Journey, so Mirror's record of
`mirror-desktop` silently lost them while another Journey silently gained them.

## Evidence

Read-only inspection of production app data and the Mirror database on 2026-09-26.

Desktop authority was correct and consistent throughout. In
`dedicated-journey-conversations/mirror-desktop/threads/desktop-thread-mirror-desktop-18d8def4b1051920/generation-1.json`:

- `liveIdentity.journeyId: "mirror-desktop"`, `liveIdentity.mirrorConversationId: "792b9bf0"`.
- `reconciliation.authority.journeyId: "mirror-desktop"`.
- Turns 1 and 2 recorded `mirror.state: "committed"` at `12:35:35` and `12:45:29`.

The blocked turn sat at `phase: "outbox_enqueued"`, `revision: 4`, `updatedAt
2026-09-26T13:29:34.963Z`, with intact Pi evidence (`assistantEntryId: 848a0183`,
`entryCount: 51`). The outbox item asserted `journeyId: "mirror-desktop"` for
`conversationId: "792b9bf0"`.

Mirror's row for that conversation, however, read:

```text
id 792b9bf0 | interface nautilus_harness
journey  alissonvale-com     (expected mirror-desktop)
persona  product-designer    (expected empty)
title    Continue RS to Beta
```

`append_conversation_messages` compares `conversations.journey` with the request's
`journey_id` and raises `journey_mismatch` (`src/memory/storage/messages.py:63`), surfaced by
`run_explicit_mirror_append` as `mirror_append_journey_mismatch`.

The rewrite is timestamped in `runtime_sessions`, three writes inside the same 20ms:

```text
12:45:41.236879  __global_sticky_defaults__   journey=alissonvale-com  persona=product-designer
12:45:41.238746  __global_operating_mode__
12:45:41.255900  <desktop pi session row>     journey=alissonvale-com  persona=product-designer
```

That is exactly the side-effect sequence of `memory/skills/mirror.py::load()`: persist sticky
defaults, activate the operating mode, then call `bind_conversation_context()`, which at
`src/memory/cli/conversation_logger.py:262` runs `update_conversation(conv_id, persona=...,
journey=...)` against whatever open conversation is bound to the runtime session.

Two independent facts confirm the binding was correct before that moment: turns 1 and 2 were
accepted while asserting `mirror-desktop`, and a `journey mirror-desktop` listing taken at
`12:34` already showed this conversation under that Journey.

## Diagnosis

A Mirror Mode activation without an explicit Journey, inside a Desktop Pi session, rebinds
the Desktop's Mirror conversation to whatever Journey that activation resolves. The Desktop
registers `runtime_sessions[<pi session file>] -> <mirror conversation>` during provisioning,
which is precisely the link `bind_conversation_context` follows.

Three consequences matter for scoping.

**The trigger value is incidental.** The resolution order in `_resolve_defaults` is explicit
argument, then reception classifier, then sticky default, then keyword/embedding detection.
On this occasion it produced a two-day-old sticky `alissonvale-com`. It could equally produce
a detected Journey or `None`, and `update_conversation` writes `None` as readily as a slug.
Clearing the sticky default therefore does not close this hole — it only changes which wrong
value arrives.

**The guard already existed in this repository and was not carried forward.**
`scripts/log_mirror_conversation.py`, the older Mirror-mediated invocation bridge, does
exactly the right thing:

```python
if conversation.journey != args.journey_id:
    mem.store.update_conversation(conversation.id, journey=args.journey_id)
```

The current explicit append contract route
(`run_explicit_mirror_append` → `memory conversations append`) has no equivalent. The
protection regressed when append became an explicit validated contract.

**The Desktop already owns a legitimate write route.** `scripts/provision_mirror_conversation.py`
is Desktop-bundled code that already calls `mem.store.update_conversation(conversation.id,
title=..., journey=..., interface=...)`. Re-asserting the Journey binding requires no Mirror
core change and no new authority — only reusing a route the Desktop ships and already
executes at provisioning time.

Mirror core remains unavailable for modification. This CR is therefore deliberately scoped as
Desktop self-defense against an upstream behavior it cannot correct, not as a fix for the
upstream cause.

## Expected Behavior

The Desktop treats the Journey binding of a Conversation it provisioned as its own authority
and defends it.

Before delivering an outbox item, it verifies that the Mirror conversation still carries the
Journey the Desktop asserts. If the binding has drifted, the Desktop restores it and delivers
once, converging without Navigator intervention and without provider execution.

If a rejection cannot be resolved by repetition, the Desktop stops repeating it and presents
one actionable notice naming the actual divergence, instead of reporting a generic partial
convergence indefinitely.

## Proposed Scope

**Classify append rejections by whether repetition can change them.**

- Terminal contract rejections: `journey_mismatch`, `idempotency_conflict`,
  `malformed_request`, `unsupported_schema_version`, `limit_exceeded`,
  `duplicate_request_message_id`. These stop the retry loop and raise attention immediately.
- `conversation_not_found` needs its own decision: it may be resolvable by re-provisioning, or
  it may indicate a deleted Conversation that must not be silently recreated.
- Everything else keeps current transient-retry behavior.

**Verify and re-assert the Journey binding around delivery.**

- Add a bounded operation to the Desktop-bundled Mirror support scripts that reads the
  conversation's current `journey` and, when it differs from Desktop authority, restores it —
  the same write `provision_mirror_conversation.py` already performs.
- Wire it as a single conditional retry on `journey_mismatch`, following the existing shape of
  `run_pi_backed_mirror_append_with` / `should_retry_legacy_timestamp_compatibility`: attempt,
  detect the specific reason, repair once, attempt once more, then stop.
- Restrict re-assertion to Conversations the Desktop provisioned and still owns in its
  dedicated-Journey catalog. The Desktop must never move a Conversation it did not create.
- Decide whether `persona` and `interface` are re-asserted too, or only `journey`. The
  incident contaminated `persona` as well.

**Make the notice name the divergence.** The Navigator should read which Journey the Desktop
asserts and which one Mirror holds, not `synchronization_convergence_partial`.

**Detect drift early.** Consider one verification at Conversation hydration or turn admission,
so a rewritten binding is caught before the next turn is produced rather than after.

**Tests.** Cover the classification table, the single-repair-then-stop sequence, the
ownership restriction, the notice content, and a regression asserting that a rewritten
`journey` column converges without manual intervention.

## Considered and Not Proposed

**Dropping the `runtime_sessions` registration** would prevent the rewrite outright, since
`bind_conversation_context` would find no bound conversation. It is rejected as the primary
route: `runtime_sessions.get_or_create_conversation` is the Desktop's own provisioning and
recovery identity for a Pi session, so removing the registration would break Conversation
recovery to prevent a foreign write. If the Navigator later wants prevention rather than
healing, it needs its own CR and its own Conversation-identity design.

## Acceptance

- A Conversation whose Mirror `journey` has been rewritten converges on the next delivery
  attempt, with the already-accepted messages ending under the Desktop's Journey.
- `journey_mismatch` is attempted at most twice: once as found, once after repair.
- A terminal contract rejection produces one actionable notice naming the divergence and does
  not accumulate retry revisions.
- A Conversation the Desktop did not provision is never rebound.
- Pi JSONL is never written, and no provider execution occurs during recovery.
- The two-turn contamination shape from this incident is covered by a regression test.

## Exclusions

- No Mirror core change. `bind_conversation_context` and the sticky-default resolution order
  stay as they are; any core correction belongs in the Mirror repository and its release path.
- No writes to Pi JSONL and no synthesized Pi entries.
- No provider retry, fallback or model switching.
- No bulk reconciliation of historical Conversations whose Journey may already have drifted.
- No change to the append contract schema itself.

## Dependencies

Builds on the RS020 convergence routine (CR067), which currently owns the retry loop, and on
the CR062 model-free self-healing precedent. Related to CR063's diagnosis that synchronization
notices must describe durable evidence rather than generic state.

The upstream cause is registered as [RS022 / CR094](../rs022-mirror-core-debts/cr094-mirror-mode-activation-rebinds-desktop-conversation-journey.md).
This CR contains the symptom; that CR owns the defect.

## Decisions (2026-09-26)

The scope left three questions open. All three are settled here.

**`conversation_not_found` is terminal, and the Desktop never recreates the Conversation.**
Re-provisioning would manufacture a Conversation that Mirror deliberately no longer holds,
which is indistinguishable from an intentional deletion. The Navigator decides what a missing
Conversation means; the Desktop only reports it.

**Only the `journey` column is re-asserted.** `persona` was also contaminated in the incident,
but the Desktop holds no authoritative persona value for a Conversation and persona has no
role in the append contract. Re-asserting it would be inventing authority to fix cosmetics.
`interface` is likewise left alone; provisioning already sets it and nothing observed rewrites
it.

**Durable per-item retry suppression is deliberately not implemented.** The acceptance line
"does not accumulate retry revisions" is only partially met. With the repair in place the
rejection self-heals, so the infinite loop that motivated it no longer occurs for
`journey_mismatch`; for a genuinely terminal rejection the notice now appears on the first
failure instead of the second. Suppressing further attempts would need durable per-item
terminal state and a rule for clearing it on explicit Navigator retry. That is its own design
and belongs in its own CR rather than being smuggled in here.

## Implementation Evidence (2026-09-26)

Four layers, each with its own tests.

**Rejection classification** — `src/domain/mirrorAppendRejection.ts` is the single place that
decides whether repetition can change an outcome. It classifies the seven bounded Mirror
contract rejections plus the Desktop's two binding verdicts as `terminal_contract`, keeps
`mirror_append_journey_binding_repair_failed` transient because the repair route itself can
fail, and matches reason codes on word boundaries so `mirror_append_limit_exceeded_probe` is
not mistaken for `mirror_append_limit_exceeded`. It also owns the sentences shown to the
Navigator.

**Attention timing** — `src/domain/synchronizationAttention.ts` consults that classification
before the CR086 patience gate. The gate exists because a failure might self-repair; a bounded
contract rejection cannot, so it surfaces on first sight and even while a retry is in flight.
The `durableDebt` precondition is unchanged.

**Bounded repair** — `scripts/mirror_conversation_catalog.py` gains a `rebind-journey`
operation. `exact_conversation` was split so the repair path can resolve a Conversation
*without* requiring the Journey binding it exists to restore, via a new `owned_conversation`
helper; every other operation keeps the original precondition. The operation writes only
`journey`, re-reads to confirm, and reports `rebound` and `previousJourneyId`.

**Delivery wiring** — `src-tauri/src/main.rs` adds `should_repair_journey_binding`,
`repair_mirror_conversation_journey_binding` and
`run_mirror_append_with_binding_repair_using`. Ownership is proved by the existing
`validate_outbox_generation_authority`, which already requires the item's `conversationId` to
equal the `mirrorConversationId` recorded in the Desktop's durable thread authority; a failure
there becomes `mirror_append_journey_binding_not_owned` and no write is attempted. The retry
follows the shape CR061 established for legacy timestamps: attempt, detect the exact reason,
repair once, attempt once more, stop. `FnOnce` on the repair closure makes the single-attempt
bound a type-level guarantee rather than a convention. All three delivery call sites route
through it.

**Notice** — `App.tsx` renders the named cause above the raw reason code in both
synchronization notices, with a light/dark contrast rule for the new `sync-attention-cause`
line.

Incidental finding, not changed: `run_explicit_mirror_append` sanitizes Mirror's rejection
reason to lowercase ASCII with underscores before prefixing it with `mirror_append_`. The
classification depends on that sanitizer, so the two must stay aligned.

## Validation

- `npm test`: 178 files, 1103 tests green (was 172 / 1028 before this branch).
- `cd src-tauri && cargo test`: 200 passed, 3 ignored.
- `cargo check`: no warnings.
- `python3 -m unittest discover -s scripts/tests`: 13 tests green, including 8 new
  `rebind-journey` cases against a fake Mirror runtime.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

One real-runtime smoke test was run against the production Mirror checkout and database, on
the Conversation from the incident, whose binding was already correct:

```text
{"operation":"rebind-journey","status":"ok","journeyId":"mirror-desktop",
 "conversationId":"792b9bf0","rebound":false,"previousJourneyId":"mirror-desktop"}
```

The row was re-read afterwards and was unchanged. This proves the script loads the real
`MemoryClient`, resolves the real Conversation and returns the real contract shape — that the
fake runtime used in the unit tests matches Mirror's actual surface.

### Write-path proof against real Mirror (2026-09-26)

The branch that writes is the one that matters, and production could not be used to exercise
it. It was therefore reproduced end to end in a throwaway Mirror home with a real
Mirror-created schema, using the real runtime for every step, and deleted afterwards.

A Conversation was created with `interface=nautilus_harness` and deliberately bound to
`some-other-journey`, reproducing the 12:45:41 rewrite. Then, in order:

```text
A  conversations append  (asserting mirror-desktop)
   -> {"status":"rejected","reason":"journey_mismatch",
       "message":"Conversation belongs to a different journey."}

B  rebind-journey
   -> {"status":"ok","rebound":true,"previousJourneyId":"some-other-journey"}

C  conversations append  (identical request, retried once)
   -> {"status":"accepted","insertedCount":2,"existingCount":0,
       "journeyId":"mirror-desktop"}
```

That is the exact incident sequence and its repair, proven against Mirror's own append
contract rather than a stand-in. A second `rebind-journey` immediately after B returned
`rebound: false` and wrote nothing, confirming idempotency. `title`, `interface` and `persona`
were unchanged throughout.

What this does **not** cover is the Rust orchestration as a running process: ownership check,
script invocation, receipt parsing and the single bounded retry are proven by seven unit tests
at the logic level, but have never executed inside a built bundle.

New test coverage: 12 classification cases, 4 attention-timing cases, 7 Rust delivery cases,
8 Python script cases, and 5 wiring assertions pinning that every delivery route passes
through the defence, that ownership is proved before any write, and that only the `journey`
column is written.

## Dev Homologation (2026-09-26)

Run by the Navigator on the isolated Dev channel: bundle `ai.mirrormind.desktop.dev`, runtime
`~/.mirror-journeys/mirror-mind/mirror-dev` (Mirror 0.31.14, same append contract), database
`~/.mirror-minds/mirror-dev/memory.db`, backed up beforehand to
`backups/pre-cr093-homologation-20260926T115044.db`. Production was untouched throughout;
the Dev channel has its own identifier and app data, so Stable kept running alongside.

Journey `sandbox-pet-store`, thread `nautilus-thread-sandbox-pet-store`, generation 1, Mirror
conversation `ccd658ec`.

**Baseline.** One ordinary turn (`turn-agent-run-2026-09-26T14:57:09.468Z`) settled at rev 5,
outcome `completed`, 26 messages, outbox empty.

**Drift injected.** `conversations.journey` rewritten to `cr093-drift-decoy` by a bare column
write, reproducing what `bind_conversation_context` does. A deliberately non-existent slug was
used so no real Dev Journey could absorb the Conversation and so any residue would be obvious.
The trap was confirmed armed read-only: `mirror_conversation_catalog.py inspect` rejected the
Conversation with `conversation_unavailable`.

**Second turn.** `turn-agent-run-2026-09-26T15:01:02.568Z`.

Result:

| Criterion | Outcome |
|---|---|
| Journey binding | restored to `sandbox-pet-store` |
| Messages | 26 -> 28, both new messages under the Dev Journey |
| Turn journal | `settled`, `completed`, `recovery=complete`, **rev 5** |
| Outbox | empty |
| `cr093-drift-decoy` | absent from `conversations` and `runtime_sessions` |
| Conflict evidence | no record added (file held only pre-existing 2026-09-24 records) |
| `persona` / `title` / `interface` | unchanged |
| Navigator-visible notice | none |

The drifted turn closed in the same number of journal revisions as the clean turn before it,
which demonstrates in practice that the repair adds no retry revisions to the delivery.

### Ruling out the obvious confound

A Mirror Mode activation resolving `sandbox-pet-store` would also have restored the column, so
a passing result alone would not prove this implementation did the work. Two facts exclude it.

No row in the Dev `runtime_sessions` table was touched on 2026-09-26. Every Mirror-side path
that writes `conversations.journey` — `bind_conversation_context`,
`provision_mirror_conversation.py`, `log_mirror_conversation.py` — performs
`upsert_runtime_session` in the same call, which would have updated `updated_at`. None ran.

And `createMirrorRuntimePrompt` only prepends the Journey authority preamble; it does not
activate Mirror Mode.

The only remaining writer is the `rebind-journey` operation. The decision to write *only* the
`journey` column is what makes this attribution possible: it is the sole route that changes
that column without touching `runtime_sessions`.

### Not covered by this homologation

The ownership refusal (`mirror_append_journey_binding_not_owned`) was not exercised, because
staging a Conversation the Desktop does not own cannot be done through the GUI. It remains
covered only by unit tests.

## Finding: the repair leaves no trace of itself

Homologation surfaced a gap the implementation did not anticipate. The repair healed silently
and recorded nothing: no receipt, no journal entry, no log line. Attribution above was only
possible by elimination across `runtime_sessions`.

For a defensive mechanism that writes to the Mirror database, that is real debt. If the
upstream defect becomes frequent, the Desktop will keep repairing and nobody will know — the
symptom disappears while the cause stays invisible, which is how the original incident stayed
hidden for 44 minutes in the first place.

The correction is small and belongs in its own CR: record each performed rebind as bounded
durable evidence, with the previous and restored Journey, so repeated repair becomes a visible
signal rather than an archaeological finding. Not implemented here; recorded as a successor.

## Closure

The Navigator validated CR093 on 2026-09-26 after the Dev homologation above.

**Proportionality review: proportional.** The defect moved a Conversation between Journeys and
silently split one session's record across two, so a structural defence is warranted. The
delivery stays within that warrant: one pure classification module, one added condition in an
existing derivation, one bounded operation on a script the Desktop already ships, and one
retry wrapper following the shape CR061 established. No durable schema change, no new Tauri
command, no new authority, and no Mirror core change. Ownership reuses the existing
`validate_outbox_generation_authority` rather than inventing a second notion of ownership.

**Debt review: `follow_up`.** Two items, both recorded rather than absorbed:

- The repair records nothing about itself. Successor CR095.
- `mirror_append_journey_binding_not_owned` is covered only by unit tests; staging an unowned
  Conversation through the GUI was not possible. Accepted as a known limitation, not a blocker:
  the refusal is a guard that prevents a write, so its failure mode is a missed repair rather
  than a wrong one.

The upstream cause remains open as RS022 / CR094. This CR closes the symptom, not the defect;
Mirror core can still rewrite the binding, and the Desktop now heals it.

Commit, merge, publication and release remain separate Navigator decisions.

## Incident Note

The 2026-09-26 occurrence was repaired separately under explicit Navigator authorization: the
Conversation's `journey` and `persona` were restored, the runtime-session row was corrected,
and the stale global sticky Journey default was cleared, after a full database backup. That
repair is recorded here as evidence only. Under this RS's intake rules the emergency repair is
not the subject of this CR — this CR is the durable product correction that prevents the same
incident from recurring silently.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Capture only. No selection, Driver, Delivery, implementation, commit, push, merge, release
  or Beta promotion is authorized by this document.
- Any repair route this CR introduces must remain bounded, explicit and evidence-backed; it
  must not become a general permission for the Desktop to mutate Mirror records.
