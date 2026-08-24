# Plan — CV-002.DS-003.US-2

## Objective

Perform a paired semantic review of the essential Pi/Mirror command loop in Pi interactive CLI/TUI and Nautilus. Use the same provider/model and the same prompts, record the meaningful visible phases in a parity matrix, classify every difference, and obtain Navigator acceptance before declaring operational-loop parity.

This is primarily a comparison and evidence story. It does not presume application changes. Any meaningful mismatch must be captured and approved as a narrow correction before code changes.

## Parity Definition

Parity means that both environments communicate the same operational meaning:

```text
command accepted
run is active
provider-designated reasoning summaries appear as lightweight ordered progress when certified
actual operations appear in execution order and evolve in place
Mirror surfaces remain visible when produced
assistant response is distinct from progress and operational output
run reaches one inert terminal outcome
```

Parity does not require identical typography, dimensions, icons, terminal escape behavior, animation, collapse affordances, timing, or generated prose.

## Review Configuration

Use the current Harness defaults in both environments:

```text
provider: openai-codex
model: gpt-5.4-mini
approval: enabled
Mirror working directory: /Users/alissonvale/mirror
Harness Journey: laboratorio-mirror-harness
```

Use unique terminal session ids so the comparison does not overwrite the Harness Journey session.

## Paired Scenarios

### Scenario A — no-tool baseline

Prompt:

```text
Responda somente com: OK. Não use ferramentas.
```

Terminal invocation:

```bash
cd /Users/alissonvale/mirror
pi \
  --provider openai-codex \
  --model gpt-5.4-mini \
  --session-id nautilus-parity-review-baseline \
  --approve \
  'Responda somente com: OK. Não use ferramentas.'
```

Nautilus route: select `Laboratório Mirror Harness`, retain default Mirror runtime Pi settings, and send the exact same prompt.

Expected semantic sequence:

```text
working → optional displayable reasoning summary → assistant response "OK" → completed
```

No tool operation, diagnostic history, or private chain-of-thought should be projected. The `openai-codex` adapter may emit its explicitly requested display summary before the answer.

### Scenario B — Mirror/Journey operation loop

Prompt:

```text
Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.
```

Terminal invocation:

```bash
cd /Users/alissonvale/mirror
pi \
  --provider openai-codex \
  --model gpt-5.4-mini \
  --session-id nautilus-parity-review-mirror \
  --approve \
  'Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.'
```

Nautilus route: send the exact same prompt in `Laboratório Mirror Harness`.

Expected semantic sequence, allowing model-dependent variation only when meaning remains equivalent:

```text
working
provider-designated reasoning summaries interleaved with observable work when emitted
ordered Mirror/Journey instruction reads
Mirror context-load command
operation output associated with that command
Mirror transition/context surface visible
assistant answer visible separately
completed and static
```

Do not require exact answer wording or assume operation counts beyond what the current paired runs actually produce. Differences in model-selected operations must be recorded before judging projection parity.

## Comparison Matrix

Create `parity-review.md` in the story package. For each scenario record:

| Dimension | Pi interactive observation | Nautilus observation | Verdict |
|-----------|----------------------------|----------------------|---------|
| command acceptance | | | pass / gap / allowed difference |
| active status | | | |
| operation identity and order | | | |
| in-place operation updates | | | |
| operation arguments/output | | | |
| Mirror surface visibility | | | |
| assistant response separation | | | |
| terminal settlement | | | |
| displayable reasoning summaries / private reasoning exclusion | | | |
| no replay/residual activity | | | |

Reference TS-1 structural evidence rather than persisting fresh raw JSONL with private `thinking_*` payloads.

## Difference Classification

Every observed difference receives one classification:

1. **Pass:** same meaningful phase/distinction.
2. **Allowed presentation difference:** typography, card layout, icon, collapse state, exact timing, or exact prose differs without changing meaning.
3. **Operational parity gap:** a meaningful operation/surface/outcome is missing, duplicated, misordered, mixed into assistant text, or remains live after settlement.
4. **DS-004 context concern:** conversation continuity, canonical model context, identity/persona routing, operating mode semantics, context usage, or compaction. Record and defer; do not absorb it here.
5. **Out of scope:** unrelated Pi settings, selectors, footer, editor, session browser, or terminal pixel behavior.

## Execution Sequence

1. Run the full automated suite/build/Cargo check to establish the candidate build.
2. Review TS-1 evidence and use it as the structural reference.
3. Execute Scenario A in Pi interactive and Nautilus.
4. Record both visible sequences in `parity-review.md`.
5. Execute Scenario B in Pi interactive and Nautilus.
6. Record both visible sequences and classify differences.
7. Reuse accepted TS-3 success/cancellation/failure evidence for terminal semantics; do not manufacture additional failure noise unless a mismatch needs reproduction.
8. Ask the Navigator to accept or reject the matrix.
9. If accepted, validate and close the story.
10. If rejected, capture the exact mismatch as a Change Request before planning or changing code.

## Acceptance Behavior

```text
Given the same representative prompt and equivalent provider/model configuration
When the Navigator compares Pi/Mirror interactive CLI/TUI with Nautilus
Then both expose the same meaningful active, operation, surface, response, and terminal phases
And Nautilus keeps certified display summaries ordered and separate while never leaking private reasoning
And presentation-only differences are identified rather than treated as missing features
And context concerns are routed to DS-004 rather than implemented here
```

## Automated Validation

Before paired review:

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

Existing focused evidence must remain green:

- Pi JSON event mapping;
- ordered operation reducer;
- terminal success/cancellation/failure semantics;
- runtime component separation and inert settlement.

## Reasoning-summary contract

- The active `openai-codex` adapter explicitly requests `reasoning.summary: "auto"`; its textual `thinking_*` deltas are treated as provider-designated display summaries, not encrypted chain-of-thought.
- Certify the active stream from actual assistant `message_start` metadata (`provider: openai-codex`, `api: openai-codex-responses`), with explicit `--provider openai-codex` configuration as a fallback for compatible wrappers. Every other provider path remains hidden until independently certified.
- Normalize transport events into `reasoning_summary_start`, `reasoning_summary_delta`, and `reasoning_summary_end`; never expose the transport event names as user-facing content.
- Keep summaries in ephemeral runtime projection state, ordered with operations and separate from assistant text.
- Render summaries as plain subdued text outside operation boxes. Settle incomplete summaries as interrupted on terminal completion, cancellation, or failure.
- Never append summaries to `ConversationMessage`, Journey persistence, imported activity, diagnostics, or evidence files.

## Evidence Safety

- Never persist raw `thinking_start`, `thinking_delta`, or `thinking_end` payloads or normalized display-summary text.
- Do not paste full Mirror identity/persona context into the parity document.
- Record operation names, order, visible surface presence, and concise sanitized descriptions.
- Screenshots are optional and must not expose secrets or private reasoning. A visible provider-designated display summary is allowed only in transient Navigator validation evidence.
- Historical/runtime operations remain inert.

## Out of Scope

- Conversation continuity or proving that prior local messages entered model context.
- Ego/persona or Mirror/Builder/Explorer/Soul mode parity beyond the visible Mirror surface exercised here.
- Context-window percentage, summarization, or compaction.
- Pi footer, settings, selectors, session browser, editor behavior, keybindings, or pixel emulation.
- Generic reasoning support for providers whose output semantics have not been certified.
- New event/component systems without an observed parity gap.
- Direct Pi class integration.

## Stop Conditions

- Pi and Nautilus are not using equivalent provider/model or prompt.
- A fresh run exposes a meaningful mismatch not covered by the approved contract.
- Evidence would persist private reasoning or full sensitive Mirror context.
- The observed issue belongs to DS-004 rather than operational projection.
- A code change appears necessary; capture and approve a Change Request first.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- comparison/evidence execution remains blocked until Navigator approval.
