# Delivery Story Plan — CV-002.DS-004

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Conversation and Mirror Context Parity

## Objective

Make the conversation visible in Nautilus the canonical conversation actually continued by Pi and Mirror for the active Journey, with pre-generation Journey/identity/persona/mode context, Pi-aligned context-window usage, visible Pi-owned compaction, and recoverable durable reconciliation across the Harness projection, exact Pi branch and mapped Mirror conversation.

## Child Work Packages

- `CV-002.DS-004.TS-1` — Canonical Live Conversation Contract
- `CV-002.DS-004.US-1` — Conversation Continuity
- `CV-002.DS-004.TS-2` — Mirror Context Load Verification
- `CV-002.DS-004.TS-3` — Ego and Persona Routing Parity
- `CV-002.DS-004.TS-4` — Operating Mode Parity
- `CV-002.DS-004.TS-5` — Context Window and Auto-Compaction Parity
- `CV-002.DS-004.US-2` — Context and Mode Parity Review
- `CV-002.DS-004.TS-6` — Three-Body Conversation Reconciliation Contract
- `CV-002.DS-004.US-3` — Observable Three-Body Turn Commit
- `CV-002.DS-004.US-4` — Resume External Pi Activity in Nautilus
- `CV-002.DS-004.US-5` — Reconcile Mirror-Only Updates into Pi
- `CV-002.DS-004.US-6` — Three-Body Conversation Parity Review

## Scope

This Delivery Story will:

1. Define a versioned live-conversation identity that relates the Nautilus Journey conversation, the Pi session and, when applicable, the selected Mirror conversation.
2. Make that identity explicit at the frontend/backend invocation boundary instead of deriving continuity independently in multiple places.
3. Establish one canonical execution transcript for each live Journey conversation and a deterministic rule for creating, continuing, branching, importing and restarting it.
4. Ensure a follow-up command continues the transcript represented by the visible Nautilus chat without replaying the full chat in every prompt.
5. Replace the temporary dual reset bridge with lifecycle behavior derived from the canonical identity.
6. Verify that active Journey, identity, ego/persona and operating-mode context are loaded before response generation through Mirror-owned behavior.
7. Project Pi-aligned context usage from provider usage, the versioned Pi model catalog and the exact local session; use Pi's conservative `chars / 4` estimate only for explicitly hydrated pre-provider transcripts.
8. Preserve continuity after compaction and represent unknown, retry, failure and interruption states honestly.
9. Validate Mirror, Builder, Explorer and Soul transitions and boundaries through paired terminal/Nautilus runs.
10. Keep exactly one Mirror logging owner and add a correlated durable acknowledgment/recovery path.
11. Incrementally project supported external turns when the exact mapped Pi branch advances while Nautilus is idle.
12. Detect mapped Mirror-only advancement without mutating Pi.
13. Reconcile eligible Mirror-only turns only through explicit atomic branch/hydration transitions.
14. Prove the three-body experience through a single checkpointed aggregate review.

## Non-Goals

- Concurrent runs or a per-Journey process registry; those belong to `DS-009`.
- Silent continuous Mirror-to-Pi synchronization or unattended conflict resolution.
- A second identity, persona, Journey, mode, token-counting or compaction engine in React or Rust.
- Importing arbitrary hidden context or resending all local/imported history as prompt scaffolding.
- Persisting secrets, provider credentials, private reasoning summaries or arbitrary environment variables.
- Inferring skill or mode activation from ordinary tool reads.
- Reproducing unrelated Pi TUI/session-browser features.
- Direct Pi internal-class integration unless the supported JSON/session boundary and a narrow supported query have first been proven insufficient.

## Architectural Decisions to Establish

### 1. Canonical conversation identity

Introduce a versioned contract, provisionally `LiveConversationIdentity`, with at least:

- `journeyId`;
- Nautilus conversation id;
- Pi session id or supported Pi session reference;
- optional Mirror conversation id;
- lifecycle generation/branch identity;
- origin (`new`, `continued`, `mirror_import`, `restart`);
- timestamps needed to reject stale mappings.

The contract must be persisted with the Journey conversation through a backward-compatible schema migration. Existing `0.1.0` files must still load and receive a deterministic mapping only when continuity can be proven.

Pi's persisted session is the authoritative execution/context transcript. The local Nautilus conversation is its user-facing projection. Mirror remains authoritative for Mirror conversation records and semantic context. A shared string is not proof that the three agree.

### 2. Import, reload and restart semantics

Before implementation, characterize the supported Pi session format/API and current Mirror logging path.

- If a selected Mirror conversation already carries a trustworthy Pi-session association, continue that association.
- If it does not, create an explicit branch/import operation using a supported session boundary and record the new mapping.
- Never silently claim that imported Mirror history is in live model context when it is only rendered locally.
- Restart creates a new lifecycle generation and archives/detaches the prior Pi session; local state changes only after backend success.
- Failed preparation leaves the previous conversation and mapping intact.

### 3. Invocation and durable logging ownership

`start_pi_invocation` will receive the resolved live-conversation identity instead of rebuilding `nautilus-<journey-id>` independently. `createMirrorRuntimePrompt` continues to carry only the current natural-language command; history comes from the canonical Pi session.

Characterize whether Mirror runtime or the current `log_mirror_message` bridge owns durable user/assistant writes. Keep exactly one durable owner per message. Do not delete the bridge until paired evidence proves replacement coverage.

### 4. Mirror context verification

Journey, identity, persona and mode are Mirror-owned. Verification must use observable pre-generation evidence such as explicit skill load, Ariad/Mirror surface, structured operation, or session record. The UI may project this evidence but must not duplicate the routing logic.

### 5. Context usage and compaction

Extend the runtime contract only with authoritative data:

- context tokens;
- model context window;
- percentage when calculable;
- `unknown` immediately after compaction when Pi reports usage as unknown;
- compaction start/end, trigger/reason, retry, abort and failure when exposed.

Consume provider usage from Pi JSON events and restore the latest valid usage asynchronously from the exact mapped local Pi JSONL. Resolve fixed context windows from the versioned Pi model-catalog snapshot. For an explicitly hydrated transcript before any provider usage exists, apply only Pi's conservative `chars / 4` heuristic and label the result as hydrated pre-provider context. Do not launch Pi at startup, after a run or in the foreground solely to inspect context.

Context usage and compaction projection remain runtime/session state, separate from `ConversationMessage`, imported activity, provider reasoning summaries and durable assistant text.

## Implementation Sequence

### Phase A — Characterization and canonical contract

Covers `TS-1`.

1. Capture sanitized multi-turn fixtures for:
   - a fresh deterministic Pi session;
   - a continued Pi session;
   - a selected Mirror conversation;
   - a restarted session;
   - pre/post-compaction session state.
2. Document current ownership across:
   - `JourneyConversation.id`;
   - `ImportedConversationActivity.sourceConversationId`;
   - `nautilus-<journey-id>` Pi session id;
   - Mirror logging session/conversation ids.
3. Add contract tests before production changes.
4. Add the versioned identity and backward-compatible persisted-conversation migration.
5. Add a Tauri prepare/query boundary that resolves or rejects the live mapping atomically.
6. Make invocation and restart consume the resolved identity.

Checkpoint: the Harness can display or diagnose which exact Pi/Mirror conversation a Journey will continue, and refuses ambiguous continuity rather than silently diverging.

### Phase B — Visible multi-turn continuity

Covers `US-1`.

1. Add failing tests proving turn two depends on turn one through the Pi session, not prompt replay.
2. Reconcile local commit timing:
   - user message is staged for the run;
   - assistant text is committed once terminal success is reached;
   - cancellation/failure never fabricates a completed assistant turn;
   - persisted local projection and Pi transcript cannot advance independently without a recoverable state.
3. Define explicit behavior for Mirror reload/import into a live Journey.
4. Replace the temporary restart assumptions with generation-aware restart behavior.

Checkpoint: after relaunch, a follow-up command uses the same conversation visible before relaunch; after restart, it does not use the archived transcript.

### Phase C — Journey, identity, persona and operating modes

Covers `TS-2`, `TS-3` and `TS-4`.

1. Characterize paired terminal/Nautilus events for Journey context and each Mirror operating mode.
2. Preserve natural-language invocation and Mirror-owned routing.
3. Add structured projection only for observed evidence absent from the current event model.
4. Test that:
   - Journey context is loaded before the answer;
   - persona signature/voice matches terminal behavior when routing occurs;
   - ego-only answers remain unsigned;
   - Builder activation does not imply implementation consent;
   - Explorer routes mutation across the Explorer/Builder boundary;
   - Soul prohibits project mutation and routes operational requests to Builder;
   - required Ariad blocks remain byte-for-byte preserved.

Checkpoint: paired runs have no material context, persona or mode-boundary divergence.

### Phase D — Context window and Pi-owned compaction

Covers `TS-5`.

1. Add sanitized fixtures for context usage and each observed compaction terminal path.
2. Extend `AgentStreamEvent` and runtime projection with context/compaction events.
3. Restore usage from the exact local Pi JSONL when available, resolve the configured model window from the versioned Pi catalog, and limit `chars / 4` estimation to explicitly hydrated pre-provider transcripts.
4. Render compact context status and ordered compaction activity separately from assistant messages.
5. Preserve terminal-latch behavior for compaction operations and the overall run.
6. Verify continuity on the next command after automatic compaction.

Checkpoint: Nautilus and Pi report the same context state for the same session, and Pi—not Nautilus—performs compaction.

### Phase E — Three-body commit and external Pi projection

Covers `TS-6`, `US-3` and `US-4`.

1. Characterize the Pi extension logging lifecycle and Mirror runtime-session mapping, including background assistant logging and truncation.
2. Add versioned per-body checkpoints and correlated turn/run identities.
3. Expose or query a positive Mirror durable outcome and make retries idempotent without model invocation.
4. Observe only the exact mapped local Pi JSONL and fast-forward supported external user/assistant turns after the last proven checkpoint.
5. Reject truncated, in-progress, stale or divergent session tails without mutating local chat.
6. Persist refreshed projections atomically and keep operational/private channels out of `ConversationMessage`.

Checkpoint: a normal Nautilus turn reaches all three bodies once, partial commit is recoverable, and terminal continuation of the exact Pi branch appears once in Nautilus.

### Phase F — Explicit Mirror-only reconciliation

Covers `US-5`.

1. Detect mapped Mirror conversation advancement after the last reconciled checkpoint.
2. Classify eligible ordered turns, duplicates, consolidated/truncated records and conflicts.
3. Render an inert difference preview without changing Pi context.
4. Require explicit Navigator approval for initialize, fast-forward or branch/hydration.
5. Archive/create the Pi generation atomically and retain the prior mapping when preparation fails.
6. Persist source provenance and new checkpoints so the same Mirror update cannot be applied twice.

Checkpoint: Mirror-only advancement is visible automatically, Pi remains unchanged before approval, and successful reconciliation produces one explicit supported branch.

### Phase G — Aggregate three-body parity review

Covers `US-2` and `US-6`.

1. Execute the full test guide against one checkpointed Journey identity across Nautilus, terminal Pi and Mirror.
2. Record sanitized evidence and all accepted differences.
3. Run automated frontend/Rust suites and production build.
4. Complete Navigator validation, debt review and Done checkpoint at Delivery Story level.

## Acceptance Behavior

```text
Given a Journey with a persisted live-conversation identity and at least one completed turn
When the Navigator sends a follow-up command from Nautilus
Then Pi continues the exact mapped session represented by the visible chat
And Mirror loads the active Journey and applicable identity/persona/mode context before generation
And Nautilus shows only authoritative context usage and Pi-owned compaction state
And assistant text remains separate from runtime operations and summaries
And relaunch, compaction and explicit restart preserve the documented continuity boundary
And no duplicate Mirror message is durably recorded.
```

```text
Given a selected Mirror conversation that cannot be proven to map to the active Pi transcript
When the Navigator attempts to continue it
Then Nautilus requires or performs an explicit supported branch/import transition
And does not silently present local history as live model context.
```

```text
Given the mapped Pi or Mirror conversation advances outside Nautilus
When Nautilus refreshes reconciliation state
Then exact same-branch Pi turns are projected incrementally once
And Mirror-only turns are detected but do not enter Pi until explicit approval
And conflicts preserve the previous live identity with an honest safe next action.
```

## Validation Route

Aggregate validation is defined in [test-guide.md](test-guide.md). E2E evidence is required because unit tests cannot prove parity between persisted Pi sessions, Mirror context loading and the visible desktop conversation.

Required automated baseline:

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Use `uv run` for any Mirror Python commands. Raw session evidence must be sanitized and deleted after deriving durable fixtures or reports.

## Implementation Contract

- Use TDD for every behavior change.
- Keep each child work package identifiable in tests and commits even though validation occurs at DS level.
- Prefer Pi structured JSON/session events over terminal scraping.
- Preserve first-terminal-outcome settlement.
- Keep assistant text, operations, mode/Ariad surfaces, context state, compaction state and reasoning summaries as distinct semantic channels.
- Never persist provider reasoning summaries or private chain-of-thought.
- Do not absorb `DS-009` concurrency work; the current single-process boundary may remain until that story.
- No automatic invocation, silent synchronization or secret persistence.
- Update architecture documentation when the canonical identity or runtime boundary changes.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Pi session id and Mirror conversation id appear aligned but represent different transcripts | Verify transcript/session evidence and persist an explicit mapping; reject ambiguity |
| Importing history duplicates prompt context | Continue or branch a supported Pi session; do not resend the full local transcript |
| Manual logging duplicates Mirror-native records | Establish one owner and add exactly-once tests before removing the bridge |
| Pi JSON omits context/compaction fields | Characterize first, then add the narrowest supported query; never estimate |
| Compaction tests are expensive or nondeterministic | Use unit fixtures for reducers plus one controlled low-threshold E2E run |
| Mode parity expands into Mirror reimplementation | Keep routing and boundaries in Mirror; Nautilus only invokes and projects |
| DS-009 concerns leak into this work | Carry conversation identity in contracts without replacing the global process registry |

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
