[< RS018](index.md)

# CR046: Make the Conversation Surface Pi-Backed

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr046-pi-backed-conversation-surface`

## Problem

CR041 established complete read-only Pi transcript inspection and CR045 removed optimistic projection staging from native admission. Opening a Desktop Conversation still selects messages from a Desktop projection or its current Conversation Segment, however. This leaves relaunch presentation vulnerable to stale checkpoints, Segment-local truncation and unadmitted projection ghosts even though Pi JSONL already contains the authoritative active branch.

The same `JourneyConversation.messages` body currently mixes transcript content with Desktop-only metadata required for settlement, attachments, action evidence and synchronization receipts. Replacing the whole projection would discard useful sidecar state; trusting its messages would preserve a competing transcript.

## Expected Behavior

For every ready native generation, relaunch builds the visible user/assistant Surface from the exact active Pi JSONL branch. Desktop projection state contributes only compatible metadata and stable presentation aliases. Entries absent from Pi are omitted. Native entries absent from the projection remain visible.

An exact in-memory active stream remains the temporary live overlay while its process is active. Pi inspection never invokes or retries the provider. A malformed, missing or authority-mismatched Pi session fails visibly rather than falling back to a stale projection transcript.

Conversation Segments may still paginate historical rendering, but neither Segment-local messages nor Segment checkpoints define the current transcript body, completion or cumulative count.

## Impact

Relaunch after completed execution, projection lag or a pre-agent rejection shows the terminal-aligned transcript. Deleting or truncating derived message projections no longer erases native history, and projection-only ghosts no longer appear as executed turns.

## Plan Or Decision

### Approved Scope

1. Define a pure Pi-to-Surface projection
   - Convert inspected active-branch user and assistant entries into `ConversationMessage` values using native entry identity, visible text and native timestamps.
   - Preserve exact compatible Desktop aliases and user attachments only when reconciliation binds them to the same Pi entry.
   - Preserve Desktop-only Conversation metadata without treating projected message content as transcript authority.

2. Hydrate ready Conversations from Pi
   - Inspect the exact active generation session on restore for Journey-root and child Desktop Conversations.
   - Replace durable projection messages with the derived Pi-backed Surface before rendering.
   - Preserve an exact in-memory runtime Conversation during active streaming; inspection remains the relaunch and inactive restore path.

3. Demote Segment-local transcript authority
   - Load the complete compatibility projection as metadata instead of preferring the current Segment projection.
   - Keep Segment publication as compatibility output, but do not read Segment manifests or projections during normal opening.
   - Do not republish Segment-local messages as a prerequisite for opening.

4. Fail honestly and preserve compatibility
   - Omit projection-only optimistic ghosts.
   - Surface native-only entries even without reconciliation aliases.
   - Reject malformed or mismatched Pi inspection without provider retry or stale-message fallback.

### Likely Affected Files

- `src/domain/journeyConversation.ts` or a focused Pi Surface projector
- `src/app/journeyConversationStorage.ts`
- `src/app/App.tsx`
- focused domain, storage and source-integration tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- A stale or truncated Desktop projection renders the complete active Pi user/assistant history on inactive restore.
- Projection-only pending ghost messages are absent when Pi contains no matching entries.
- Native-only entries remain visible with deterministic Pi-derived message identity.
- Exact reconciled Desktop message aliases and selected attachment metadata survive when they bind to the same Pi entries.
- Journey-root and child Desktop Conversations use the same Pi-backed restore path.
- Current Segment projection content cannot replace or truncate the native transcript.
- Active in-memory streaming remains visible without waiting for disk reinspection.
- Missing, malformed or authority-mismatched Pi evidence fails closed and never invokes the provider.
- No Mirror Core, outbox, journal schema, CR038 or production-data mutation is introduced.

### Validation

- TDD for stale/truncated projections, projection-only ghosts, native-only entries, aliases, attachments and incomplete native input.
- Source/integration coverage for unconditional inactive Pi hydration and Segment demotion.
- Complete Rust and frontend suites, `cargo check`, TypeScript and production build.
- Roadmap, relative-link and diff checks.
- Stop for Navigator Validation before push, merge, publication, release, production repair or RS018 closure.

### Exclusions

- No new transcript database or Pi JSONL writer.
- No automated provider invocation, replay or implicit retry; an explicit Navigator-submitted DEV GUI turn is validation evidence only.
- No redesign of streaming event presentation.
- No CR038 composer-draft coalescing work.
- No Mirror delivery, journal or production Flip mutation.
- No sustained-use or production-shaped endurance claim.

### Reversibility

The projector is read-only and projection formats remain compatible. Reverting CR046 restores projection-backed rendering without rewriting Pi sessions, projections, Segments, journals or outbox items.

### Authority Boundary

The Navigator requested CR046, approved Driver `@alissonvale`, Delivery `refinement/rs018-cr046-pi-backed-conversation-surface`, focus, planning and implementation, and accepted Navigator Validation on 2026-09-18. Push, merge, publication, release, production mutation and RS018 closure remain separate decisions.

## Evidence

- `restoreConversation()` currently loads a current Segment projection before the complete dedicated projection.
- Pi transcript replacement currently runs only when no reconciled Nautilus turn exists and only for the Journey-root Conversation.
- `inspect_dedicated_pi_transcript` already validates exact Journey, thread, generation, Pi session and active-branch ancestry without Desktop projection authority.
- CR045 ensures attempts rejected before `agent_start` never enter Pi JSONL.

## Outcome

Implementation is complete and accepted by Navigator Validation.

A pure `projectPiBackedConversationSurface()` now replaces projected message content with every non-empty visible native user and assistant entry from the validated active Pi branch. Raw structured assistant output is normalized through the same deterministic presentation adapter used at live settlement. Native entry IDs provide deterministic fallback message identity. Exact reconciliation bindings may preserve stable Desktop aliases and user attachment metadata, but never projected content. Projection-only ghosts disappear, native-only and incomplete admitted user entries remain visible, and conflicting or malformed inspection evidence fails closed.

Inactive Journey-root and child Desktop Conversations now call `inspect_dedicated_pi_transcript` unconditionally after exact generation restore. An exact in-memory runtime Conversation remains the temporary streaming overlay. Live-send preflight reinspects Pi and rebuilds its staging base before adding the new optimistic pair, so loading durable metadata cannot reintroduce stale or Segment-local messages. Inspection failure produces a visible warning and stops before provider invocation.

`loadDedicatedJourneyConversation()` now loads complete compatibility metadata directly and never prefers or republishes the current Segment projection. Normal opening no longer reads Segment manifests. The retained historical-Segment action also reinspects Pi rather than replacing the Surface with combined Segment messages. Segment publication remains compatibility output only.

### TDD And Validation Evidence

- Projector coverage proves stale and ghost projection messages are replaced by ordered native entries.
- Native-only and incomplete admitted user entries receive deterministic Pi-derived identities.
- Exact reconciliation coverage preserves Desktop aliases and selected user attachments only for matching Pi entry IDs.
- Unbound ghost attachments are not transferred.
- Invalid inspection schema and conflicting metadata fail closed.
- Source integration coverage proves Journey-root and child restore use exact Pi inspection, active in-memory streaming is preserved, live-send staging is rebuilt from Pi and Segment projections cannot supply transcript content.
- Complete frontend suite: 815 passed.
- Complete Rust suite: 151 passed, 1 ignored; `cargo check` passed without warnings.
- TypeScript, production web build, roadmap consistency and diff checks passed.
- Interactive DEV validation on 2026-09-18 confirmed existing multi-turn Pi history, full relaunch reconstruction, one new explicit turn, post-turn relaunch, readable normalized output, child Conversation hydration and child Conversation relaunch.
- Interactive navigation exposed a transient cross-Journey sidebar leak: expanding a new Journey while its catalog loaded displayed entries from the previously collapsed Journey. The Journey switch now clears catalog and root-thread presentation state unconditionally before loading; focused tests and repeated GUI validation passed.

One provider turn was explicitly invoked by the Navigator during DEV GUI validation. No provider was invoked implicitly. No production app data, Mirror database or Mirror Core source was read or mutated. No push, merge, publication or release occurred.

### Navigator Validation

Accepted on 2026-09-18 after automated gates and guided DEV GUI validation. Acceptance includes the interactive defect correction that removed stale cross-Journey sidebar catalog presentation. This validation does not authorize production repair, push, merge, publication, release or RS018 closure.

### Proportionality Review

The implementation is proportional. It adds one pure read-only Pi-to-Surface adapter, routes inactive restore and send preflight through the existing exact inspection command, removes Segment reads from normal restore and corrects transient presentation isolation. It introduces no transcript store, durable schema, Mirror Core dependency or implicit provider execution.

### Debt Review

Decision: `no_action`.

Production-shaped crash/relaunch endurance, Pi compaction rehearsal, Mirror unavailability and production recovery remain explicit RS018 acceptance work. They are not hidden CR046 implementation debt and require separately authorized story slices.
