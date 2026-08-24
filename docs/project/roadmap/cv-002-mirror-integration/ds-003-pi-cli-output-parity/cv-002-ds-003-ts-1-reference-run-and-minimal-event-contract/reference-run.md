# Reference Run Evidence — CV-002.DS-003.TS-1

## Purpose

Characterize the smallest observable Pi/Mirror execution loop before changing Nautilus UI behavior.

The reference is semantic rather than pixel-based: which run phases and operations Pi exposes, how they evolve, and which output is the user-facing assistant answer.

## Safety and privacy

Pi JSON mode emits `thinking_start`, `thinking_delta`, and `thinking_end`. At capture time these were conservatively classified as private reasoning and excluded from the Nautilus projection contract. US-2 later established that the active `openai-codex` adapter uses this transport shape for explicitly requested provider display summaries. The historical tables below preserve the original TS-1 classification; the revised current contract is defined in `minimal-event-contract.md` and US-2 `plan.md`.

The raw JSONL captures were used only to derive structural evidence and then deleted. Persisted evidence under `evidence/*.sanitized.jsonl` contains event shape, ordering, sizes and surface-presence flags, but no thinking payload, normalized summary text, or full Mirror identity/tool output.

## Reference A — minimal answer without tools

Prompt:

```text
Responda somente com: OK. Não use ferramentas.
```

Invocation:

```bash
pi --mode json \
  --provider openai-codex \
  --model gpt-5.4-mini \
  --session-id nautilus-parity-baseline-20260823 \
  --approve \
  'Responda somente com: OK. Não use ferramentas.'
```

Structural result:

| Event | Count |
|-------|------:|
| `session` | 1 |
| `agent_start` | 1 |
| `turn_start` | 1 |
| `message_start` | 2 |
| `message_update` | 6 |
| `message_end` | 2 |
| `turn_end` | 1 |
| `agent_end` | 1 |
| `agent_settled` | 1 |

Relevant assistant updates:

| Update subtype | Count | Projection |
|----------------|------:|------------|
| `thinking_start/end` | 2 | Never render |
| `text_start` | 1 | Start assistant text block |
| `text_delta` | 2 | Append to assistant response |
| `text_end` | 1 | Finalize assistant text block |

This establishes the minimum loop: working state, assistant text streaming, completion.

## Reference B — Mirror Mode with Journey context

Prompt:

```text
Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.
```

Invocation:

```bash
pi --mode json \
  --provider openai-codex \
  --model gpt-5.4-mini \
  --session-id nautilus-parity-reference-20260823 \
  --approve \
  'Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.'
```

Structural result:

| Event | Count |
|-------|------:|
| `agent_start` | 1 |
| `turn_start` | 3 |
| `message_start/end` | 7 / 7 |
| `message_update` | 340 |
| `tool_execution_start` | 3 |
| `tool_execution_update` | 3 |
| `tool_execution_end` | 3 |
| `turn_end` | 3 |
| `agent_end` | 1 |
| `agent_settled` | 1 |

Assistant update subtypes:

| Update subtype | Count | Meaning |
|----------------|------:|---------|
| `thinking_*` | 18 | Private reasoning; never render |
| `toolcall_start` | 3 | Tool call begins forming |
| `toolcall_delta` | 61 | Incremental arguments for existing tool call |
| `toolcall_end` | 3 | Tool identity and complete arguments available |
| `text_start` | 1 | Final user-facing response starts |
| `text_delta` | 253 | Final response streaming |
| `text_end` | 1 | Final response complete |

Executed operations, in order:

1. `read` Mirror Mode skill instructions.
2. `read` Journey status skill instructions.
3. `bash` runs `uv run python -m memory mirror load ... --journey laboratorio-mirror-harness`.
4. Bash output contains the Mirror Mode transition surface and persona/Journey context.
5. The final assistant text visibly transports the Mirror Mode surface and then answers the question.

The bash operation emitted three updates before completion. These updates represent one evolving operation, not three independent historical outputs.

## Pi interactive renderer behavior

Source inspection confirms how the Pi TUI consumes the same core session events:

- `dist/modes/interactive/interactive-mode.js`
  - `agent_start` shows `WorkingStatusIndicator`.
  - `message_start` for assistant creates one streaming `AssistantMessageComponent`.
  - `message_update` updates that same component.
  - tool calls create one `ToolExecutionComponent` keyed by tool-call id.
  - `tool_execution_start/update/end` mutate that existing component.
  - `agent_end` clears working status and pending tool state.
- `dist/modes/print-mode.js`
  - `--mode json` forwards session events as JSON lines.
  - plain `--print` emits only final assistant text.
- `dist/modes/json-event.js`
  - strips the duplicated assistant `partial` object from `message_update`, retaining delta events and usage.

Therefore the parity target is stateful event projection, not replaying every JSON line as a new visual event.

## Current Nautilus behavior

Current mapping in `src/agent/piProcessStream.ts` loses those stateful semantics:

| Pi input | Current Nautilus mapping | Consequence |
|----------|--------------------------|-------------|
| `agent_start` | generic diagnostic | Working semantics become history text |
| `turn_start` | generic diagnostic | Internal lifecycle noise appears as activity |
| assistant `message_start/end` | generic diagnostics | Intermediate tool-use turns add noise |
| `text_delta` | assistant message delta | Correct baseline behavior |
| `toolcall_start` | generic diagnostic | No operation identity yet |
| every `toolcall_delta` | a new diagnostic | 61 argument chunks become 61 banner/history entries |
| `toolcall_end` | generic diagnostic | Duplicates later execution start |
| `tool_execution_start/update/end` | separate diagnostics | One operation appears as several unrelated events |
| tool result message | generic diagnostic | Result cannot be associated with its operation |
| `agent_end` | generic diagnostic | Completion is not represented as run settlement in the activity model |
| `compaction_*` | ignored | Deferred context-parity gap |
| `thinking_*` | ignored | Correct and required |

`src/app/runtimeActivityModel.ts` then converts each diagnostic into a separate `LiveRuntimeActivityEvent`. The carousel is downstream of this loss of identity: it can only rotate independent strings because the bridge discarded operation ids and lifecycle state.

## Transport findings

### Available through Pi JSON mode

- Run and turn lifecycle.
- Assistant text deltas.
- Complete tool identity and arguments.
- Tool execution start/update/end keyed by `toolCallId`.
- Tool results and errors.
- Compaction and retry events when they occur.
- Usage attached to assistant updates.

### Not directly available in the captured JSON contract

- The exact interactive `Working...` component text/style. Nautilus can derive active status from `agent_start` and settlement.
- The footer's authoritative `AgentSession.getContextUsage()` percentage and post-compaction unknown state. This belongs to `CV-002.DS-004.TS-5`.
- Terminal pixel layout and expand/collapse state. These are intentionally not parity requirements.

### Mode caveat

Pi binds extensions with mode `json` under `--mode json`, not mode `interactive`. Core agent/tool events are shared, but extension UI behavior available only through interactive UI context may differ. Any observed missing Mirror artifact must be documented before considering RPC/SDK/sidecar integration.

## Evidence files

```text
evidence/pi-baseline-reference.sanitized.jsonl
evidence/pi-baseline-reference.stderr.log
evidence/pi-mirror-reference.sanitized.jsonl
evidence/pi-mirror-reference.stderr.log
```
