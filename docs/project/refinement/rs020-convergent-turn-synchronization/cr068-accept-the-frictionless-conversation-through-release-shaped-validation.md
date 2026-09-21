[< RS020](index.md)

# CR068: Accept the Frictionless Conversation Through Release-Shaped Validation

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs020-cr068-release-shaped-acceptance`

## Problem

Previous acceptances homologated single turns or isolated repairs; both CR063 false positives were discovered by the Navigator in ordinary multi-turn use after acceptance. RS020 must not close on component evidence.

## Expected Behavior

Release-shaped validation of the essential journey on the RS020 line:

1. full automated gates: CR064 contract, complete frontend suite, Rust suites for Stable and Eval feature sets, build, roadmap consistency, whitespace;
2. an Eval candidate built and atomically installed without launching, Stable closed;
3. Navigator homologation in Eval on production data: five consecutive turns in the `mirror-desktop` Conversation with zero synchronization notices, navigation away and back, application restart with clean rehydration, and one controlled append-failure recovery in an isolated fixture (not production);
4. durable evidence recorded: journal, outbox and Mirror agreement for every homologated turn, executable hashes and artifact paths.

## Acceptance Horizon

- All four steps recorded with evidence in this document.
- Any friction observed during homologation reopens the responsible CR; CR068 cannot absorb fixes.
- RS020 closure, push, merge, Alpha.14 packaging, publication and Stable promotion remain separate Navigator decisions after acceptance.

## Boundaries

Production data is read-only during homologation except ordinary conversation use. Failure injection happens only in isolated fixtures. No provider or model substitution.

## Step 1 — Automated Gates (2026-09-21)

- CR064 contract: 9 scenarios green through the real coordinator and convergence routine, including the no-op proof and injected append-failure recovery in isolated fixtures.
- Complete frontend suite: 161 files, 916 tests.
- Rust: 162 passed plus 1 ignored under the Stable feature set; 162 passed plus 1 ignored under `evaluation-channel`.
- TypeScript/Vite build passed; roadmap consistency `READY`; `git diff --check` clean.

## Step 2 — Eval Candidate Installation (2026-09-21)

Stable and Eval verified closed before and after; the candidate was built from the RS020 line and atomically installed without launching.

- application: `~/Applications/Mirror Desktop Eval.app`
- bundle name: `Mirror Desktop Eval`; identifier: `ai.mirrormind.desktop`
- executable SHA-256: `b9a3199d14d464fb33008500b72fa3ccda75f2b92f601b7b5abfa89685fa417e`
- local evidence: `/private/tmp/cr068-eval-20260921T022900Z`

## Step 3 — Navigator Homologation: FAILED (2026-09-21)

The Navigator ran several turns in Eval. Every turn ended showing the Mirror synchronization notice, and the session ended with the recovery panel exposing `mirror_append_item_missing`. Screenshots were supplied at 23:38:59 and 23:40:53 (local).

Read-only durable inspection immediately afterwards proved that **every homologated turn is intact**: journal `settled / completed / complete` for all generation-4 runs through `agent-run-2026-09-21T02:40:27.715Z`, zero Journey outbox items, generation-4 projection with Harness/Pi/Mirror committed for all turns, and all exact message IDs present in Mirror Conversation `20f40b74` (14 messages). Delivery works; the failures are presentational and in convergence robustness:

1. **The notice surfaces the normal settlement window.** Durable debt legitimately exists for the instants between projection, outbox and settlement. The coordinator emits `durable_evidence_changed` at enqueue time, mid-transaction, so the App refreshes journal/outbox presentation into a pending state and shows the notice after `finalization_finished`, until the post-settlement refresh lands. The Navigator's product direction is explicit: synchronization must be internal; the user is told only when a real, persistent failure remains after automatic repair. Responsible: CR065 gating (reopened).
2. **Convergence can attempt an item that no longer exists.** The recovery panel recorded `mirror_append_item_missing` (native outbox lookup failure) even though final durable state shows everything settled: a convergence pass raced an in-flight or just-completed delivery and then failed loudly on the vanished item instead of recognizing the already-converged outcome. Responsible: CR067 robustness plus the CR066 mid-transaction emission (reopened).

Separately observed, outside RS020 scope: one send failed pre-agent with `No models match pattern "claude-bridge/claude-fable-5"` while the footer showed `openai-codex/gpt-5.6-sol`. The GUI surfaced it and returned the message to the Composer. This is evidence for the captured CR053/CR054 model-clarity work.

Per this CR's own rule, the fixes cannot be absorbed here: CR065 and CR067 are reopened, and Step 3 must be repeated on a new candidate.

## Step 2 (repeated) — Corrected Eval Candidate (2026-09-21)

After the CR065 and CR067 reopening corrections, all gates were repeated: CR064 contract with 11 scenarios (including the two new failure-mode scenes), 918 frontend tests, Rust 162 + 1 ignored under both feature sets, build, roadmap `READY`, whitespace clean. A corrected candidate was atomically installed without launching, Stable and Eval closed.

- executable SHA-256: `a3c0fe84b1840c719c107b890feee87bd5ce6961b9eaaf8d1557cabe4d59bae4`

## Step 3 (repeated) — Navigator Homologation

Pending. Same script; additionally confirm that no synchronization notice appears at the end of ordinary turns.

## Step 4 — Durable Evidence

Pending the repeated Step 3.
