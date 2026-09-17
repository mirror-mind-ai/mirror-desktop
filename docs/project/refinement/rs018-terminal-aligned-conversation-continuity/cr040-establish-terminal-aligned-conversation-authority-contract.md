[< RS018](index.md)

# CR040: Establish the Terminal-Aligned Conversation Authority Contract

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr040-terminal-aligned-authority`

## Problem

Mirror Desktop has no single documented authority hierarchy for an agent Conversation. The Pi session, Desktop projection, turn journal, native invocation registry, Conversation Segments, Mirror append outbox and Mirror Conversation each preserve useful evidence, but several can currently prevent successor admission or recovery when another body disagrees.

Two normal-use incidents exposed the same structural weakness. Mirror synchronization debt became unrecoverable when an originating projection was rejected because redundant reconciliation classification had drifted. In Flip Podcast, a completed Pi response remained `projected` because a Segment-local message count was compared with a generation-wide harness checkpoint; the next turn was rejected before Pi started, and rejected attempts left pending ghost turns in the projection.

Without an explicit authority contract, repairing either symptom risks moving authority to another derivative body rather than simplifying the system.

## Expected Behavior

The project has one source-grounded authority map that names what each durable body owns, what it may block, how it is recovered and whether it is rebuildable. The target contract aligns with the proven terminal behavior: the Pi session owns transcript continuity, active native execution owns temporary occupancy, Mirror delivery is non-blocking debt, and Desktop projections plus Segments are derived views.

The contract is precise enough to divide migration into independently reviewable CRs without implementing a big-bang rewrite. Existing evidence remains preserved, and the current production incidents become explicit migration fixtures and acceptance scenarios.

## Impact

This contract prevents the next correction from becoming another local exception inside a distributed settlement path. It creates a stable basis for restoring the Flip Podcast Journey, simplifying successor admission and removing co-equal transcript authorities while retaining the Desktop capabilities that do not exist in the terminal.

## Plan Or Decision

### Approved Scope

- Inventory every writer, reader, validator and admission gate for the Pi session, invocation registry, turn journal, dedicated projection, Conversation Segments, Mirror append outbox and Mirror Conversation.
- Compare the Desktop lifecycle with the terminal Mirror logger, including its deliberate rule that logging failures never block Pi.
- Record current authority, desired authority, rebuildability, failure consequence and migration seam for each body.
- Define non-negotiable invariants for admission, completion, projection, segmentation, Mirror delivery and pre-agent rejection.
- Trace the stale Mirror outbox incident and Flip Podcast checkpoint regression through the authority map without copying private message content.
- Produce a reversible migration sequence and identify the follow-up CR boundaries required to change runtime behavior.
- Define the production-data recovery boundary for existing inconsistent generations without executing it.

### Affected Files

- `docs/architecture/app-architecture.md`
- a focused architecture record under `docs/architecture/`
- `docs/project/refinement/index.md`
- `docs/project/refinement/rs016-ongoing-product-improvements-and-adjustments/`
- `docs/project/refinement/rs018-terminal-aligned-conversation-continuity/`
- source files are inspected but not modified by CR040 unless a narrowly scoped characterization test is required to prove an undocumented contract

### Acceptance

- Every persisted Conversation body has exactly one stated responsibility and authority class.
- The map names every current path by which a derivative projection or synchronization body can block successor admission.
- The target contract states that a fresh durable Pi completion admits a successor independently of Mirror synchronization and presentation projections.
- Conversation Segments are explicitly presentation-only and cannot supply cumulative settlement counts.
- A rejected pre-agent invocation leaves no transcript entry or pending projection turn.
- Mirror delivery debt retains exact provenance but cannot block agent use.
- Existing healthy Conversations continue on their exact Pi session and generation without reset; migration is lazy, versioned and non-destructive.
- Completed turns with derived projection debt remain available, unadmitted projection ghosts are omitted, and missing Pi sessions preserve legacy history read-only rather than fabricating transcript identity.
- Existing data recovery is separated from ordinary runtime migration and requires explicit production mutation authority.
- Follow-up work is divided into reversible CR-sized migrations with observable acceptance and rollback boundaries.

### Validation

- Trace source call paths from `App.tsx` through Pi invocation, journal admission, settlement, projection persistence, segmentation and Mirror append.
- Trace native validators and file publication boundaries in `src-tauri/src/main.rs` and `src-tauri/src/turn_journal.rs`.
- Verify the terminal Mirror logger's non-blocking failure contract from released Mirror source.
- Cross-check the architecture record against redacted structural facts from the two production incidents.
- Run `git diff --check` and documentation link/path checks. Runtime test suites are not required unless CR040 changes executable code.

### Exclusions

- No runtime behavior change, provider invocation, production-data repair or schema migration in CR040.
- No deletion or acknowledgement of existing outbox items.
- No automatic normalization of authority, native-ID or checkpoint defects.
- No Mirror Core code, schema, queue, API or release changes. RS018 must use the currently released `memory conversations append` contract; any Desktop outbox remains a non-blocking compatibility transport only.
- No reopening RS017 or merging CR038 implementation into this Delivery branch.
- No commit, push, merge, publication or release without separate Navigator authority.

### Authority Boundary

The Navigator approved RS018, selected CR040, assigned Driver `@alissonvale`, selected Delivery branch `refinement/rs018-cr040-terminal-aligned-authority` and authorized local execution of this plan. Validation acceptance, commit, push, merge, publication, release and any production-data mutation remain separate decisions.

## Evidence

Read-only diagnosis on 2026-09-17 established:

- Mirror Desktop disables ordinary Pi extensions for its mediated runtime and performs explicit Mirror append after local settlement.
- The terminal Mirror logger intentionally swallows logging failures so they never block Pi conversation continuity.
- A retained generation-1 Mirror outbox item could not be retried because its projection parser rejected stale derived reconciliation classification.
- Flip Podcast generation 2 preserved a completed Pi response in the turn journal while its Desktop reconciliation remained `harness: pending`, `pi: committed`, `mirror: pending` with `checkpoint_regression`.
- The Flip harness checkpoint was generation-wide while the saved projection contained only the current Segment message count.
- Native journal admission validates every locally completed `projected` record against the Desktop projection before starting the worker; the failed validation was surfaced as `Could not start the local Pi worker`.
- Two rejected retries left pending user and empty-assistant pairs in the projection without matching journal admission.
- Restarting the app could not help because the disagreement was durable rather than process-local.

No production data was mutated during diagnosis.

Implementation evidence:

- `docs/architecture/terminal-aligned-conversation-authority.md` now inventories the control plane, Pi session, native registry, turn journal, dedicated projection, Conversation Segments, Mirror outbox and Mirror Conversation with current writers, readers, gates, failure consequences and target responsibilities.
- The architecture record separates control-plane, active-execution, agent-transcript, Desktop-metadata and delivery-debt authority classes and explicitly excludes presentation projections from authority.
- Current and target turn paths identify where optimistic UI, durable transcript and settlement certification are currently conflated.
- Admission, transcript, rejection, presentation and Mirror-delivery invariants are stated independently of implementation shape.
- The migration is divided into transcript characterization, successor admission, pre-agent staging, transcript derivation, delivery isolation, Segment demotion, historical recovery and final reconciliation removal.
- Navigator feedback fixed the runtime boundary: no Mirror Core change belongs to RS018. The Desktop will continue using the existing append CLI through a self-contained, non-blocking compatibility outbox until Core-owned delivery becomes a separate future concern.
- Existing Conversation migration is now classified explicitly: native-ready generations continue unchanged, derived debt is repaired without blocking, unadmitted ghosts are omitted, inactive partial attempts remain preserved, and legacy-only history stays read-only.
- `docs/architecture/app-architecture.md` links the target while stating that the current runtime does not yet conform.
- CR039 was promoted into RS018 / CR040 rather than implemented as an isolated retry patch. CR038 remains independent and preserved in its original worktree.
- `git diff --check`: passed.
- Relative-link validation across the six changed architecture and Refinement entry documents: passed.
- `npm run roadmap:check`: passed with `Mirror Desktop roadmap: READY`.

## Navigator Validation

Accepted by the Navigator on 2026-09-17 after two clarifications were incorporated: Pi JSONL is the sole transcript authority, and RS018 must work with the currently released Mirror Core through its existing append contract. Existing healthy Conversations continue on their exact Pi session; derived inconsistencies become repair debt rather than reasons to reset context.

## Proportionality And Debt Review

The delivered change is proportional: it records architecture, authority, migration and production-data boundaries without changing runtime behavior before transcript reconstruction is characterized. The document does not introduce another executable abstraction or duplicate durable state.

Debt decision: `no_action`. Runtime gaps named by the contract are intentional follow-up CR scope rather than debt hidden inside CR040.

## Outcome

Done. The terminal-aligned authority contract is accepted and becomes the governing direction for RS018. No runtime behavior, Mirror Core code or production data changed.
