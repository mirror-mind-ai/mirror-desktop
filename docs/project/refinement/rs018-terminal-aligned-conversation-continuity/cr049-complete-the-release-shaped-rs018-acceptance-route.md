[< RS018](index.md)

# CR049 — Complete the Release-Shaped RS018 Acceptance Route

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr049-release-shaped-acceptance`

## Problem

The [RS018 final acceptance review](acceptance-review-2026-09-18.md) confirms that CR040–CR048 deliver the authority model and pass deterministic plus guided interruption validation. The story's closure horizon still names composed release-shaped conditions that have only subsystem evidence: a real Pi-produced compaction, multi-turn Mirror outage and restoration, post-native/pre-delivery termination, concurrent live DEV Journeys and destructive copied-cache reconstruction.

Closing RS018 without either exercising those conditions or explicitly accepting documented substitutes would weaken the story's own completion contract.

## Expected Behavior

- The remaining conditions execute against isolated, private-data-free DEV state.
- Every mutable temporary path has a before inventory and backup or is generated disposable state.
- Mirror unavailability does not block successor admission.
- Restoring Mirror delivery settles exact self-contained debt without provider retry.
- Termination after native completion but before delivery settlement preserves transcript truth and relaunch continuity.
- Two different Journeys may execute concurrently within native capacity; the same Journey remains protected.
- Deleting copied Desktop projections and Segment files cannot lose Pi transcript content or block a successor.
- A real Pi-produced compaction is exercised, or the Navigator explicitly accepts the deterministic fixture as a substitute.
- Production app data, production Mirror state and Mirror Core source remain untouched.

## Isolation Design

CR049 must not reuse either production or ordinary DEV durable state. The planned sandbox has three independent boundaries:

1. **DEV app-data swap** — stop all Mirror Desktop DEV processes, atomically move `~/Library/Application Support/ai.mirrormind.desktop.dev` to a timestamped sibling backup, create a fresh directory at the canonical DEV identifier and publish an external swap receipt. The restore operation is idempotent and refuses to overwrite either side.
2. **Disposable Mirror home** — initialize generic template identity beneath `~/Library/Application Support/ai.mirrormind.desktop.rs018-rehearsal`, seed a separate SQLite database, create only private-data-free rehearsal Journeys and bind the fresh DEV app to that exact home and database. The released `/Users/alissonvale/mirror` runtime may execute; its source remains read-only.
3. **Redacted evidence directory** — record paths, hashes, sizes, entry IDs, phases and counts without prompt or assistant bodies. Runtime fixture data never enters Git.

A repository script will own `prepare`, `status` and `restore` for the app-data swap. It must reject symlinks, an active DEV process, missing receipts, production identifiers, destination collisions and divergent restore state. An interrupted rehearsal always restores ordinary DEV data before other project work resumes.

## Plan

### Phase 1 — Safety tooling

- Add a bounded sandbox coordinator with dry-run, prepare, status and restore commands.
- Add automated tests for refusal, idempotence, collision handling and exact canonical paths.
- Add a redacted inventory command that never reads or emits message content.
- Add a terminal-window watcher that accepts an exact Pi session file, baseline leaf and app PID; it observes only entry metadata and terminates the DEV app after a new terminal assistant leaf is durable.
- Do not add a runtime feature flag, user-channel fault path or production fault injection.

### Phase 2 — Private-data-free bootstrap

- Prepare the app-data swap and verify the receipt before launching.
- Initialize a generic `rs018-rehearsal` Mirror home from released templates and seed only that database.
- Create two isolated Journeys with explicit temporary project paths.
- Bind Mirror Desktop DEV through the normal Runtime Settings flow.
- Complete one explicit baseline turn and verify Pi transcript, empty compatibility debt and ordinary relaunch.

### Phase 3 — Mirror outage and restoration

- Checkpoint the isolated SQLite database, then make only the disposable database and its parent read-only. Mirror reads remain available while append writes fail.
- Submit three explicit short turns, one at a time. After each turn verify native completion, successor availability, exact Pi-backed rendering and increasing self-contained outbox debt.
- Keep the database read-only for the terminal-window phase.
- Restore original permissions from the sandbox receipt.
- Invoke only the explicit model-free synchronization route. Verify all exact debt settles, outbox count returns to zero and no provider invocation occurs during repair.

### Phase 4 — Post-native/pre-delivery termination

- Start the redacted watcher against the exact session and baseline leaf.
- Submit one explicit turn while delivery remains unavailable.
- Let the watcher terminate the DEV app immediately after a new terminal Pi assistant leaf is durable and before delivery can settle.
- Relaunch and verify the complete response appears once, no provider retry occurs, the Composer is available and the debt remains independently repairable.

The watcher result is accepted only when timestamps and durable phases demonstrate that the native leaf preceded process termination and no delivery acknowledgement preceded it. An indeterminate race is rerun; it is never interpreted as success.

### Phase 5 — Concurrent Journeys

- With isolated Mirror restored, submit one deliberately long explicit request in Journey A.
- While A is active, switch to Journey B and submit a second explicit request.
- Verify two distinct exact native leases, no same-Journey overlap, independent streaming and successful settlement in both Conversations.
- Relaunch and verify both transcripts reconstruct once.

### Phase 6 — Destructive copied-cache rebuild

- Stop the DEV app and inventory the isolated Pi sessions, thread/catalog authority, projections and Segment files.
- Back up, then delete only the sandbox's derived Desktop projection and Conversation Segment paths. Preserve Pi sessions, thread/catalog control-plane files, journal and outbox.
- Relaunch, verify exact Pi reconstruction and submit one explicit successor.
- Compare redacted native entry counts and IDs before and after; projection message content is not an oracle.

### Phase 7 — Compaction decision

The existing private-data-free fixture uses the exact characterized Pi compaction schema but is not produced by a live Pi process. Before execution, the Navigator must choose one route:

- **Recommended substitute:** explicitly accept the deterministic 50-turn compacted fixture plus parser, Segment and relaunch evidence as the compaction gate. This avoids paid token inflation whose only purpose is forcing an automatic threshold.
- **Real compaction route:** authorize a capped provider/model budget and generate a private-data-free Pi session until Pi itself emits compaction. Stop at the approved budget if compaction does not occur; do not infer success.

The Navigator selected the recommended deterministic substitute on 2026-09-18. The accepted compaction gate is the private-data-free 50-turn fixture plus exact parser, Segment and relaunch evidence; CR049 will not spend provider tokens solely to force an automatic threshold.

### Phase 8 — Restore and verification

- Stop all rehearsal processes.
- Record a final redacted inventory and preserve only review evidence.
- Restore ordinary DEV app data through the idempotent coordinator and verify its manifest before deleting sandbox app data.
- Remove the disposable Mirror home only after Navigator review.
- Run focused script tests, complete frontend and Rust suites, TypeScript, production build, roadmap, relative-link and diff checks.

## Files

Expected implementation files:

- `scripts/rs018_rehearsal_sandbox.mjs`
- `scripts/rs018_terminal_window_watch.py`
- script-focused tests under `src/tests/`
- this CR, the RS index and the acceptance review

Product runtime files should not change. If the rehearsal reveals a product defect, stop and capture a separate CR before changing behavior.

## Acceptance

1. Sandbox prepare/restore is tested, idempotent and leaves ordinary DEV data byte-for-byte inventoried.
2. All runtime and Mirror mutation is confined to the fresh DEV app directory and disposable Mirror home.
3. Three native-complete turns remain successor-eligible while Mirror append is unavailable.
4. Explicit model-free restoration settles exact debt without provider execution.
5. A process-level post-native/pre-delivery termination relaunches with one complete response and no retry.
6. Two different Journeys execute concurrently and reconstruct after relaunch.
7. Deleting only copied derived projections and Segments preserves native transcript identity and successor admission.
8. Compaction has either real Pi evidence or an explicit Navigator-approved deterministic substitute.
9. Ordinary DEV state is restored and production state is untouched.
10. Navigator Validation is explicit before CR049 or RS018 closure.

## Exclusions

- No production Flip Podcast inspection beyond already recorded evidence, repair or mutation.
- No production Mirror database or `ai.mirrormind.desktop` mutation.
- No installed Mirror source modification.
- No automatic provider calls; every real turn is submitted explicitly by the Navigator.
- No implicit retry during relaunch, cache reconstruction or Mirror repair.
- No push, merge, publication, release or RS018 closure.

## Reversibility

The sandbox coordinator preserves the complete ordinary DEV directory under a unique sibling path and records exact restore coordinates outside both swapped directories. Disposable Mirror and rehearsal app data are independently removable. Product runtime behavior remains unchanged unless a separately captured defect is authorized.

## Authority Boundary

The Navigator authorized Driver `@alissonvale`, Delivery `refinement/rs018-cr049-release-shaped-acceptance`, isolated sandbox execution, explicit provider submissions and the deterministic compaction substitute on 2026-09-18. Production mutation, push, merge, publication, release, Navigator Validation and RS018 closure remain separate decisions.

## Outcome

Resumed after CR050 Navigator Validation and integration on 2026-09-18.

CR050 now accepts the valid failed-assistant-leaf shape, renders one passive interruption notice and reconstructs after full relaunch. Ordinary DEV state was restored and verified before resumption. The next isolated sandbox run will use the catalog-supported `openai-codex/gpt-5.5` model.

Safety tooling is implemented and focused tests pass. Ordinary DEV app data is preserved under a verified 63-file backup with manifest digest `0a9cd312e4a8624c99a12a24bab367f77ccea879159e6fe9abcd794153df3e27`. A fresh canonical DEV directory, generic isolated Mirror home/database and two private-data-free rehearsal Journeys were created. Production state remains untouched.

The first explicit baseline selected `gpt-5.3-codex-spark`, which Codex rejected for the active ChatGPT account. Pi correctly persisted an admitted user followed by an empty assistant leaf with `stopReason: error`; the journal retained `process_died`. CR048 then rejected the valid inspection shape because the incomplete user was not itself the physical leaf, causing `runtime_read_failed` on restore. CR050 captures this product defect. The app was stopped immediately and no further rehearsal scenario ran.

The failed first run was archived with a 10-file redacted manifest, and ordinary DEV state was restored to the exact original 63-file digest before other project work resumed. The disposable Mirror home remains isolated for the resumed rehearsal.
