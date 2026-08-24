# Three-Body Conversation Parity Review

## Status

In progress — evidence matrix established; aggregate reruns remain.

## Authority Baseline

Sanitized baseline: `viagem-do-lipe`, Harness conversation `nautilus-mirror-13a0d6f3`, Pi session `nautilus-viagem-do-lipe` generation `1`, Mirror conversation `13a0d6f3`, reconciliation `in_sync`.

The machine-readable sanitized timeline is [evidence/three-body-timeline.json](evidence/three-body-timeline.json). It stores no prompts, responses, message content, arbitrary metadata, tools or reasoning.

## Scenario Matrix

| Scenario | Claim | Evidence | Current status | Accepted difference / remaining route |
|---|---|---|---|---|
| 1 | Fresh canonical conversation and relaunch continuity | Identity/persistence/session suites; DS implementation report | automated_only | Requires final live follow-up in the alternating timeline. |
| 2 | Selected Mirror conversation enters real Pi context only after hydration | US-5 accepted generation plus hydrated JSONL checkpoint | rerun_required | Ask a Nautilus follow-up that depends on the reconciled `amber compass` fact. |
| 3 | Restart creates a generation boundary and rejects active-run restart | `journeyConversation`, persistence and Rust archive tests | automated_only | Aggregate Navigator review may accept deterministic evidence unless contradiction appears. |
| 4 | Journey and identity load before generation | Mirror-mediated invocation contract and structured runtime projection | rerun_required | Inspect one bounded same-Journey terminal/Nautilus pair and pre-generation operation evidence. |
| 5 | Ego/persona routing parity | Mirror-owned routing and signature projection tests | rerun_required | One routed and one ego-only paired case remain. |
| 6 | Mirror/Builder/Explorer/Soul parity | Certified mode/Ariad extraction and component suites | rerun_required | Validate missing natural-language activation/boundary pairs; reuse existing surfaces where coordinates suffice. |
| 7 | Context usage parity | Pi usage reducers, exact-session local inspection, model-window snapshot | rerun_required | Compare exact same session in terminal and Nautilus. |
| 8 | Pi-owned compaction and continuity | Deterministic compaction lifecycle/settlement suites | rerun_required | One bounded safe automatic-compaction route or explicit accepted limitation remains. |
| 9 | Durable logging, failure and recovery | [US-3 validation](../cv-002-ds-004-us-3-observable-three-body-turn-commit/validation.md) | accepted_existing | Semantic Mirror records differ from Pi execution bytes by design; native correlation proves the commit. |
| 10 | External exact Pi continuation | [US-4 validation](../cv-002-ds-004-us-4-resume-external-pi-activity-in-nautilus/validation.md) | accepted_existing | Pi owns ancestry; Nautilus projects only complete visible text turns. |
| 11 | Mirror-only explicit reconciliation | [US-5 validation](../cv-002-ds-004-us-5-reconcile-mirror-only-updates-into-pi/validation.md) | accepted_existing | Mirror semantic content enters Pi only through explicit hydrated generation. |
| 12 | Alternating three-body conversation | US-3/4/5 anchors plus generation-1 baseline | rerun_required | Complete one causal alternating timeline and final follow-up. |

## Failure Matrix

| Boundary | Evidence | Status |
|---|---|---|
| Mirror assistant commit failure after Pi success; relaunch; model-free Retry | US-3 E2E | accepted_existing |
| Partial Pi tail; tool/reasoning exclusion; stale ancestry | US-4 TS/Rust fixtures | automated_only |
| Mirror incomplete/truncated/consolidated/arbitrary-role tail | US-5 TS/Python fixtures | automated_only |
| Independent Pi + Mirror advancement | US-5 classifier fixtures and Laboratório state | automated_only |
| Reconciliation activation failure restores old files | Rust rollback test | automated_only |
| Focus/Journey/relaunch dedupe | US-4 and US-5 E2E | accepted_existing |
| Cancellation/error terminal settlement | agent/runtime suites | automated_only |

## Automated Baseline

```text
npm test: 26 files, 176 tests passed
npm run build: passed
cargo test: 8 tests passed
cargo check: passed
Python Mirror inspector: 4 tests passed
```

## Intentional Semantic Differences

- Pi owns execution entries, ancestry, usage and compaction.
- Mirror owns semantic messages and may consolidate or truncate them.
- Nautilus owns explicit invocation, visible projection and cross-body checkpoints.
- `in_sync` means causally proven semantic parity, not byte-identical files.
- Private reasoning, tools, operational records and arbitrary metadata are never chat parity material.

## Next Validation Action

From `viagem-do-lipe` generation `1`, send one explicit Nautilus follow-up that requires the reconciled Mirror-only `amber compass` fact. Then inspect native three-body commit evidence before continuing the terminal and Mirror legs.
