[< Refinement Workbench](../index.md)

# CR011 — Context usage percentage is slow or missing

## Problem

During Mirror Desktop alpha usage, the message that shows the context usage percentage either takes too long to calculate or frequently does not show the percentage at all.

## Expected Behavior

context percentage should appear reliably and with acceptable latency when the app presents context usage information.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Assessment

The architecture is directionally correct: Pi remains the context authority, live Pi JSON events are the fast path, the mapped local Pi JSONL is the recovery path, and the model catalog supplies the denominator. No provider call or independent Desktop tokenizer is needed.

The observed latency is not evidence of remote computation. The current implementation has several local coordination and state defects:

1. A persisted snapshot is treated as available before its `providerModel` is checked. The render path then rejects that same snapshot on model mismatch, while the load effect returns early and never repairs it. This can leave the footer waiting indefinitely after a model change.
2. `waiting`, file absence, model mismatch, read failure, and a genuinely not-yet-produced provider usage are collapsed into one UI outcome. The one-shot load has no bounded retry for a JSONL append race and no post-turn reconciliation when the live usage event is absent.
3. The fallback read is blocked by global runtime occupancy, including another Journey or finalization work, even though it is an asynchronous read-only operation. This couples local context visibility to unrelated process settlement.
4. The backend receives only a session id, scans the global Pi session directory by filename suffix, selects by modification time, and reads the entire selected JSONL. The active generation already owns the exact `piSessionFile`; not using it weakens both latency and authority.
5. The restore parser scans physical JSONL order rather than reconstructing Pi's active branch. Dedicated Desktop sessions are expected to be linear, but the fallback is not fully equivalent to Pi's `getContextUsage()` when branch history exists.
6. Coverage is strong for isolated event mapping and token reconstruction fixtures but weak for the application state machine. There are no behavioral tests for stale-model cache rejection, waiting-to-available races, missing live events, exact-file authority, or cross-Journey occupancy.

Pi's own algorithm confirms that the token computation is cheap and local: use the latest valid assistant usage, add conservative estimates for trailing messages, and report unknown after compaction until a later valid assistant usage exists. The implementation substantially mirrors that algorithm. The dominant issue is when and from which exact authority the snapshot is accepted, not arithmetic cost.

## Proposed Plan

This plan is proposed for Navigator review; CR011 remains `captured` until an explicit status and assignment decision.

1. Extract a tested context-usage state machine keyed by `journeyId + piSessionId + generation + providerModel`. Accept a cache only when the complete key matches.
2. Keep live Pi usage events as the immediate authoritative update path. After terminal settlement, reconcile from the exact active `piSessionFile` if no matching live update was observed.
3. Replace the session-directory scan with the recorded file path and validate it against the active generation before reading. Preserve asynchronous execution and never launch Pi solely to inspect context.
4. Add a short bounded retry only for a present session file that has not yet exposed valid post-turn usage. Do not poll indefinitely and do not fabricate a percentage.
5. Decouple read-only context inspection from unrelated global invocation occupancy. Session identity and generation, rather than global busyness, must prevent stale writes.
6. Preserve distinct presentation states: checking, last confirmed/updating, waiting for first provider usage, unknown after compaction, model window unavailable, and inspection failed. Keep tokens visible when the denominator is unknown.
7. Match Pi's active-branch semantics in JSONL restoration or explicitly prove and enforce that dedicated sessions cannot branch.
8. Add state-machine, Tauri authority, sanitized protocol, compaction, model-switch, race, and cross-Journey tests before implementation acceptance.

## Proposed Acceptance

- A matching persisted snapshot renders immediately on conversation load.
- A stale-model snapshot cannot suppress repair and is never rendered under a different model identity.
- The first valid assistant usage updates the footer during the turn or immediately at terminal reconciliation.
- A dropped or unrecognized live usage event is repaired from the exact active JSONL without restarting Pi.
- Another Journey's running or finalizing lease does not delay read-only inspection of the selected Journey.
- Post-compaction usage remains explicitly unknown until Pi provides valid post-compaction evidence.
- Unknown context windows show token usage without inventing a percentage.
- Every non-available state has a truthful, distinguishable reason and bounded transition behavior.

## Implementation

Navigator approved the plan and authorized execution on 2026-09-10. Driver is `@alissonvale`; Delivery is `refinement/rs009-cr010-shift-enter-line-breaks`.

Implemented behavior:

- centralized complete-key cache acceptance and context-state transitions in `src/app/contextUsageState.ts`;
- changed live Pi usage to update footer state immediately, including explicit post-compaction unknown state;
- retained the last confirmed percentage as `updating` during a subsequent live turn;
- added bounded retry for first-usage JSONL write races, without retrying missing files, compaction unknown state, or failures indefinitely;
- reconciled after stream completion rather than waiting for global invocation/finalization occupancy to become empty;
- changed the Tauri boundary to require and validate the active generation's exact `piSessionFile`, session id, Journey id, and generation;
- removed the global session-directory suffix scan and changed session-header validation to read only the first line;
- reconstructed context from the active JSONL ancestry branch rather than all physically appended branches;
- exposed distinct footer language for first usage, post-compaction unknown state, missing session, model mismatch, inspection failure, and unknown context window.

## Evidence

Code review traced the current path through:

- `src/agent/piProcessStream.ts`: Pi `message_update` / `message_end` usage mapping and read bridge;
- `src/app/App.tsx`: identity filtering, cache acceptance, load timing, persistence, and percentage derivation;
- `src/app/ComposerRuntimeFooter.tsx`: visible waiting and availability states;
- `src-tauri/src/main.rs`: directory lookup, JSONL reconstruction, compaction handling, and token arithmetic;
- the installed Pi runtime: JSON mode emits top-level `message_update.usage`, final `message_end.message.usage`, and Pi's `getContextUsage()` uses latest valid assistant usage plus estimated trailing messages.

No production files, user conversations, or runtime databases were inspected or mutated for this assessment.

Implementation checks:

- 632 frontend tests passed across 114 files;
- 107 Rust tests passed;
- `npm run build` passed;
- `cargo check` passed;
- `npm run tauri:build:dev` produced the isolated `Mirror Desktop Dev.app` and DMG;
- `git diff --check` passed.

No user-channel application, updater configuration, production data, or release artifact was changed.

## Validation

Navigator confirmed in the isolated development bundle that context usage now appears and updates successfully after a supported-model turn. This validation followed restart into the newly built Dev executable and is distinct from the earlier unsupported-model lifecycle failure captured by CR019.

## Proportionality And Debt Review

The implementation is proportional to the observed defects: it retains Pi as the sole context authority, narrows recovery to the exact active session file, and adds a small explicit frontend state machine rather than introducing another tokenizer, provider request, or polling service.

No new technical debt was introduced. Full-file JSONL reconstruction remains linear in active session history, as Pi's current context reconstruction is; future optimization should require measured evidence rather than speculative indexing.

## Outcome

CR011 is Navigator-validated. Terminal closure as `done` remains a separate explicit Workbench decision.

## Migration Provenance

- Legacy record: `38e19ddb`.
- Created: `2026-09-09T10:33:25.361771Z`.
- Last updated: `2026-09-09T10:33:25.361771Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
