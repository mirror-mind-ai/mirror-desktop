[< Story](index.md)

# Test Guide — CV-002.DS-003.US-2

## Candidate Build

```bash
cd /Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness
npm test
npm run build
cd src-tauri && cargo check
```

All focused mapping, reducer, terminal-state, and runtime-component tests must remain green.

## Paired E2E Review

Use Pi interactive from `/Users/alissonvale/mirror` and Nautilus Journey `Laboratório Mirror Harness`, both with `openai-codex/gpt-5.4-mini`.

### Scenario A

```text
Responda somente com: OK. Não use ferramentas.
```

Expected in both: visible active state, optional lightweight OpenAI Codex reasoning summary, assistant `OK`, inert completion, no operations.

### Scenario B

```text
Entre em Mirror Mode para a jornada laboratorio-mirror-harness e responda em uma frase: qual é o foco desta jornada? Não altere arquivos.
```

Expected in both: visible active state; provider-designated reasoning summaries interleaved with actual Mirror/Journey reads and context-load command in execution order; associated output/surface; separate assistant answer; inert completion.

Exact prose, timing, operation count, typography, icons, and layout are not parity requirements. Any model-selected structural difference must be recorded before judging the projection.

## Matrix Dimensions

For terminal and Nautilus record:

- command acceptance;
- active state;
- operation identity/order;
- in-place operation evolution;
- operation arguments/output;
- Mirror surface visibility;
- assistant response separation;
- completion;
- certified display-summary visibility and private reasoning exclusion;
- absence of replay/residual activity.

Classify each row as `pass`, `allowed presentation difference`, `operational parity gap`, `DS-004 context concern`, or `out of scope`.

## Existing Terminal Evidence

Reuse accepted TS-3 evidence for:

- success settlement;
- cancellation;
- deterministic failure;
- composer-control settlement;
- single-source compact error presentation.

## Pass Condition

Both environments expose equivalent meaningful phases for both prompts; Nautilus keeps certified OpenAI Codex display summaries and actual operations ordered, Mirror surfaces visible, assistant text separate, private reasoning absent, and terminal state inert.

## Fail Condition

Nautilus misses, duplicates, misorders, or mixes a meaningful display summary/operation/surface/response; projects uncertified provider thinking; leaks private reasoning; or continues changing after settlement.

## Evidence Safety

Do not retain raw JSONL containing `thinking_*` payloads, normalized reasoning-summary text, or full Mirror identity/persona context. Store only sanitized phase/order/surface observations in `parity-review.md`.

## Validation Evidence

Pending candidate checks, paired review matrix, and Navigator acceptance.
