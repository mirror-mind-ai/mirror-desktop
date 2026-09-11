[< RS011 — Conversation surface semantic composition](index.md)

# CR022 — Govern action, tool, and turn disclosure

## Problem

The new semantic turn model needs a predictable relationship between Agent Actions and
tool calls. Long-running tools must remain visible while they execute, but completed
operational detail should not keep the conversation looking like a permanent process
log. The same tension applies across turn history: current work benefits from visible
anatomy, while older conversation should privilege the consolidated exchange.

## Expected Behavior

An Agent Action may own one or many sequential or concurrent tools that serve the same
human-readable intent.

- If any child tool is `running`, its Agent Action is automatically expanded and every
  running tool preserves the current automatically open tool box behavior.
- When no child tool remains `running`, the Agent Action collapses automatically and can
  subsequently be expanded for inspection.
- Successful, failed, interrupted, and cancelled tools settle without leaving an action
  permanently forced open or misreporting active work.
- The complete `Agent Actions`, `System Surfaces`, and `Agent Comments` anatomy is visible
  for the active turn and latest completed turn.
- Earlier turns compact around Agent Comments while retaining a discoverable control that
  restores their actions, tools, and System Surfaces without data loss.

Disclosure is derived from authoritative runtime state, not timers or visual guesses.
Semantic groups remain composed by role rather than interleaved chronologically.

## Impact

This CR depends on the semantic foundation refined in CR021. It affects action-to-tool
grouping, live runtime state, expansion authority, completion and error settlement,
historical turn presentation, restart recovery, keyboard interaction, and persisted
conversation inspection.

Source exploration:

- [Conversation Surface Semantic Turn Model](../../explorations/conversation-surface-semantic-turn-model/index.md)

## Assessment Questions

- What exact event boundary assigns one or many tool calls to an Agent Action?
- Can multiple actions own running tools concurrently, and how is each action settled?
- Does manual expansion during execution survive automatic collapse after the final tool
  settles, or does runtime authority always return the action to collapsed state?
- When exactly does the previous latest-completed turn become historical and compact?
- What compact indicator communicates hidden action and System Surface counts accessibly?
- How are expansion choices reconstructed after restart without preserving stale running
  state?

## Builder Assessment

CR021 now supplies exact semantic turn groups, but `Agent Actions` still receives one flat
`RuntimeProjectionState`. Exposed reasoning summaries and operations remain interleaved in
`activityOrder`; each tool `<details>` is forced open only while its own status is
`preparing` or `running`. There is no action-level disclosure state and no turn-proximity
classification.

A conservative action ownership rule can be derived without inferring hidden intent:

- each exposed reasoning summary starts an action and owns following operations until the
  next exposed summary;
- an operation without a preceding exposed summary becomes its own fallback action, using
  the operation's existing human-readable name and argument preview rather than invented
  rationale;
- a summary without tools remains a valid action statement;
- multiple actions may be active concurrently, with active state derived independently
  from each action's child operation statuses.

The current frontend retains only one Journey runtime projection. Registering the next run
replaces the previous entry, and application restart loses the projection entirely.
Persisted `JourneyConversation` stores messages and imported Mirror activity but not tool
operations or exposed action summaries. Therefore older-turn recovery cannot honestly meet
this CR by presentation state alone.

The planned durable boundary is a versioned terminal action-evidence field in the existing
channel-local conversation projection. It records only already exposed summaries and tool
presentation evidence for the exact assistant message. It never records private reasoning,
never writes Mirror DB or the Pi session, and never persists `preparing` or `running` as a
restart state. Existing conversation schemas remain readable and upgrade only on a normal
subsequent save.

Turn proximity can be derived from message identity on every render: the exact active
runtime assistant turn and newest completed assistant turn receive full anatomy; earlier
assistant turns are historical. Manual disclosure choice is ephemeral UI state and resets
closed after restart.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- CR022 is selected as the current focus and the Navigator explicitly authorized this
  planning pass. Planned status does not assign a Driver, choose Delivery, authorize
  implementation, or authorize push, publication, release, or installation.
- CR021 has established the semantic turn model; CR022 must preserve that delivered
  authorship and ordering contract.
- This CR preserves existing provider-error and quiet-finalization settlement contracts.
- It must not hide a running tool, discard historical actions or surfaces, or restore a
  stale running state after restart.
- Highlighted-block copy behavior belongs to CR023.

## Implementation Authorization

The Navigator approved the plan, including channel-local retention of terminal action
evidence, and authorized implementation. Driver is `@alissonvale`; Delivery is
`refinement/rs011-cr022-action-turn-disclosure`.

## Proposed Plan

1. Add a pure action-group projection over CR021's exact runtime evidence:
   - an exposed reasoning summary starts an action and owns subsequent operations until
     the next summary;
   - each operation lacking a preceding summary becomes one fallback action labelled from
     its existing tool name and argument preview;
   - source order and operation identity remain unchanged;
   - no label or ownership is inferred from private reasoning.
2. Introduce pure action disclosure authority and an `AgentAction` component. An action is
   forced open while any child operation is `preparing` or `running`. When the last active
   child settles, the action automatically collapses. A close attempt while forced open
   has no effect; manual expansion during execution does not survive settlement.
3. Refactor tool disclosure into an explicit stateful boundary. Preparing and running
   tools remain forced open. Completed, failed, and interrupted tools — including active
   tools interrupted by run cancellation — start collapsed after settlement but can be
   manually reopened while their containing action is
   visible. No timer or animation event owns disclosure.
4. Add a pure turn-proximity classifier:
   - the exact active runtime assistant message is `active`;
   - the newest non-active assistant message is `latest_completed`;
   - earlier assistant messages are `historical`.
   Active and latest-completed turns show full semantic anatomy. Historical turns always
   show `Agent Comments` and hide available actions and System Surfaces behind one
   accessible disclosure such as `Show turn details · 2 actions · 1 surface`.
5. Add versioned terminal action evidence to the channel-local persisted
   `JourneyConversation` projection and advance its schema additively. Capture evidence
   under the exact Journey, generation, run, turn, and assistant-message authority before
   successful or interrupted projection persistence. Preserve tool arguments and
   sanitized output already shown to the user, plus exposed summaries and source order.
6. Normalize persisted evidence before writing: no `preparing` or `running` status may
   survive as durable state. Successful operations remain `completed`; active operations
   at cancellation or failure become `interrupted` or `failed` according to existing
   settlement semantics. Persist neither manual expansion state nor hidden provider
   reasoning.
7. Parse existing conversation schemas without synthetic evidence. On restore, use exact
   persisted evidence only when its Journey, generation, turn, run, and assistant message
   match the conversation reconciliation record. Invalid or stale evidence is rejected
   without hiding Agent Comments or weakening conversation recovery.
8. Feed live exact evidence first and matching persisted terminal evidence second into
   CR021's semantic projection. Preserve surface extraction/deduplication and keep System
   Surfaces outside Agent Actions. A historical turn with no legacy evidence reports only
   the recoverable groups it truly has.
9. Add TDD coverage for:
   - summary-led sequential and concurrent tool ownership;
   - fallback actions before or without summaries;
   - independent concurrent action activity;
   - forced-open preparing/running transitions and automatic collapse at settlement;
   - manual reopen, failed/interrupted tools, cancelled-run settlement, and no stale open
     state;
   - active/latest-completed/historical classification as new turns begin;
   - compact detail counts and keyboard/screen-reader disclosure;
   - additive persistence, exact-authority restore, legacy schemas, invalid evidence, and
     restart with terminal-only statuses;
   - CR021 semantic order, quiet successful settlement, and running-tool visibility.
10. Run focused action/disclosure/persistence/component suites, the complete frontend
    suite, and the production frontend build. Rebuild only `Mirror Desktop Dev` and
    validate a multi-action concurrent turn, successful settlement, failure/cancellation,
    a following turn that compacts the previous history, manual recovery, and restart.

## Likely Files

- `src/app/agentActionProjection.ts` — action ownership and active-state derivation
- `src/app/actionDisclosureState.ts` — automatic/manual disclosure authority
- `src/app/turnProximity.ts` — active/latest/historical classification
- `src/app/AgentAction.tsx` and `src/app/AgentTurn.tsx` — action and turn disclosures
- `src/app/LiveRuntimeActivity.tsx` — reusable operation rendering under action ownership
- `src/app/conversationTurnPresentation.ts` — live/persisted evidence precedence
- `src/app/App.tsx` — exact evidence capture and turn-proximity inputs
- `src/domain/journeyConversation.ts` — terminal action-evidence model
- `src/domain/persistedJourneyConversation.ts` — additive schema parsing
- `src/styles/app.css` — compact and expanded disclosure hierarchy
- focused new tests plus existing runtime, persistence, settlement, and CR021 regressions
- this CR document for implementation evidence and Navigator validation

No Mirror DB, Pi session, updater, release, Journey registry, or native Tauri command change
is planned. If exact durable evidence cannot be attached within the existing projection
settlement authority, implementation stops for a new plan decision.

## Implementation Evidence

Implemented on `refinement/rs011-cr022-action-turn-disclosure` in commit `a2b489f`.

- `agentActionProjection.ts` applies the approved summary-led ownership rule and honest
  operation fallback labels without reading hidden reasoning.
- `actionDisclosureState.ts` gives preparing/running activity forced-open authority and
  returns disclosure to collapsed manual control after settlement. `LiveRuntimeActivity`
  hosts the action and nested tool disclosure components so both boundaries share the
  same exact runtime projection.
- `turnProximity.ts` classifies the active, latest-completed, and historical assistant
  turns. Historical `AgentTurn` rendering keeps comments primary and uses one native
  `<details>` control with action and surface counts.
- Conversation projection schema `0.8.0` additively retains terminal action evidence.
  Capture occurs before successful or interrupted projection persistence; restore accepts
  only exact Journey, generation, run, turn, and assistant-message authority. Legacy
  `0.5.0`–`0.7.0` projections remain readable.
- Live evidence takes precedence over matching persisted evidence. Persisted active
  operation and summary states normalize to terminal `failed` or `interrupted` states;
  ANSI is removed from retained tool output. Manual disclosure state is never persisted.
- No Mirror DB, Pi session, Mirror memory, native Tauri command, updater, release, or
  Journey registry mutation was introduced.

Automated evidence on 2026-09-11:

- initial focused CR022 and semantic-regression suites: 67 tests passed across 10 files;
- the complete frontend suite passed before validation with 667 tests across 123 files;
- `npm run build`: passed;
- `npm run tauri:build:dev`: passed, producing `Mirror Desktop Dev`, bundle ID
  `ai.mirrormind.desktop.dev`, version `0.2.0-alpha.3`;
- validation exposed excessive vertical stretching of completed tool rows inside an
  expanded action; commit `ccad538` constrained nested grid rows to their content size;
- spacing-focused validation passed with 32 tests across 3 files and the isolated Dev
  bundle was rebuilt and relaunched;
- final complete frontend suite after the correction: 668 tests passed across 123 files;
- final validated Dev executable inode: `161557403`.

## Navigator Validation

On 2026-09-11 the Navigator confirmed that every requested Dev scenario passed:
multi-action and tool disclosure, automatic settlement collapse, manual recovery,
historical-turn compaction, terminal evidence after restart, quiet success, and
failure/cancellation inspection. The Navigator also accepted the compact completed-tool
spacing correction discovered during validation.

## Proportionality and Debt Review

The implementation is proportional to CR022: it adds a presentation projection, explicit
disclosure authority, turn-proximity classification, and one additive local persistence
field rather than changing Pi, Mirror, native commands, or Journey authority. Native
`<details>` controls preserve keyboard and assistive-technology behavior without a custom
interaction framework. The spacing correction is a local grid-sizing constraint, not a
new layout subsystem.

No new technical debt is recorded. The `0.8.0` schema remains backward-readable through
`0.5.0`, stale evidence is rejected independently of conversational content, and manual
UI state is intentionally ephemeral. CR023 remains the explicit owner of semantic block
copy behavior; no part of that scope was pulled into this delivery.

## Outcome

CR022 is closed as `done` with Driver `@alissonvale` and Delivery
`refinement/rs011-cr022-action-turn-disclosure`. No push, merge, publication, release, or
installation was performed. RS011 remains active because CR023 is still captured. No next
Change Request is selected by this closure.

## Proposed Acceptance

- Exposed summaries own only subsequent tools up to the next exposed summary; unclaimed
  tools receive honest fallback actions without invented intent.
- Sequential and concurrent child tools retain identity and source order. Multiple actions
  can be active concurrently without sharing disclosure state.
- Any action with a preparing or running child is forced open, and every preparing/running
  tool box remains open. Settling the last active child automatically collapses the action
  and its terminal tool details.
- Users can reopen settled actions and individual tool boxes with keyboard or pointer.
  Manual opening during active execution does not override the required collapse after
  settlement.
- The active and newest completed assistant turns show complete available `Agent Actions`,
  `System Surfaces`, and `Agent Comments` anatomy.
- Earlier turns prioritize `Agent Comments` and expose one accessible detail control with
  truthful action and surface counts. Expanding it restores every available action, tool,
  and System Surface exactly once.
- Exact terminal action evidence survives a normal app restart through the channel-local
  conversation projection. Durable evidence never restores `preparing` or `running`, and
  manual disclosure state is not persisted.
- Legacy turns without action evidence remain honest and readable; no synthetic action or
  count is created. Invalid or mismatched evidence is rejected without weakening exact
  Journey, generation, run, turn, or message authority.
- System Surfaces retain CR021 provenance, fidelity, deduplication, and semantic placement.
  Hidden chain-of-thought is never requested, persisted, reconstructed, or displayed.
- Successful settlement remains `Working…` → `Finishing…` → silence. Failed, cancelled,
  and interrupted evidence remains inspectable without forcing historical turns open.
- No destructive migration, timer-based disclosure, stale running state, or new native or
  Mirror-core mutation is introduced.
- Focused tests, the complete frontend suite, production frontend build, and isolated Dev
  validation pass before Navigator acceptance is requested.

## Explicit Storage and Privacy Boundary

The planned projection schema stores the same exposed tool arguments, sanitized outputs,
and action summaries already visible in Mirror Desktop so historical detail can be
recovered. This duplicates some evidence that may also exist in the local Pi session, but
it remains inside the isolated channel's application data and is attached only under exact
turn authority. Approval of this CR plan must explicitly accept this local retention; it
does not authorize exporting, publishing, or writing the evidence into Mirror memory.
