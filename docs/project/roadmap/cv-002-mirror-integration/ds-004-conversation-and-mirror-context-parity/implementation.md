# Implementation Report — CV-002.DS-004

## State

Implementation complete; aggregate Navigator validation remains pending.

## Delivered

### Canonical live conversation contract

- Added versioned `LiveConversationIdentity` to each `JourneyConversation`.
- Persisted conversation schema advanced to `0.2.0` with backward migration from `0.1.0`.
- Invocation and restart now consume the persisted Pi session id instead of deriving it independently.
- Restart advances a lifecycle generation only after backend archival succeeds.
- Imported Mirror conversations carry explicit Mirror and Pi identities.

### Conversation continuity and recovery

- Natural-language Mirror prompts still send only the current command; prior turns come from the mapped Pi session.
- Selected Mirror conversations are explicitly hydrated into a linked Pi v3 session before the Harness presents them as live.
- Existing mapped Pi sessions are archived before imported hydration.
- Partial streaming text is not durably saved while a run is active.
- A failure before Pi `agent_start` restores the previously committed local conversation.
- Synthetic cancellation text is no longer inserted as assistant conversation content.

### Mirror context and durable ownership

- Mirror remains the owner of Journey, identity, persona and mode behavior through the existing runtime/skill path.
- Explicit structured skill and surface projection remains unchanged.
- Tauri's duplicate after-the-fact Mirror user/assistant logging was removed from live invocation; raw Pi JSON is no longer stored as assistant prose by that bridge.

### Context usage

- Pi `message_update.usage` maps to context usage immediately.
- Pi `message_update.usage` events are the sole live source for context tokens. For supported models, the fixed context-window property comes from a versioned snapshot of Pi's model catalog and the percentage is derived arithmetically; unknown models expose tokens without inventing a window.
- Nautilus persists the latest authoritative stats against the exact Pi session, conversation generation and provider/model, then restores them only while those coordinates match.
- When a Journey has no matching cache, Nautilus asynchronously reads the exact mapped local Pi JSONL file and extracts the latest successful assistant usage after the most recent compaction.
- Imported Mirror conversations without a mapped Pi file disclose `Pi context not initialized` and expose an explicit hydration action. Before first provider usage, the hydrated transcript uses Pi's conservative `chars / 4` estimate.
- Startup and post-run RPC inspection were removed after validation exposed desktop instability from the additional Pi process; local session inspection and explicit hydration start no model request.
- Nautilus renders authoritative tokens, context window and percentage, or an honest unknown state.

### Compaction

- `compaction_start` and `compaction_end` project as one ordered Pi compaction operation.
- Threshold, overflow/manual reason, completion, retry, interruption and failure are represented.
- Completed compaction resets usage to unknown until Pi reports valid post-compaction usage.
- Compaction evidence arriving after `agent_end` may update the settled projection without reopening its terminal run status.

### Documentation

- Replaced the obsolete manual-handoff architecture description with the current Pi/Mirror process and conversation boundary.
- Added DS-level plan and aggregate test guide.
- Moved DS-004 and all child packages to In Validation.

## Changed Areas

- `src/domain/journeyConversation.ts`
- `src/domain/persistedJourneyConversation.ts`
- `src/agent/piTaskPacket.ts`
- `src/agent/agentStream.ts`
- `src/agent/piProcessStream.ts`
- `src/app/App.tsx`
- `src/app/runtimeActivityModel.ts`
- `src/app/LiveRuntimeActivity.tsx`
- `src/styles/app.css`
- `src-tauri/src/main.rs`
- `scripts/export_mirror_bootstrap.py`
- `docs/architecture/pi-local-process-boundary.md`
- DS-004 tests and roadmap artifacts

## Automated Evidence

```text
npm test: 19 files, 120 tests passed
npm run build: passed
cargo test: 3 tests passed
cargo check: passed
python3 -m py_compile scripts/export_mirror_bootstrap.py scripts/log_mirror_conversation.py: passed
```

A direct read-only Pi RPC characterization also returned `get_session_stats.contextUsage` for an existing mapped session. A temporary isolated-session characterization proved that a hydrated Pi v3 session is discoverable and reports imported message counts. No raw session fixture was retained.

## Validation Still Required

Follow `test-guide.md` for Navigator-visible paired checks:

1. fresh and relaunched multi-turn continuity;
2. selected Mirror conversation continuation;
3. restart boundary;
4. Journey/identity pre-generation evidence;
5. persona routing;
6. all four operating modes;
7. terminal/Nautilus context-usage comparison;
8. controlled automatic compaction and post-compaction continuity;
9. success/cancellation/failure durable recovery.

Do not mark Done until paired validation and debt review are accepted.
