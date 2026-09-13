[< RS016](index.md)

# CR029 — Restore responsiveness for long conversations

**Status:** in_progress

## Problem

As the conversation associated with the `mirror-desktop` Journey has grown, typing in the composer has become noticeably slow. Switching away from that Journey and returning to its long conversation has also become slow.

Diagnosis confirmed that conversation length causes excessive frontend work during draft updates and Journey restoration. The complete transcript is eagerly reprojected when top-level composer state changes, and visually collapsed historical action bodies are still constructed and mounted. Full-generation persistence transfer and validation add restoration cost but are not the primary bottleneck.

## Expected Behavior

- Composer typing remains responsive even when the selected Journey has a long conversation history.
- Switching back to a Journey with a long conversation completes within a usable and predictable interval.
- Rendering, projection, persistence, reconciliation and derived-state work scale only where the corresponding conversation data changes.
- Long-conversation rendering remains bounded without hiding or deleting durable history.
- Any optimization preserves complete conversation history, semantic turn composition, Steering evidence, exact Journey authority and restart behavior.

## Impact

Slow keystroke feedback interrupts prompt composition and makes the application feel unreliable during sustained use. Slow conversation switching weakens navigation between Journeys and suggests that continued conversation growth may produce additional responsiveness, memory or lifecycle costs.

## Plan Or Decision

CR029 was explicitly selected for diagnosis on 2026-09-13. The diagnosis establishes a frontend render-boundary root cause without selecting an implementation:

1. Composer draft state is owned by the top-level `App` component. Every keystroke calls both `setDraft` and `setComposerDrafts`, causing `App` and its inline conversation subtree to render again.
2. The conversation subtree maps the complete message history on every such render. It repeats surface extraction, mode extraction, speaker inference, semantic turn projection, terminal-action projection, Markdown parsing and linkification for historical messages whose source data did not change.
3. Historical action details are visually collapsed but are still constructed as React children and retained in the DOM. Terminal evidence therefore scales the mounted surface beyond the visible prose.
4. Returning to a Journey reads and transfers the complete generation projection, parses and validates it, then synchronously constructs the complete conversation surface. The parse cost is measurable but smaller than projection and component materialization.

Secondary scaling costs exist in per-message linear searches for owning reconciliation turns and exact terminal evidence. Across the full message map these searches can become quadratic. Draft persistence also schedules a bounded Tauri filesystem write after every text change, but it is small, asynchronous and does not explain why latency increases with conversation size.

The current evidence rules out conversation projection persistence, auto-follow scrolling and Steering recovery as the primary keystroke cause: the conversation object and `messages` dependency do not change while typing, and the affected production generation has no Steering evidence. These paths still require regression coverage because navigation and future active turns exercise them.

## Implementation Plan

The immediate correction is intentionally narrower than the app-wide continuity and storage architecture now recorded in [CV-008.DS-004](../../roadmap/cv-008-conversation-spaces/ds-004-multiple-conversations-per-journey/index.md). Execute it test-first in four slices:

1. **Establish representative performance contracts.** Add a deterministic synthetic fixture with at least 1,000 alternating messages, a 10 MB generation projection, semantic surfaces, terminal-action evidence and Steering evidence. Add render/projection counters that prove which immutable regions execute; use browser timings only for explicit performance validation, not as flaky pass/fail unit assertions.
2. **Isolate transcript rendering from draft updates.** Extract the inline conversation map from `App` into a memoized transcript boundary with stable inputs and callbacks. Split immutable historical rows from the active assistant turn so composer changes perform no historical message projection, while runtime updates continue to refresh the exact active turn.
3. **Index and memoize immutable presentation.** Build conversation-revision-scoped maps for linked activity, user-message-to-turn ownership, exact terminal evidence and Steering evidence. Memoize per-message semantic presentation and remove repeated linear searches and duplicate action-group projection without weakening evidence validation.
4. **Materialize historical detail on demand.** Historical comments and truthful action/surface counts remain visible, but collapsed action bodies and operation outputs are absent from the mounted tree until disclosure. Opening a disclosure renders the complete exact detail; closing it may release that heavy subtree while durable evidence remains unchanged.

After each slice, rerun the long-conversation fixture. If the agreed targets are still missed, stop and return evidence for a plan amendment. Bounded transcript windowing, segmented persistence and historical retrieval belong to CV-008.DS-004 or a separately governed follow-up; they are not silently introduced by CR029. Draft persistence remains unchanged in this CR unless post-isolation profiling proves it independently blocks the input target.

## Expected Files

- `src/app/App.tsx`
- `src/app/AgentTurn.tsx`
- `src/app/LiveRuntimeActivity.tsx`
- `src/app/terminalAgentActionEvidence.ts`
- `src/app/ConversationTranscript.tsx` or an equivalently bounded new transcript component
- `src/app/conversationTranscriptModel.ts` or an equivalently bounded pure projection/index module
- `src/tests/conversationTranscript.test.tsx` or equivalent focused coverage
- `src/tests/agentTurn.test.tsx`
- `src/tests/terminalAgentActionEvidence.test.ts`
- A synthetic long-conversation fixture/helper under `src/tests/` that contains no production conversation content
- This CR and the file-first Refinement Workbench status/evidence

Existing files outside this list may change only when a failing focused regression proves they participate in the diagnosed path; record that reason before widening scope.

## Acceptance

### Deterministic behavior

- Updating composer text does not execute the historical transcript component, semantic projection, Markdown parsing, surface extraction or action grouping.
- A runtime projection update refreshes the exact active assistant turn without reprojection of unchanged historical rows.
- Turn, activity, terminal-evidence and Steering lookup is indexed for the rendered conversation rather than searched once per message.
- A collapsed historical turn contains its comment and truthful detail counts but no operation argument/output subtree; opening it renders the complete authoritative actions and surfaces.
- Duplicate text, empty actions, persona signatures, Ariad surfaces, attachment provenance and Steering addenda retain their current semantic placement and content.
- Journey switching, auto-follow, local-reference navigation, message copy, restart recovery and active-turn settlement retain existing behavior.
- Persisted conversation schema and bytes, Pi JSONL, Mirror conversation records, Journey/thread/generation identity and exact run authority are unchanged.

### Measured responsiveness

Use an isolated `Mirror Desktop Dev` build (`ai.mirrormind.desktop.dev`) on recorded hardware, warm the target conversation once, then record at least 20 samples:

- composer input-to-paint p95 is at most 50 ms for both the diagnosed production-scale shape and the synthetic 1,000-message/10 MB fixture;
- return from another Journey to an already existing long conversation makes the recent transcript and enabled composer usable at p95 no greater than 750 ms;
- opening a historical detail disclosure begins presenting its content at p95 no greater than 100 ms;
- no sample produces a long-task regression attributable to processing unchanged historical rows during typing.

The deterministic no-rerender assertions are the primary CI contract. Timing acceptance is Navigator validation evidence tied to the recorded development build and machine, not a universal hardware guarantee.

## Validation Route

1. Write focused failing tests for draft-only render isolation, active-turn updates, indexed evidence/Steering selection and lazy historical disclosure before changing behavior.
2. Run the focused transcript, AgentTurn, terminal evidence, Steering, conversation presentation, auto-follow and restart suites.
3. Run the complete frontend suite, `npm run build`, `npm run roadmap:check` and `git diff --check`.
4. Build and launch only isolated `Mirror Desktop Dev`; never use or mutate the production conversation as a test fixture.
5. Validate typing, Journey-away-and-return, historical disclosure, active streaming, Steering presentation, local links and restart against both the synthetic fixture and the existing development channel state.
6. Record raw sample counts, p50/p95, build revision, fixture dimensions and machine description in this CR before requesting Navigator acceptance.

## Boundaries

- No persisted-history truncation, evidence deletion, automatic conversation split or silent generation restart.
- No reimplementation of Pi context calculation or automatic compaction; Pi remains the sole active-context authority.
- No persistence schema migration, segmented storage, transcript search system, pagination contract or general virtualization framework in CR029.
- No weakening of Journey, thread, conversation, generation, session, run, turn or message authority checks for performance.
- No use of production conversation contents in committed fixtures, screenshots or logs.
- No Driver, Delivery, implementation, push, merge, publication or release is selected by planning this CR.

## Driver And Delivery

- Driver: `@alissonvale`
- Delivery: `refinement/rs016-cr029-long-conversation-responsiveness`
- Navigator confirmed both coordinates and authorized implementation on 2026-09-13.

## Implementation Evidence

- `ConversationTranscript` now owns the complete message map behind `React.memo`; `App` passes stable transcript inputs and a `useCallback`-stabilized Journey-local path handler, so draft-only state updates do not enter the transcript.
- Each conversation row is independently memoized. Stable empty activity and Steering arrays prevent unchanged rows from losing memoization during active runtime updates.
- `buildConversationTranscriptIndex` constructs conversation-revision-scoped user-turn, Steering and exact terminal-evidence maps. `indexExactTerminalAgentActionEvidence` validates the same Journey, generation, run, turn and assistant-message coordinates while removing repeated turn scans.
- `AgentTurn` preserves historical comments and truthful action/surface counts but mounts historical `LiveRuntimeActivity` and system surfaces only while the disclosure is open. Precomputed action groups are reused instead of projected twice.
- A generated fixture supplies 500 turns, 1,000 messages, eight Steering records and at least 10 MB of exact terminal projection data without copying production content.
- The complete frontend suite passes with 715 tests across 131 files. `npm run build`, `cargo check --locked`, `npm run roadmap:check` and `git diff --check` pass; the existing Vite chunk-size advisory is unchanged.
- `npm run tauri:build:dev` produced the isolated `Mirror Desktop Dev.app` and development DMG under bundle ID `ai.mirrormind.desktop.dev` for Navigator validation; no user-channel artifact was built or installed.
- A supporting server-render probe over the unmodified 718-message production projection reduced initial static markup from 5,518,018 to 1,854,469 characters (66.4%) because collapsed historical operation bodies are no longer materialized. This probe did not mutate the projection and is not a substitute for browser input-to-paint validation.

Measured browser p95 acceptance and Navigator interaction validation in isolated `Mirror Desktop Dev` remain pending. The CR therefore remains `in_progress`.

## Evidence

Navigator report during continued use of Mirror Desktop:

- typing in the composer became slow in the long `mirror-desktop` Journey conversation;
- switching to another conversation and returning to the long `mirror-desktop` conversation also became slow;
- investigation should include other possible side effects of long conversations and implementation-level adjustment options.

Diagnosis used the existing production and isolated-development generation projections without modifying either. The production projection measured:

```text
projection bytes:                 5,092,026
messages:                                718 (364 user, 354 assistant)
message content characters:          693,216
reconciliation turns:                    364
terminal-action evidence entries:         59
terminal operations / summaries:     757 / 610
operation output characters:       2,343,985
```

A 25-iteration `vite-node` diagnostic exercised persisted JSON parse/validation and the same synchronous per-message projection and Markdown parsing paths used by the conversation map. It intentionally excluded React reconciliation, browser DOM creation, layout and paint, so projection results are a lower bound for keystroke work:

| Projection | Messages | Parse median / p95 | Render-projection median / p95 | Projected blocks | Action groups |
|---|---:|---:|---:|---:|---:|
| Production | 718 | 23.48 / 25.28 ms | 87.59 / 97.03 ms | 3,752 | 828 |
| Isolated development | 24 | 0.58 / 0.70 ms | 2.66 / 3.64 ms | 72 | 20 |

A separate React server-render diagnostic materialized the current message components, including collapsed historical details. After warm-up it required 1,106.51 ms and produced 5,518,018 HTML characters for production, compared with 69.57 ms and 182,208 characters for isolated development. Server rendering is not a browser input-to-paint measurement, but it confirms that the mounted component surface, not JSON parsing alone, dominates the size-dependent return path.

Code evidence:

- `src/app/App.tsx`: top-level draft state, per-keystroke draft updates, inline full-history `messages.map`, and per-user turn/evidence searches;
- `src/app/AgentTurn.tsx`: historical details construct `LiveRuntimeActivity` even while collapsed;
- `src/app/LiveRuntimeActivity.tsx`: action grouping, output sanitization, surface extraction and linkification occur while rendering operation descendants;
- `src/app/MessageContent.tsx`: message blocks are reparsed on each component render;
- `src/app/journeyConversationStorage.ts` and `src/domain/persistedJourneyConversation.ts`: full-generation transfer, JSON parse and authority validation on restoration.

## Outcome

Implementation and automated validation are complete under the confirmed Driver and Delivery coordinates. CR029 remains `in_progress` pending measured browser profiling and explicit Navigator validation in isolated `Mirror Desktop Dev`.
