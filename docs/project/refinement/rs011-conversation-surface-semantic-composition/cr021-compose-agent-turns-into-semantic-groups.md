[< RS011 — Conversation surface semantic composition](index.md)

# CR021 — Compose agent turns into semantic groups

## Problem

The current Mirror Desktop agent turn presents live runtime activity and the assistant
answer as process-oriented regions while Mirror and Ariad surfaces are extracted into
separate expandable rows. The pieces are individually useful, but the turn does not yet
express a stable conversation model with explicit semantic authorship.

A chronological rendering of every event would preserve execution order but would keep
the experience close to a process log and fragment the consolidated response.

## Expected Behavior

An agent turn is composed by semantic role rather than chronological event order:

- `Agent Actions` contains human-readable descriptions of what the agent is doing.
- `System Surfaces` contains canonical Mirror and Ariad surfaces with their specific
  provenance, content, transport fidelity, and expandable presentation.
- `Agent Comments` contains the consolidated response addressed to the user.

The model must work for the live turn and for turns reconstructed from persisted
conversation data. It must not invent hidden reasoning, misattribute system surfaces to
the agent, duplicate content, or lose surface ordering contracts during extraction and
rendering.

## Impact

This CR establishes the semantic foundation required by the remaining RS011 interaction
and copy refinements. It affects the conversation domain model, live event projection,
persisted turn reconstruction, agent-message rendering, and System Surface placement.

Source exploration:

- [Conversation Surface Semantic Turn Model](../../explorations/conversation-surface-semantic-turn-model/index.md)

## Assessment Questions

- Which current Pi events and persisted fields authoritatively identify an action,
  canonical surface, and consolidated comment?
- How should legacy turns without explicit semantic grouping be projected honestly?
- Can the renderer group content semantically without changing persisted source records?
- Which Mirror and Ariad transport invariants need explicit regression coverage?
- Is `Agent Comments` a necessary visible heading, or is agent authorship already clear
  enough without it?

## Builder Assessment

The current renderer already has the necessary source evidence, but composes it in three
separate mechanisms:

- `LiveRuntimeActivity` owns live reasoning summaries, tool and skill operations, and
  surfaces extracted from tool output;
- `App.tsx` strips recognized Mirror/Ariad and mode blocks from assistant content, renders
  the remaining answer, and then renders linked imported activity outside the message
  article;
- persisted `JourneyConversation` records messages and imported Mirror activity, but do
  not persist the complete runtime tool projection.

CR021 should therefore introduce a presentation projection rather than a storage
migration. A live or retained latest turn can expose actions from its runtime projection.
A reconstructed historical turn exposes only semantic groups supported by persisted
message and imported-activity evidence; it must not fabricate missing tools or action
chronology.

Recognized Ariad surfaces and Mirror mode surfaces belong to `System Surfaces`. Unknown
or unlinked imported records remain in the existing imported-context disclosure instead
of being relabelled. Exposed Pi reasoning summaries may appear as user-readable action
copy, but hidden chain-of-thought is neither requested nor inferred.

CR021 establishes the group boundaries and stable semantic order. It does not yet invent
one-to-many action/tool ownership, automatic expansion, latest-turn compaction, or manual
disclosure rules; those remain CR022.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- CR021 is selected as the current focus and the Navigator explicitly authorized this
  planning pass. Planned status does not assign a Driver, choose Delivery, authorize
  implementation, or authorize push, publication, release, or installation.
- Tool-running expansion, historical-turn compaction, and automatic disclosure behavior
  belong to CR022.
- Consistent highlighted-block copy behavior belongs to CR023.
- Hidden model chain-of-thought must not be requested, inferred, stored, or presented as
  `Agent Actions`.
- Mirror homes, identity, credentials, Journey content, conversations, app data, and
  Nautilus Harness state remain outside destructive mutation.

## Implementation Authorization

The Navigator approved the plan and authorized implementation. Driver is `@alissonvale`;
Delivery is `refinement/rs011-cr021-semantic-turn-composition`.

## Proposed Plan

1. Add a pure `AgentTurnPresentation` projection that accepts the assistant message,
   linked imported activity, and optional exact runtime projection. It returns optional
   `agentActions`, `systemSurfaces`, and `agentComment` groups without mutating persisted
   records.
2. Classify only authoritative evidence:
   - exposed reasoning summaries and runtime operations become `Agent Actions`;
   - recognized Ariad and Mirror mode events become `System Surfaces`;
   - assistant content remaining after surface, mode, and speaker-signature extraction
     becomes `Agent Comments`;
   - unsupported imported event kinds remain in their existing imported-context route.
3. Centralize surface extraction and deduplication at the turn projection boundary.
   Preserve each canonical surface block verbatim, retain provenance, preserve source
   ordering within each authoritative stream, and suppress copies currently repeated
   inside tool output or assistant content. Do not manufacture a cross-source chronology
   where none is recorded.
4. Introduce an `AgentTurn` presentation component and replace the assistant-specific
   branch embedded in `App.tsx`. Render present groups as visibly labelled regions in
   fixed semantic order: `Agent Actions`, `System Surfaces`, then `Agent Comments`,
   regardless of event arrival order. Keep the speaker/persona header and message-level
   copy behavior intact.
5. Reuse the existing runtime-operation and imported-surface components behind the new
   groups. Limit CR021 changes to semantic containment, labels, ordering, and
   non-duplication. Preserve current operation status, argument/output sanitation, local
   link navigation, terminal outcomes, and surface expansion behavior.
6. Leave user messages, attachments, unlinked imported context, arrival state, composer,
   scrolling, settlement authority, and persistence schemas unchanged. Omit semantic
   groups for which no authoritative evidence exists; historical turns without runtime
   evidence show comments and any persisted surfaces rather than synthetic actions.
7. Add TDD coverage for the pure projection and rendered component:
   - live comment-only, tools-only, surface-only, and mixed turns;
   - semantic ordering despite chronologically interleaved runtime events;
   - exact surface content/provenance and cross-source deduplication;
   - persisted turns with and without linked surfaces;
   - persona signatures, empty comments, failures, cancellation, and legacy unknown
     activity;
   - accessible section names and unchanged user-message presentation.
8. Run focused semantic-turn, runtime-activity, imported-activity, and conversation tests;
   then run the complete frontend suite, production frontend build, and an isolated
   `Mirror Desktop Dev` validation with plain, multi-tool, Mirror-mode, and Ariad-surface
   turns.

## Likely Files

- `src/app/conversationTurnPresentation.ts` — new pure semantic projection
- `src/app/AgentTurn.tsx` — new assistant-turn composition boundary
- `src/app/App.tsx` — delegate assistant rendering to the turn component
- `src/app/LiveRuntimeActivity.tsx` — expose action-only rendering or accept projected
  surface suppression
- `src/app/ImportedActivity.tsx` — reuse surface rendering through a semantic variant
- `src/styles/app.css` — semantic group layout and accessible visual hierarchy
- `src/tests/conversationTurnPresentation.test.ts` — projection contract
- `src/tests/agentTurn.test.tsx` — semantic composition contract
- existing runtime projection and imported activity tests for regression coverage
- this CR document for evidence and Navigator validation

No persistence, Tauri, native runtime, updater, or Mirror-core file is planned. Any need to
change storage schemas or native ingestion stops implementation for a new scope decision.

## Proposed Acceptance

- Every assistant turn renders each available content type at most once and in the fixed
  order `Agent Actions` → `System Surfaces` → `Agent Comments`.
- `Agent Actions` contains only exposed human-readable runtime summaries and operational
  evidence; it never exposes or infers hidden chain-of-thought.
- `System Surfaces` preserves recognized Mirror/Ariad content verbatim, retains its source
  provenance and expansion behavior, and does not duplicate a surface found in both tool
  output and assistant content.
- `Agent Comments` contains only the consolidated assistant response after canonical
  surfaces, mode blocks, and persona signatures are removed from that presentation copy.
- Live and retained-latest turns use exact runtime evidence. Persisted turns project only
  available message and imported activity, without synthetic action history.
- Unknown or unlinked imported activity remains recoverable through the existing imported
  context presentation and is not falsely classified as a System Surface.
- Comment-only, actions-only, surfaces-only, mixed, failed, cancelled, and legacy turns
  remain readable without empty section shells.
- User messages, speaker/persona identity, attachments, copy actions, local links, runtime
  sanitation, settlement, and `Working…` → `Finishing…` → silence remain unchanged.
- Semantic regions have programmatic accessible names and preserve keyboard/focus behavior
  of nested details controls.
- Focused tests, the complete frontend suite, production frontend build, and isolated Dev
  validation pass before Navigator acceptance is requested.

## Exclusions and Follow-on Boundaries

- Action-to-tool ownership, running-tool auto-expansion, settled collapse, and historical
  turn compaction remain CR022.
- Unified copy controls inside every highlighted semantic block remain CR023.
- Persisting full historical tool traces is not introduced by CR021. If product validation
  requires action recovery after application restart, capture that as an explicit storage
  change rather than fabricating history in this projection.

## Implementation

Implemented the approved presentation-only semantic composition:

- added a pure `AgentTurnPresentation` projection that separates exact runtime actions,
  canonical system surfaces, remaining imported activity, and consolidated agent comment;
- centralized assistant-message, linked imported, and runtime-output surface collection,
  retaining source provenance and deduplicating exact semantic copies;
- added `AgentTurn` as the assistant rendering boundary with visibly labelled, accessible
  regions in fixed `Agent Actions` → `System Surfaces` → `Agent Comments` order;
- kept unsupported imported activity outside the semantic groups and preserved the
  existing unlinked imported-context boundary;
- suppressed centralized Ariad and Mirror mode surfaces from tool output while retaining
  sanitized non-surface tool output;
- delegated only assistant messages to the new component; user messages, multiline
  rendering, attachments, copy action, links, persona identity, and settlement behavior
  remain intact;
- added restrained region styling without implementing CR022 disclosure or CR023 copy
  behavior;
- introduced no persisted schema, native runtime, updater, Mirror-core, or data migration
  change.

Implementation commit:

```text
28b7fbe Compose assistant turns by semantic authorship
```

## Evidence

- The initial focused TDD run failed because `conversationTurnPresentation` and
  `AgentTurn` did not exist.
- 56 focused tests passed across semantic projection, agent-turn rendering, runtime
  projection, imported activity, conversation presentation, Markdown content, and copy
  behavior.
- The complete frontend suite passed: 651 tests across 119 files.
- `npm run build` passed with only the existing Vite chunk-size warning.
- `npm run tauri:build:dev` rebuilt the isolated application and DMG successfully.
- Bundle metadata confirms `Mirror Desktop Dev`, `ai.mirrormind.desktop.dev`, version
  `0.2.0-alpha.3`.
- The rebuilt executable is running as process `75560`, inode `161551792`.

## Navigator Validation

Pending in the isolated Dev bundle. Validate four assistant turns for `mirror-desktop`:
plain comment-only, multi-tool, Mirror-mode, and Ariad-surface. Confirm semantic ordering,
no duplicated surface, unchanged tool evidence, and continuous settlement through
`Working…`, `Finishing…`, and quiet idle.
