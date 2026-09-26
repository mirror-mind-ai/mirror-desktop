[< RS016](index.md)

# CR095: Record Each Journey Binding Repair as Durable Evidence

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr093-cr095-journey-binding-defense`

## Problem

CR093 gave Mirror Desktop the ability to restore the Journey binding of a Conversation it
provisioned, and it works: the Dev homologation on 2026-09-26 proved a drifted binding heals
inside the delivery with no Navigator-visible notice and no extra journal revisions.

It heals silently and records nothing. No receipt, no journal entry, no log line. During that
homologation the only way to attribute the restored column to CR093 rather than to a Mirror
Mode side effect was elimination: checking that no row in `runtime_sessions` had been touched,
because every Mirror-side writer of `conversations.journey` also upserts that table.

That is an unacceptable way to learn what a self-healing mechanism did. Two consequences
follow.

**Frequency becomes invisible.** The upstream defect (RS022 / CR094) is open and uncorrected.
If it starts firing often, the Desktop will keep repairing and the symptom will keep
disappearing. A defect that repairs itself silently is a defect nobody prioritises.

**The write itself is unaccountable.** This is the one place where Mirror Desktop writes a
column in the Mirror database outside its own provisioning path. A write with no record is
exactly the property that made the original incident take 44 minutes to notice: the rewrite at
12:45:41 left no evidence of itself either, and was only reconstructible because three
`runtime_sessions` rows happened to carry `updated_at`.

The Desktop should not reproduce the property it is defending against.

## Expected Behavior

Every performed rebind leaves bounded durable evidence naming what changed: which Conversation,
which Journey it was found under, which Journey was restored, and which turn's delivery
triggered it.

A rebind that was not needed records nothing — the evidence marks real repairs, not checks.

The evidence is readable without a database query, so a later decision about surfacing
repeated repair has something to read.

## Proposed Scope

- Add a bounded durable record file beside the outbox, following the existing
  `mirror-append-conflicts` pattern: JSONL, capped record count, staged write plus rename,
  best-effort so a failed write never fails the repair or changes the returned reason.
- Record only when `rebound` is true. Include `conversationId`, `previousJourneyId`, the
  restored `journeyId`, `itemId`, `runId`, `threadId`, `generation` and `recordedAt`.
- Expose a bounded read command, mirroring `list_mirror_append_conflicts`, so the evidence is
  reachable from the app rather than only from the filesystem.
- Keep the repair path's behavior otherwise unchanged: same reasons, same single retry, same
  ownership proof.

## Acceptance

- A performed rebind appends exactly one record naming the previous and restored Journey.
- A `rebound: false` outcome appends nothing.
- The record file never exceeds its cap, keeping the most recent records.
- A failure to write the record does not fail the repair, does not change the delivery outcome
  and does not alter the reason returned to the caller.
- The read command returns the records for one Journey without reading unbounded data.
- Existing CR093 behavior and tests remain unchanged.

## Exclusions

**No Navigator-visible notice.** Deliberate. A single repair is ordinary self-healing, and
CR086 established that self-repairing state must not become user-visible flicker. Surfacing
repeated repair needs a threshold and a notice design, and that decision should be made by
whoever designs that notice, reading this evidence. This CR makes the signal exist; it does not
decide how it is shown.

- No change to the Mirror database beyond the `journey` column CR093 already writes.
- No retention policy beyond the bounded cap.
- No Mirror core change; RS022 / CR094 still owns the upstream defect.

## Dependencies

Successor to CR093, recorded in its debt review. Reuses the bounded-record pattern established
by the `mirror-append-conflicts` infrastructure.

## Implementation Evidence (2026-09-26)

`src-tauri/src/main.rs`:

- `MIRROR_APPEND_REBINDS_FILE` and `MIRROR_APPEND_REBIND_MAX_RECORDS` alongside the existing
  conflict-record constants.
- `mirror_append_rebinds_path`, `read_mirror_append_rebinds` and
  `record_mirror_append_journey_rebind`, following `record_mirror_append_conflict` exactly:
  bounded JSONL, newest records kept, staged write then rename, and a signature that returns
  nothing the caller can fail on.
- `repair_mirror_conversation_journey_binding` records only on a performed rebind. The record
  is written after Mirror has confirmed the restore, so evidence never claims a write that did
  not land. The outbox path is resolved best-effort: if it cannot be resolved, the repair still
  proceeds.
- `list_mirror_append_rebinds` Tauri command, filtered by Journey and bounded by the same cap,
  registered next to `list_mirror_append_conflicts`.

The record deliberately carries no message content. It is provenance about a binding, not a
copy of the turn.

## Validation

- `cd src-tauri && cargo test`: 203 passed, 3 ignored (200 before this CR).
- `cargo check`: no warnings.
- `npm test`: 178 files, 1105 tests green (1103 before this CR).
- `python3 -m unittest discover -s scripts/tests`: 13 green, unchanged — this CR adds no script
  behavior.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

New coverage: three Rust cases — record shape with both Journeys named, `previousJourneyId`
recorded as null rather than omitted when the binding was absent, no message content in the
record, the bounded cap dropping the oldest records, and evidence paths kept distinct from
conflict evidence — plus two wiring assertions: that the confirmation is read before the record
is written, and that the recorder cannot fail the repair (no `Result` return, no `?` on the
outbox path).

The `rebound: false` silence is covered structurally rather than by a separate case: the
recorder is only reachable inside `if rebound`, which the wiring assertion pins.

## Dev Homologation (2026-09-26)

Same isolated Dev channel and Journey as the CR093 homologation: `sandbox-pet-store`, thread
`nautilus-thread-sandbox-pet-store`, generation 1, Mirror conversation `ccd658ec`.

A prerequisite had to be settled first. The Dev process running at the time had started before
this CR's code existed, and the timing was too ambiguous to assume it carried it. The binary on
disk was confirmed to contain `mirror-append-rebinds.jsonl` and the Navigator restarted the app,
so a missing record could only mean a defect rather than a stale binary. Restarting with the
drift already injected is safe: repair happens only during delivery, and the outbox was empty.

**Baseline.** `mirror-append-rebinds.jsonl` absent, outbox empty, 30-message Conversation at 28
messages, binding drifted to `cr093-drift-decoy`.

**Second turn.** `turn-agent-run-2026-09-26T16:58:12.076Z`. No Navigator-visible notice.

The evidence file appeared with exactly one record:

```json
{
  "schemaVersion": "1.0.0",
  "recordedAt": "2026-09-26T16:58:21.086Z",
  "conversationId": "ccd658ec",
  "journeyId": "sandbox-pet-store",
  "previousJourneyId": "cr093-drift-decoy",
  "itemId": "turn-agent-run-2026-09-26T16:58:12.076Z",
  "runId": "agent-run-2026-09-26T16:58:12.076Z",
  "threadId": "nautilus-thread-sandbox-pet-store",
  "generation": 1
}
```

| Criterion | Outcome |
|---|---|
| Record count | exactly 1 |
| `previousJourneyId` | `cr093-drift-decoy` — the divergence is named |
| Restored `journeyId` | `sandbox-pet-store` |
| Message content in record | none |
| Journey binding | restored |
| Messages | 28 -> 30 under the Dev Journey |
| Turn journal | `settled`, `completed`, rev 5 — unchanged from a clean turn |
| Outbox | empty |
| Decoy residue | none in `conversations` or `runtime_sessions` |
| Staged `.tmp` residue | none |
| Conflict evidence | no record added |

The confound exclusion from CR093 holds again and is now stronger: no `runtime_sessions` row was
touched on 2026-09-26, so no Mirror-side writer ran, and the record positively attributes the
restore to this delivery rather than leaving it to be inferred. This homologation is therefore
also the first direct confirmation that CR093's repair — not a side effect — performs the write.

Two failure shapes were watched for and did not occur: more than one record, which would mean
the defence ran more than once per delivery, and a record present while the Conversation stayed
in the decoy, which would mean evidence claiming a write that did not land.

## Closure

The Navigator validated CR095 on 2026-09-26 after the Dev homologation above.

**Proportionality review: proportional.** The delivery is one bounded record function, one
path helper, one read command and a three-line call site, all following the CR087
conflict-record pattern already in the file. No durable schema, no Mirror core change, no new
write to the Mirror database beyond the `journey` column CR093 already restores, and no change
to the repair's behavior, reasons or retry bound. The recorder cannot fail the repair by
construction rather than by discipline.

**Debt review: `follow_up`.** The evidence exists and is reachable, but nothing reads it. A
Navigator will only discover repeated repair by running the command or opening the file, which
in practice means nobody will. This CR deliberately stopped short of a notice, because
surfacing needs a threshold design and CR086 settled that self-repairing state must not become
visible flicker.

No successor CR is opened for that. The honest priority is upstream: RS022 / CR094 removes the
need for repair altogether, and building a notice for a defect we intend to eliminate would be
investment in the wrong place. If CR094 stays blocked and the records show repair becoming
routine, the surfacing decision should be reopened with that evidence in hand — which is
exactly what this CR makes possible.

Commit, merge, publication and release remain separate Navigator decisions.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- No commit, merge, publication or release is authorized by this document.
