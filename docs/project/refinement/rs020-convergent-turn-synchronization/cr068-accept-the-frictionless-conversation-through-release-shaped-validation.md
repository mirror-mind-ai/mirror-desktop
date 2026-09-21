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

## Step 3 — Navigator Homologation

Pending. Script: open Eval with Stable closed, select the `mirror-desktop` Journey, run five consecutive turns with zero synchronization notices, navigate away and back, restart the application and confirm clean rehydration.

## Step 4 — Durable Evidence

Pending Step 3.
