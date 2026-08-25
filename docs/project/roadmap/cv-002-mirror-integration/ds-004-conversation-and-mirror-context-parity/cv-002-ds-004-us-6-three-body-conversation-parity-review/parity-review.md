# Three-Body Conversation Parity Review

## Status

In progress — evidence matrix established; aggregate reruns remain.

## Authority Baseline

Sanitized baseline: `viagem-do-lipe`, Harness conversation `nautilus-mirror-13a0d6f3`, Pi session `nautilus-viagem-do-lipe` generation `1`, Mirror conversation `13a0d6f3`, reconciliation `in_sync`.

The machine-readable sanitized timeline is [evidence/three-body-timeline.json](evidence/three-body-timeline.json). It stores no prompts, responses, message content, arbitrary metadata, tools or reasoning.

## Scenario Matrix

| Scenario | Claim | Evidence | Current status | Accepted difference / remaining route |
|---|---|---|---|---|
| 1 | Fresh canonical conversation and relaunch continuity | Identity/persistence/session suites plus generation-1 post-relaunch correlated follow-up | rerun_passed | Exact mapped branch continued after relaunch without prompt replay. |
| 2 | Selected Mirror conversation enters real Pi context only after hydration | US-5 accepted generation plus generation-1 follow-up using the reconciled `amber compass` fact | rerun_passed | Navigator confirmed the answer recovered the reconciled object/color from Pi context. |
| 3 | Restart creates a generation boundary and rejects active-run restart | `journeyConversation`, persistence and Rust archive tests | automated_only | Aggregate Navigator review may accept deterministic evidence unless contradiction appears. |
| 4 | Journey and identity load before generation | Mirror-mediated invocation contract plus generation-2 `nautilus_mirror_context` before native user/assistant entries | rerun_passed | Exact Journey and Mirror context were loaded before provider generation; private context remained outside evidence. |
| 5 | Ego/persona routing parity | Mirror-owned fresh detection plus allowlisted `nautilus_mirror_context` evidence | rerun_passed | `product-designer` marker rendered once; unmatched follow-up used Agent/ego without sticky cross-session leakage. |
| 6 | Mirror/Builder/Explorer/Soul parity | Certified mode/Ariad extraction and component suites | rerun_required | Validate missing natural-language activation/boundary pairs; reuse existing surfaces where coordinates suffice. |
| 7 | Context usage parity | Pi usage reducers, exact-session local inspection, model-window snapshot | rerun_required | Compare exact same session in terminal and Nautilus. |
| 8 | Pi-owned compaction and continuity | Deterministic compaction lifecycle/settlement suites | rerun_required | One bounded safe automatic-compaction route or explicit accepted limitation remains. |
| 9 | Durable logging, failure and recovery | [US-3 validation](../cv-002-ds-004-us-3-observable-three-body-turn-commit/validation.md) | accepted_existing | Semantic Mirror records differ from Pi execution bytes by design; native correlation proves the commit. |
| 10 | External exact Pi continuation | [US-4 validation](../cv-002-ds-004-us-4-resume-external-pi-activity-in-nautilus/validation.md) plus generation-1 terminal rerun | rerun_passed | Pi owns ancestry; exact turn projected once and generic divergence warning remained absent. |
| 11 | Mirror-only explicit reconciliation | [US-5 validation](../cv-002-ds-004-us-5-reconcile-mirror-only-updates-into-pi/validation.md) | accepted_existing | Mirror semantic content enters Pi only through explicit hydrated generation. |
| 12 | Alternating three-body conversation | US-3/4/5 anchors plus generations 1–2 timeline | rerun_passed | Final Nautilus turn recovered the terminal-only marker and committed to all three bodies at `in_sync`. |

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
npm test: 26 files, 178 tests passed
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

## Defect Found During Review

A focus observation already in flight when a Nautilus run began could settle against the pre-run checkpoint and make the later fully committed turn inherit a false `pi_ancestry_mismatch`. Observation results now re-check live run/stream state immediately before projection. The controlled state was repaired only after native Harness/Pi/Mirror commit ids and final checkpoints proved the turn complete.

The terminal rerun then proved a second aggregate gap: ordinary terminal Pi and Mirror logging advance independently without native cross-body correlation. Nautilus correctly produced `both_advanced` and an inert review instead of auto-merging, but offered no safe next action and still allowed another prompt. The review now supports an explicit human-reviewed convergence branch that hydrates the already projected Harness transcript without appending the Mirror copy, and blocks further invocation while reconciliation requires attention.

Persona validation exposed that model instructions alone did not prove routing or marker placement. Correlated Nautilus turns now preload exact Mirror context before generation, persist only allowlisted mode/persona evidence, project that evidence independently from model phrasing, and canonicalize late fallback evidence at the message presentation boundary.

## Next Validation Action

Run the remaining paired persona, operating-mode, context-usage and compaction checks. The alternating three-body causal route itself is complete.
