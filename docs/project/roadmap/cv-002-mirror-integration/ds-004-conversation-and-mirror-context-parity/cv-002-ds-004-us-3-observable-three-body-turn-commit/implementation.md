# Implementation — CV-002.DS-004.US-3

## Result

Implemented one correlated durable commit path for Nautilus-origin turns across the Harness projection, native Pi branch and mapped Mirror conversation.

## Harness

- Generates stable run/turn authority before Pi spawn.
- Explicitly persists the staged conversation and TS-6 pending turn before invocation.
- Passes a versioned allowlisted correlation payload through Tauri.
- Parses certified `mirror_commit` JSON events into a separate semantic channel.
- Recovers the same allowlisted events from durable Pi `nautilus_mirror_commit` custom session entries after process settlement because extension stdout is not a reliable transport through Pi JSON mode.
- Binds a newly created Mirror conversation in `LiveConversationIdentity` and reconciliation authority together.
- Captures native Pi user/assistant/leaf/session evidence and native Mirror message ids.
- Commits Harness evidence only after successful terminal settlement.
- Persists honest pending/failed state without converting it into chat/runtime/Ariad content.
- Shows a compact notice near the composer only when Mirror repair is actionable.
- Queries status on relaunch only for unresolved Nautilus turns.
- Retries missing Mirror records while idle without starting Pi or invoking a provider.

## Tauri

- Validates correlation against Journey/Pi arguments and the explicitly staged persisted turn.
- Exports only `NAUTILUS_TURN_CORRELATION_V1` to Mirror-mediated Pi children.
- Adds bounded read/retry commands for unresolved Mirror commits.
- Retry reads exact staged Harness messages and exact validated Pi session authority.
- Pi JSONL paths must be inside the local Pi sessions root and carry the mapped session header id.
- Durable custom entries are filtered by exact run/turn correlation and rebuilt from an allowlist before frontend projection; arbitrary entry fields cannot escape.
- Optional `mirrorConversationId` is omitted rather than serialized as `null`, preserving correlation validation for newly created conversations.

## Mirror

- Correlated logger messages use deterministic UUIDv5 native ids.
- Correlation metadata contains only allowlisted ids and phase.
- Duplicate writes return the existing record; collisions with different content/authority are rejected.
- The initial correlated user write binds the Journey to the Mirror conversation.
- Imported display-prefixed Mirror ids migrate to native ids; explicit native authority safely rebinds the Pi runtime session and migrates matching legacy deterministic records.
- The current Pi user entry is derived from native branch ancestry at `agent_end`, when the entry is guaranteed to exist, rather than from text or timing.
- Correlated user and assistant paths return structured native acknowledgment.
- `commit-status` reports missing, partial or committed state without writing.
- Correlated assistant logging is awaited and emits a sanitized event; uncorrelated terminal Pi preserves its prior behavior.
- Aborted/error assistant responses are not durably committed as completed correlated assistants.
- The explicit non-persisted `NAUTILUS_MIRROR_TEST_FAIL_PHASE=user|assistant` development hook enables controlled E2E failure; normal runs do not set it and retry bypasses the extension failure hook.

## Safety

- No prompt or assistant content is placed in correlation environment/events/ledger.
- No arbitrary environment variables are persisted.
- Reasoning and reasoning summaries remain outside durable conversation state.
- Mirror failure does not discard or rerun the Pi answer.
- Retry invokes neither Pi nor provider.
- US-4 external Pi import and US-5 Mirror-only reconciliation remain untouched.

## Automated Evidence

```text
Harness npm test: 23 files, 156 tests passed
Harness npm run build: passed
Harness cargo test: 5 tests passed
Harness cargo check: passed
Mirror focused conversation-logger suites: 35 tests passed
Mirror ruff check: passed
Mirror ruff format --check: passed after formatting
Mirror extension esbuild syntax/bundle check: passed
Synthetic extension lifecycle harness: emitted correlated success and controlled assistant-failure `mirror_commit` events with native Pi evidence, including ancestry-derived user entry
```

The full Mirror suite was also attempted. It timed out after 65% with four failures unrelated to US-3: one existing read-only WAL recovery failure and three local committed-skill/plugin consistency failures caused by `.claude/skills/ext:maestro`. The focused affected suites, lint, format and extension checks are green; these unrelated local-state failures are not hidden as story evidence.
