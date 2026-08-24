# Plan — CV-002.DS-003.TS-3

## Objective

Make run termination a single deterministic contract across Pi process events, runtime projection, agent-run state, and visible UI. Success, cancellation, and failure must be distinguishable; late events must not reopen or overwrite a terminal run; no operation may remain `preparing` or `running`; and no live animation may survive settlement.

## Observed Gaps

- `RuntimeProjectionState` protects failed/cancelled state from late completion, but unresolved operations may remain visibly `preparing` or `running`.
- Terminal projection without operations currently renders nothing, so a Pi assistant-stream error can leave only an empty assistant shell.
- A provider generator that throws escapes `sendMessage` without explicitly failing `agentRun` or `runtimeProjection`.
- `cancelActiveRun` settles `agentRun` locally but relies on the later Rust `Cancelled → Done` sequence to settle projection; cancellation failure can also leave projection active.
- The agent-run transition helpers do not themselves enforce terminal idempotence; current safety depends on call-site guards.
- Setup/listener failure in `livePiAgentStream` currently emits only assistant text plus `done`, which can be misclassified as success.

## Terminal Contract

1. `starting` and `working` are the only active run states.
2. `completed`, `cancelled`, and `failed` are terminal and immutable; the first terminal outcome wins.
3. A terminal transition settles all unresolved operations:
   - failure marks unresolved operations `failed`;
   - cancellation marks unresolved operations `interrupted`;
   - successful completion marks any operation missing its end event `interrupted` rather than claiming false completion.
4. Operation updates arriving after the run is terminal are ignored.
5. Pi `agent_end` settles successful model execution immediately; the later wrapper `done` is idempotent and cannot overwrite cancellation or failure. This avoids keeping `Working` visible during wrapper post-processing such as Mirror logging.
6. The runtime surface always shows a compact terminal outcome, including runs with no operations or assistant text. Only active states animate.
7. Local cancellation, streamed cancellation, and the subsequent process `done` are idempotent.
8. Thrown provider errors, process-start/listener errors, non-zero exits, cancellation failures, and Pi assistant-stream errors settle visibly as failed.

## Implementation Sequence

### 1. RED — characterize terminal event sequences

Extend reducer and run-state tests before production changes:

- `working → operation running → cancelled → done → agent_end → late operation_end` remains cancelled and frozen;
- `working → operation running → error → agent_end → done` remains failed;
- `working → operation running → done` completes the run but interrupts the unresolved operation;
- duplicate cancellation/failure transitions are idempotent;
- agent-run terminal helpers cannot overwrite an earlier terminal state;
- no terminal state is considered active.

Add component expectations for completed, cancelled, and failed outcomes with and without operations. Assert settled markup has no Working indicator or active animation affordance.

### 2. GREEN — make runtime projection a terminal latch

Update `src/agent/agentStream.ts` and `src/app/runtimeActivityModel.ts`:

- add `interrupted` as an inert operation state;
- retain an optional terminal message for cancellation/failure;
- centralize terminal transition and unresolved-operation settlement;
- ignore run-status and operation updates after the first terminal state;
- preserve arguments, output, operation identity, and first-seen order.

Do not add timers, synthetic history, or a second process state machine.

### 3. GREEN — align process and application orchestration

Update `src/agent/piProcessStream.ts` and the narrow run loop in `src/app/App.tsx`:

- emit a real `error` event for listener/setup failure before `done`;
- catch provider-generator exceptions and settle both `agentRun` and runtime projection as failed;
- settle runtime projection immediately when local cancellation succeeds;
- settle it as failed when cancellation itself fails;
- tolerate the Rust `Cancelled → Done` event sequence and duplicate cancellation safely;
- preserve assistant text separately from runtime status and operations.

Change Rust only if a test or observed E2E event proves the existing event order cannot satisfy the contract.

### 4. GREEN — render distinct inert terminal outcomes

Update `src/app/LiveRuntimeActivity.tsx` and `src/styles/app.css`:

- active state: retain `Starting`/`Working` animation;
- completed: show a compact `Completed` outcome;
- cancelled: show `Cancelled` and the cancellation message;
- failed: show `Failed` and the failure message;
- `interrupted` operations remain expandable and inert;
- terminal surfaces contain no pulsing dot, working dots, carousel, or post-settlement updates.

### 5. REFACTOR — remove duplicated transition logic

Keep terminal precedence in pure helpers/reducers rather than scattered React branches. Preserve existing ordered operation projection and avoid broad application-state redesign.

## Files Expected to Change

- `src/agent/agentStream.ts`
- `src/agent/agentRun.ts`
- `src/agent/piProcessStream.ts`
- `src/app/runtimeActivityModel.ts`
- `src/app/LiveRuntimeActivity.tsx`
- `src/app/App.tsx`
- `src/styles/app.css`
- focused tests under `src/tests/`
- this story package and parent roadmap status

`src-tauri/src/main.rs` is inspected evidence, not planned implementation scope unless validation demonstrates an event-order defect.

## Acceptance Behavior

```text
Given a live run that completes, is cancelled, or fails
When terminal and late Pi/process events arrive
Then the first terminal outcome remains authoritative
And no operation remains preparing or running
And no late event reopens or rewrites the settled projection
And Completed, Cancelled, or Failed is visible even without tool activity or assistant text
And only active runs contain live animation
And the assistant response remains separate from runtime outcome and operation output
```

## Validation

Automated:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Navigator E2E:

1. Success: run the TS-1 Mirror prompt and confirm `Working → Completed` with static operations.
2. Cancellation: start a real Mirror run, cancel while an operation is active, and confirm `Cancelled`; no operation remains running and later `done` changes nothing.
3. Failure: temporarily configure a definitely missing executable, invoke once, and confirm `Failed` is visible with no residual Working state; then restore provider defaults.

Pass condition: every route reaches exactly one visible terminal outcome, unresolved operations settle, and nothing continues animating or changing.

Fail condition: a terminal status is overwritten, an operation remains active, an empty assistant shell hides the outcome, or Working survives completion/cancellation/failure.

## Out of Scope

- Conversation continuity and canonical model context.
- Context-window percentage, summarization, or compaction.
- Mirror persona/ego/mode routing.
- New Pi features or generic event-card systems.
- Direct Pi class integration.
- Retrofitting historical imported activity.

## Stop Conditions

- The real Pi event stream cannot distinguish a fatal error from a recoverable diagnostic without changing the Rust/JSON boundary.
- A required change would alter Mirror-owned mode, identity, or conversation semantics.
- E2E reveals a process event ordering that contradicts the first-terminal-wins contract.
- Scope expands beyond run settlement.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
