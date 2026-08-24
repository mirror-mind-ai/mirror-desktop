# Minimal Pi/Mirror Event Projection Contract

## Decision

Nautilus will project the current command-and-response loop from Pi's structured session events. It will not treat stdout lines as the UI model and will not reproduce the Pi terminal pixel layout.

The contract is deliberately smaller than Pi's complete feature set.

## Runtime state

```ts
type ProjectedPiRun = {
  status: "starting" | "working" | "completed" | "cancelled" | "failed";
  operations: ProjectedOperation[];
  assistantResponse: string;
  error?: string;
};

type ProjectedOperation = {
  id: string; // Pi toolCallId
  name: string;
  arguments?: unknown;
  status: "preparing" | "running" | "completed" | "failed";
  output?: string;
  isError?: boolean;
};
```

This is a behavioral contract, not a required final TypeScript shape.

## Projection rules

### Run lifecycle

| Pi event | State transition | Visible behavior |
|----------|------------------|------------------|
| invocation accepted | `starting` | Assistant run shell exists |
| `agent_start` | `working` | Show one live working status |
| `agent_end` | `completed` unless failed/cancelled | Stop live activity permanently |
| process cancellation | `cancelled` | Stop live activity; show cancellation distinctly |
| process/session error | `failed` | Stop live activity; show error distinctly |
| `agent_settled` | no extra history event | Optional internal settlement confirmation |

`turn_start`, `turn_end`, assistant `message_start`, and assistant `message_end` are lifecycle inputs. They do not each become standalone user-visible history rows.

### Assistant response

| Pi event | Projection |
|----------|------------|
| `message_update.text_start` | Ensure assistant response region exists |
| `message_update.text_delta` | Append delta to assistant response only |
| `message_update.text_end` | Finalize current text block |
| final assistant `message_end` | Preserve final response metadata if needed |

Mirror/Ariad surfaces transported in assistant text remain part of the assistant response and follow their verbatim transport rules.

### Tool operations

| Pi event | Projection |
|----------|------------|
| `toolcall_start` | Optional internal preparing state; do not append a history item |
| `toolcall_delta` | Update pending arguments in place or ignore until complete; never create one row per delta |
| `toolcall_end` | Upsert operation by tool-call id with complete name/arguments and `preparing` status |
| `tool_execution_start` | Upsert same operation and set `running` |
| `tool_execution_update` | Replace/update output preview on same operation |
| `tool_execution_end` | Complete/fail same operation and store final output/error |
| `toolResult` message | Associate with matching operation when useful; do not duplicate the result as a generic diagnostic |

Tool output remains inert. Tool identity never creates an executable control.

### Skills and Mirror commands

The bridge must not invent a semantic `skill` event when Pi reports an ordinary `read` operation.

- An explicit Pi skill block may be rendered as a skill invocation if the structured message actually contains that block.
- Natural-language Mirror routing in the captured reference run appears as `read` operations followed by a `bash` call to `memory mirror load`; Nautilus should project those actual operations.
- Mirror transition surfaces should be visibly transported from the assistant response. A surface inside tool output may remain part of the operation output without being duplicated as another runtime event.

### Private reasoning and displayable summaries

Private chain-of-thought remains outside the Nautilus projection. Raw JSONL payloads for the following transport events are never persisted:

```text
thinking_start
thinking_delta
thinking_end
```

US-2 parity review refined the original blanket-discard rule after inspecting the active `openai-codex` adapter. That adapter explicitly requests `reasoning.summary: "auto"`; its textual `thinking_*` deltas are provider-designated display summaries, while encrypted reasoning remains separate. Nautilus may therefore map those deltas into ephemeral `reasoning_summary_*` activity when actual assistant `message_start` metadata identifies `provider: openai-codex` with `api: openai-codex-responses`; explicit `--provider openai-codex` configuration remains a fallback for compatible wrappers. Other provider paths remain discarded until independently certified. Summaries never enter assistant message content, persisted conversation activity, or evidence fixtures containing payload text.

### Compaction

`compaction_start`, `compaction_end`, and summarization retry events are structured Pi events and must not be collapsed into generic stdout. Their complete behavior and context percentage belong to `CV-002.DS-004.TS-5`; `DS-003` only preserves the ability to forward/project their operational status later.

## Current gap classification

| Gap | Class | Next action |
|-----|-------|-------------|
| Tool argument deltas become dozens of events | Mapping defect | Aggregate/upsert by `toolCallId` |
| Tool start/update/end become unrelated diagnostics | Mapping defect | Introduce structured operation lifecycle |
| Lifecycle messages pollute runtime history | Mapping defect | Reduce lifecycle to run state |
| Rotating history continues a Nautilus-specific metaphor | Presentation consequence | Replace with current status plus ordered operations |
| Mirror surface in tool output is a generic diagnostic | Mapping defect | Preserve as operation output; surface remains in final response |
| Exact Pi footer context percentage absent | Transport limitation | Resolve in `DS-004.TS-5` through narrow authoritative query |
| Conversation context continuity unproven | Context concern | Resolve in `DS-004.TS-1/US-1` |
| Mirror mode/persona/Journey context parity unproven | Context concern | Resolve in `DS-004.TS-2/TS-3/TS-4` |

## Smallest next implementation slice

Proceed with:

```text
CV-002.DS-003.TS-2 — Ordered Runtime Projection
```

Minimum implementation:

1. Add structured run/operation events to the Nautilus stream boundary.
2. Key operations by Pi `toolCallId`.
3. Reduce tool-call and execution updates into one evolving operation.
4. Keep text deltas exclusively in assistant response state.
5. Reduce lifecycle events to one run status.
6. Stop all live status behavior on completion/cancellation/failure.
7. Replace the carousel as source of truth with current status plus ordered static operations.

Do not add context percentage, compaction control, generalized Pi features or Mirror mode reimplementation in this slice.

## Acceptance examples

### Baseline

```text
agent_start
text_delta "O"
text_delta "K"
agent_end
```

Projects as one working state followed by assistant response `OK` and completed state. No runtime history noise.

### Tool execution

```text
toolcall_delta × 61
toolcall_end bash(args)
tool_execution_start bash
tool_execution_update bash(output A)
tool_execution_update bash(output A+B)
tool_execution_end bash(final output)
```

Projects as one bash operation whose arguments/output/status evolve in place—not 65 output entries.
