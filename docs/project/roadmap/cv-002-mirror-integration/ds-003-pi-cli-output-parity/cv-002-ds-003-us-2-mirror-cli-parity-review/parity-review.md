# Pi/Mirror CLI ↔ Nautilus Semantic Parity Review

## Review status

```text
candidate build: passed
reference evidence: available
fresh paired Navigator review: accepted
final verdict: semantic parity accepted
```

## Configuration

| Setting | Pi interactive | Nautilus |
|---------|----------------|----------|
| Working directory/runtime | `/Users/alissonvale/mirror` | Mirror runtime Pi |
| Provider | `openai-codex` | `openai-codex` |
| Model | `gpt-5.4-mini` | `gpt-5.4-mini` |
| Approval | enabled | enabled |
| Journey for Mirror scenario | `laboratorio-mirror-harness` | `Laboratório Mirror Harness` |

## Evidence sources

- [TS-1 reference run](../cv-002-ds-003-ts-1-reference-run-and-minimal-event-contract/reference-run.md)
- [TS-1 minimal event contract](../cv-002-ds-003-ts-1-reference-run-and-minimal-event-contract/minimal-event-contract.md)
- [TS-2 validation](../cv-002-ds-003-ts-2-ordered-runtime-projection/validation.md)
- [TS-3 validation](../cv-002-ds-003-ts-3-run-settlement-and-failure-semantics/validation.md)
- TS-3 Refinement corrections CR004–CR006: success timing, composer control settlement, and single-source failure presentation.

No fresh raw JSONL is retained. Raw `thinking_*` payloads, normalized reasoning-summary text, and full Mirror identity/persona context are excluded from evidence.

## Candidate build checks

```text
npm test: passed — 19 files, 110 tests
npm run build: passed
cargo check: passed
```

## CR008 — Project certified reasoning summaries

Navigator finding: Pi's lightweight gray progress narration is part of the meaningful operational experience and should not be removed by an inherited blanket rule.

Source inspection established that the active `openai-codex` adapter requests `reasoning.summary: "auto"` and transports summary text through Pi's `thinking_*` event shape while encrypted reasoning remains separate. The approved correction therefore:

- certifies explicit `--provider openai-codex` configuration and, independently, the actual assistant `message_start` metadata (`provider: openai-codex`, `api: openai-codex-responses`);
- maps its transport lifecycle to ephemeral `reasoning_summary_*` stream events;
- preserves summary/operation order in runtime projection state;
- renders summaries as subdued italic plain text outside operation boxes, removes provider-supplied outer Markdown emphasis markers and outer whitespace, and applies symmetric vertical padding relative to adjacent operation and mode surfaces;
- keeps assistant response content separate;
- annotates each tool title with a 58-character middle-truncated preview of its first argument so file paths and commands retain both beginning and ending context;
- settles incomplete summary activity deterministically;
- never persists summaries or raw transport payloads;
- continues discarding all uncertified provider thinking events.

Automated parser, provider-metadata, configuration fallback, reducer, settlement, and component evidence passes. A diagnostic run of the exact Scenario B prompt in a fresh Pi session confirmed three thinking-summary lifecycles and twelve deltas without retaining payload text. The same prompt in the existing long-lived `nautilus-laboratorio-mirror-harness` session emitted no `thinking_*` events and reported `reasoning: 0`; the frontend pipeline projected three summaries when fed the fresh stream. Provider summaries are therefore optional session-dependent output, not a progress signal Nautilus can guarantee.

## CR009 — Restart the Pi session with the Harness conversation

For continued US-2 testing, `Restart Conversation` now resets both sides of the temporary dual state. It first archives the exact Journey Pi JSONL session file as a `.bak`, then resets the local Harness conversation only after the backend operation succeeds. It refuses to run while Pi is active, affects only `nautilus-<journey-id>`, preserves recovery evidence, and reports success or failure visibly. Sending a command or successfully restarting a conversation also promotes that Journey to the first position in Recent ordering, including pinned Journeys. The complete canonical conversation identity, selected-conversation mapping, context accounting and compaction solution remains owned by DS-004.

## Scenario A — no-tool baseline

Prompt:

```text
Responda somente com: OK. Não use ferramentas.
```

### Reference sequence

TS-1 Pi reference established:

```text
agent_start
assistant text_delta × 2 → "OK"
agent_end / agent_settled
```

The JSON transport uses a `thinking_*` lifecycle for the OpenAI Codex display summary. CR008 now projects that summary ephemerally without persisting its payload or treating it as assistant text.

### Parity matrix

| Dimension | Pi interactive/reference observation | Nautilus candidate observation | Verdict |
|-----------|--------------------------------------|--------------------------------|---------|
| Command acceptance | Prompt enters one agent run | Explicit send creates one assistant run shell | Candidate pass; fresh paired check pending |
| Active status | One Working indicator | One Starting/Working status | Candidate pass; fresh paired check pending |
| Operation identity/order | No operations | No operations expected | Candidate pass; fresh paired check pending |
| Displayable reasoning summary | OpenAI Codex summary may appear as lightweight gray progress | Certified summary deltas render as ephemeral plain gray text | Candidate pass by CR008 tests; fresh paired check pending |
| Assistant response | One streaming assistant response: `OK` | `text_delta` enters only assistant response | Candidate pass; fresh paired check pending |
| Terminal settlement | Working clears at `agent_end` | `Completed` at `agent_end`; later wrapper `done` is idempotent | Candidate pass; fresh paired check pending |
| Private reasoning | Encrypted/private reasoning is not exposed | Uncertified provider thinking is discarded; summaries are never persisted | Pass by contract/tests |
| Replay/residual activity | No completed-event carousel | Completed state is static | Pass by component/TS-3 evidence |

## Scenario B — Mirror/Journey operation loop

Prompt:

```text
Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.
```

### Reference sequence

TS-1 Pi reference established this visible semantic structure:

```text
Working
read Mirror Mode skill instructions
read Journey status skill instructions
bash memory mirror load for laboratorio-mirror-harness
Mirror transition/context surface in command output and transported response
one separate final assistant response
agent_end / settled
```

The captured run contained 61 tool argument deltas and three real operations. Deltas are updates to existing operations, not independent visible events.

### Parity matrix

| Dimension | Pi interactive/reference observation | Nautilus candidate observation | Verdict |
|-----------|--------------------------------------|--------------------------------|---------|
| Command acceptance | One natural-language command starts run | Explicit send starts one run | Pass in TS-2/TS-3; fresh paired check pending |
| Active status | One Working indicator | One Starting/Working status | Pass in TS-2/TS-3; fresh paired check pending |
| Reasoning/operation order | Display summaries appear between observable operations as emitted | Summary blocks and operations share one stable activity order | Candidate pass by CR008 tests; fresh paired check pending |
| Operation identity/order | `read`, `read`, `bash` in reference order | Operations keyed by `toolCallId`, preserving first-seen order | Pass in TS-2; model-selected fresh sequence pending |
| In-place updates | Pi mutates one tool component per call | Reducer upserts preparing/running/output/completed on one operation | Pass by TS-2 tests and Navigator validation |
| Arguments/output | Associated with matching tool component | Expandable inert arguments/output on matching operation | Pass in TS-2; fresh paired check pending |
| Mirror surface visibility | Mirror transition/context visibly transported | Mirror/Ariad surfaces remain visible; operation output is not duplicated as generic activity | Candidate pass; fresh paired check pending |
| Assistant separation | Final answer is distinct from tools | `text_delta` enters assistant response only | Pass by contract/tests; fresh paired check pending |
| Terminal settlement | Working clears and tools settle | Completed/Cancelled/Failed are terminal; no operation remains active | Pass by TS-3 E2E |
| Private reasoning | Provider display summary is visible; encrypted/private reasoning is not | Only certified OpenAI Codex summaries project ephemerally; other thinking remains hidden | Pass by contract/tests; fresh paired check pending |
| Replay/residual activity | Stateful components; no historical carousel | Ordered static operations; no rotation after settlement | Pass by TS-2/TS-3 E2E |

## Accepted terminal evidence inherited from TS-3

| Route | Navigator result |
|-------|------------------|
| Successful completion | Passed after CR004: `Working → Completed` at Pi `agent_end` |
| Composer control settlement | Passed after CR005: Cancel control returns at structured completion |
| Cancellation | Passed: `Cancelled`, no active operation/control residue |
| Deterministic failure | Passed: `Failed`, no Working/Cancel residue |
| Failure presentation | Passed after CR006: one compact runtime error, no duplicated assistant error |

## Allowed presentation differences

The following do not fail semantic parity:

- terminal text layout versus desktop cards;
- typography, colors, spacing, icons, borders, and collapse controls;
- exact token timing or number of text deltas;
- exact generated answer wording;
- operation-count variation caused by a fresh model run, provided Nautilus faithfully projects the operations actually emitted;
- Nautilus showing explicit Title Case `Starting`, `Working`, `Completed`, `Cancelled` and `Failed` labels where Pi may clear its Working indicator;
- Mirror mode surfaces defaulting to a closed disclosure with the explicit `MODE ACTIVATED` badge.

## Gap classification rules

- Missing, duplicated, misordered, mixed, or still-live operational meaning: **operational parity gap**.
- Conversation continuity, identity/persona routing, operating mode semantics beyond the exercised visible surface, context usage, or compaction: **DS-004 context concern**.
- Pi settings/footer/editor/session browser/keybindings/pixel layout: **out of scope**.

## Navigator decision

Accepted after paired and iterative live observation:

1. both environments expose equivalent meaningful phases, including lightweight reasoning summaries when emitted;
2. summaries and actual Mirror operations are faithfully represented in emission order;
3. Mirror surfaces and final answers remain visible and distinct from progress text;
4. completion is inert, visual duplication is absent, and the temporary Pi-session restart bridge supports fresh parity tests.

Final verdict: semantic operational-loop parity accepted. Canonical conversation identity and durable logging normalization remain explicit deferred context debt for CV-002.DS-004.
