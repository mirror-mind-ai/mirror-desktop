[< Refinement Workbench](../index.md)

# CR019 — Settle provider errors without permanent Working state

## Problem

During isolated alpha validation in `Sandbox Pet Store`, Pi returned an assistant provider error and exited without a complete assistant answer. Mirror Desktop retained the turn as `running`, had no live Pi child, and displayed `Working…` indefinitely.

The exercised model was `openai-codex/gpt-5.4-mini`, which the active ChatGPT-backed Codex account rejected as unsupported. Model support is configuration feedback; permanent runtime activity is a separate lifecycle defect.

## Expected Behavior

A provider error that produces no complete assistant answer must become a bounded failed terminal outcome. The stream must close, the UI must leave `Working…`, the failed turn must follow normal interrupted settlement, and the user must receive a visible failure without fabricated assistant content.

## Impact

The visible application appears hung after the native Pi child has already exited. The durable turn remains recoverable, but the user cannot distinguish provider rejection from ongoing work.

## Plan Or Decision

Navigator authorized capture and implementation on 2026-09-09. Driver is `@alissonvale`; Delivery is `refinement/rs009-cr010-shift-enter-line-breaks`.

Treat a zero process exit as `completed` only when the exact Pi session contains a complete user/assistant turn suitable for durable completion evidence. If Pi exits successfully after an assistant `error`, or otherwise without complete terminal evidence, classify it as `process_died`, emit a bounded error, durably terminalize the journal, and then emit `done` through the existing settlement route.

Do not persist provider error text as assistant content and do not weaken the rule that a completed turn requires exact Pi execution evidence.

## Acceptance

- Zero exit plus complete Pi turn evidence remains `completed`.
- Zero exit without complete Pi turn evidence becomes a failed terminal outcome.
- Explicit cancellation remains `cancelled` regardless of completion evidence.
- Provider failure durably advances the journal out of `running`.
- The frontend stream receives terminal closure and leaves `Working…`.
- No empty or fabricated assistant answer is committed.
- The failed user turn remains recoverable through existing interrupted-settlement behavior.

## Evidence

Observed in isolated development state:

- the Pi JSONL ended with an assistant entry whose `stopReason` was `error` and whose usage was zero;
- the provider reported that `gpt-5.4-mini` was unsupported for the active ChatGPT account;
- no Pi child remained under `Mirror Desktop Dev`;
- the exact turn-journal record remained at revision 2, phase `running`;
- the running Dev process predated the latest CR011 bundle and therefore did not validate CR011.

Implementation adds a terminal classifier test covering completed, provider-failed, and cancelled outcomes. The native worker now requires complete Pi execution evidence before classifying a zero exit as completed; an evidence-free zero exit becomes `process_died`, receives a bounded diagnostic, durably terminalizes, and emits the existing `done` event.

Automated and recovery evidence:

- 108 Rust tests passed;
- `cargo check` passed;
- `npm run build` passed as part of the isolated bundle build;
- `npm run tauri:build:dev` produced the updated Dev app and DMG;
- the stale Dev process was no longer running before replacement launch;
- the reopened Dev process loaded the exact inode of the newly built executable;
- startup recovery advanced the abandoned Sandbox turn from revision 2 `running` to revision 3 `interrupted` without deleting its durable evidence;
- `git diff --check` passed.

## Outcome

Navigator validation is pending.
