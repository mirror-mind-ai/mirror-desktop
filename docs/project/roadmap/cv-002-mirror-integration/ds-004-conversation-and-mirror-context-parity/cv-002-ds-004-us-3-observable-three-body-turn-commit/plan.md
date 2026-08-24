# Plan — CV-002.DS-004.US-3

## Objective

Make every Nautilus-origin turn a correlated, observable and recoverable commit across the Harness projection, exact Pi branch and mapped Mirror conversation. Success remains quiet; partial Mirror persistence becomes actionable and repair never reruns the model.

## Starting Point

- TS-6 provides `ConversationReconciliationState`, stable `turnId`/`runId`, native checkpoints, strict classifications and persistence `0.5.0`.
- `App.tsx` currently stages user/empty-assistant messages in React, pauses automatic persistence while streaming and saves after settlement.
- `start_pi_invocation` receives Journey and Pi session but no run/turn/Harness/Mirror authority.
- Pi JSON events expose messages but not native session-entry ids.
- Mirror's project extension is loaded because Nautilus runs Pi from `/Users/alissonvale/mirror`.
- Mirror user logging is awaited but failures are swallowed. Assistant logging runs detached and cannot acknowledge completion.
- Mirror messages have native ids and metadata, but `conversation-logger` currently creates random message ids and has no idempotency key.
- Mirror binds the exact Pi session-file path to one Mirror conversation.
- Tauri removed its duplicate after-the-fact Mirror logger and must not restore that behavior.

## Product Behavior

### Synchronized success

The normal path produces no permanent sync badge or chat activity. The completed reconciliation ledger is persisted silently.

### Attention required

After terminal settlement, unresolved or failed Mirror persistence appears as a compact notice near the composer:

```text
Mirror conversation commit incomplete · Retry
```

The notice identifies no private content. It may disclose bounded phase/reason state. It disappears after proven idempotent recovery.

### Relaunch

Only unresolved Nautilus-origin turns trigger a local Mirror status lookup on Journey activation/relaunch. Fully synchronized turns cause no query and no UI.

## Correlation Transport

Add a versioned allowlisted payload to the Harness invocation boundary:

```text
schemaVersion: 0.1.0
journeyId
harnessConversationId
piSessionId
generation
turnId
runId
harnessUserMessageId
harnessAssistantMessageId
mirrorConversationId?
```

The Rust backend validates every coordinate against the invocation arguments, serializes only this payload, and exports it to the one Pi child as an explicit ephemeral environment variable such as `NAUTILUS_TURN_CORRELATION_V1`. It contains ids only, no prompts, message content, tokens, secrets or arbitrary user environment.

Raw Pi mode, mock mode and terminal Pi without this payload retain existing behavior.

## Structured Pi/Mirror Commit Event

For a correlated Nautilus process, `mirror-logger.ts` emits one newline-delimited JSON protocol event after each durable attempt:

```text
type: mirror_commit
schemaVersion: 0.1.0
turnId
runId
phase: user | assistant
status: committed | failed
mirrorConversationId?
mirrorMessageId?
reasonCode?
piEvidence?
```

The extension writes only this certified object to stdout in JSON mode. It never emits content or traceback data. Harness parses it as a dedicated `AgentStreamEvent`; it is not assistant text, runtime operation, imported activity or reasoning.

### Pi evidence

- At `before_agent_start`, capture the native user entry from `ctx.sessionManager`.
- At `agent_end`, capture the last native assistant entry, current branch leaf, exact session file and branch entry count.
- The assistant commit event carries enough Pi evidence to complete the TS-6 Pi checkpoint.
- If native ancestry is ambiguous, emit a bounded failed reason rather than synthesizing ids.

## Idempotent Mirror Persistence

Extend Mirror's conversation logger with an optional versioned correlation object.

For correlated messages:

- derive deterministic native Mirror message ids from session/turn/phase using UUIDv5 or an equally stable namespaced algorithm;
- persist correlation metadata containing non-secret authority ids and phase;
- on duplicate id, return the existing record only when conversation, role and correlation agree;
- reject a deterministic-id collision with different authority, role or content shape;
- return structured JSON containing conversation id, message id and commit status;
- bind `journeyId` when creating the first Mirror conversation;
- preserve current uncorrelated terminal behavior.

The assistant path becomes awaited only for correlated Nautilus turns. Uncorrelated terminal Pi may keep background best-effort logging. A correlated Mirror failure must not erase the Pi answer or crash the agent; it emits `status: failed` and leaves reconciliation actionable.

## Harness Commit Sequence

### Before invocation

1. Create `AgentRunState`, `turnId`, user and assistant message ids once.
2. Call `beginNautilusTurn`.
3. Persist the staged conversation explicitly before spawning Pi.
4. Pass correlation through task/provider/Tauri boundaries.

If preparation or spawn fails before Pi starts, restore the previous visible conversation and record no fabricated committed turn.

### During and after invocation

1. User Mirror commit event may discover the initial `mirrorConversationId`; update `LiveConversationIdentity` and reconciliation authority atomically.
2. Assistant event supplies Pi and Mirror native evidence.
3. Harness commits its own user/assistant evidence only after terminal semantics establish the durable visible turn.
4. Persist the final ledger after streaming stops.
5. First-terminal-outcome behavior remains unchanged.

Cancellation/provider error rules:

- do not fabricate an assistant commit;
- retain native evidence already proven;
- classify the turn pending/failed according to observed bodies;
- do not send a repair that invents missing assistant text.

## Recovery Boundary

Add narrow Tauri/Mirror commands for unresolved turns:

### Status

`read_mirror_turn_commit_status` receives validated authority/turn ids, invokes no Pi/provider, and asks Mirror for deterministic native message status. It runs only for unresolved turns. A proven status updates the ledger idempotently.

### Retry

`retry_mirror_turn_commit`:

1. requires idle state;
2. reads the persisted Journey conversation locally;
3. resolves the exact correlated turn and its Harness message ids;
4. sends only the missing eligible user/assistant records to Mirror's idempotent logger;
5. never starts Pi and never invokes a model;
6. returns structured native ids;
7. leaves prior state intact on failure.

Retry is unavailable when assistant content was never durably committed in Harness or Pi.

## Implementation Sequence

### A. Characterization and protocol tests

1. Capture synthetic Pi branch and Mirror logger outputs.
2. Add failing parser tests for valid, malformed, mismatched and ANSI-contaminated `mirror_commit` events.
3. Add failing TS-6 integration tests for event order, duplicate acknowledgment and partial failure.

### B. Mirror idempotency substrate

1. Extend Mirror message creation to accept explicit id and metadata without changing existing callers.
2. Add correlated `log-user`, `log-assistant`, status and retry CLI behavior.
3. Add Python tests for first write, duplicate, collision, partial state, discarded session and Journey binding.
4. Change the extension's correlated path to synchronous structured acknowledgment while preserving uncorrelated behavior.
5. Add extension source/fixture tests for environment validation and event sanitization.

### C. Harness invocation and stream

1. Add the versioned correlation type to frontend/backend invocation contracts.
2. Generate run/turn identity before staging.
3. Validate and export only the allowlisted child-process payload.
4. Parse certified commit events and reject mismatched turn/run/Journey/session authority.
5. Reduce commit events into the TS-6 ledger without creating chat content.

### D. Durable recovery

1. Persist staged reconciliation before Pi spawn.
2. Add unresolved-turn status lookup on activation/relaunch only.
3. Add idle-only idempotent retry.
4. Ensure successful retry advances Mirror/Harness checkpoints and clears the notice.
5. Preserve partial state and reason code after retry failure.

### E. Minimal UI

1. Add a compact semantic notice near the composer only for actionable pending/failed state after the run.
2. Add `Retry` with disabled/running/error states.
3. Do not render success badges or raw ids/content by default.
4. Keep the notice separate from assistant/runtime/Ariad channels.

### F. Documentation and validation

1. Update both Harness and Mirror architecture/runtime documentation.
2. Add implementation and sanitized validation evidence.
3. Run Harness frontend/Rust suites and relevant Mirror Python tests.
4. Execute Navigator E2E for success, injected partial failure, retry and relaunch.

## Expected Files

### Harness

```text
src/agent/agentRun.ts
src/agent/agentStream.ts
src/agent/piProcessStream.ts
src/app/App.tsx
src/app/ConversationSyncNotice.tsx
src/app/journeyConversationStorage.ts
src/domain/conversationReconciliation.ts
src/domain/journeyConversation.ts
src-tauri/src/main.rs
src/tests/*commit* / existing stream, persistence and component tests
docs/architecture/three-body-conversation-reconciliation.md
docs/architecture/pi-local-process-boundary.md
```

### Mirror

```text
.pi/extensions/mirror-logger.ts
src/memory/cli/conversation_logger.py
src/memory/services/conversation.py and/or storage boundary
tests/unit/memory/cli/test_conversation_logger*.py
relevant extension contract tests/docs
```

## Stop Conditions

Stop and return to Plan if:

- Pi JSON mode cannot safely transport a structured extension event without prompt/context contamination;
- `agent_end` does not provide stable native Pi branch evidence;
- correlated logging would require blocking or failing the Pi answer instead of reporting a partial commit;
- repair requires model invocation or reconstructing tool ordering;
- first-conversation Mirror binding cannot be made atomic with live identity;
- scope begins importing external Pi or unrelated Mirror updates.

## Validation Gate

US-3 requires E2E validation. It passes when:

- one Nautilus turn yields one correlated Harness, Pi and Mirror user/assistant pair;
- normal success leaves no permanent notice;
- injected Mirror failure preserves the Pi answer and shows an actionable notice;
- Retry writes only missing deterministic records and starts no Pi/provider process;
- relaunch recovers unresolved state and resolves already-committed Mirror evidence;
- cancellation/error never fabricates assistant completion;
- all automated Harness and Mirror checks are green.

## Approval Gate

Implementation remains blocked until Navigator approves this plan.
