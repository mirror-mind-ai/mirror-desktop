[< RS016](index.md)

# CR063: Align Synchronization Recovery Notice with the Presented Conversation

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr063-align-sync-notice-projection`

## Problem

After the first generation-4 roadmap turn completed in Eval, the response was visible and every durable persistence surface was settled, but the Composer still showed `Repair Mirror synchronization`.

Read-only production evidence for `agent-run-2026-09-20T23:26:30.149Z` proved:

- journal `settled / completed / complete`;
- no Journey outbox item;
- generation-4 projection with Harness, Pi and Mirror all `committed`;
- both exact message IDs present in Mirror Conversation `20f40b74`.

The visible response can come from `navigationPresentation.conversation`, including the latest runtime conversation snapshot, while `pendingMirrorTurnRepair(...)` is derived from the base `conversation` state. If publication of the settled projection loses a renderer race, the screen can therefore present committed content while recovery classification still reads an older Mirror-pending snapshot. Retrying cannot clear this false positive because there is no durable debt to process.

## Expected Behavior

Synchronization status, recovery classification and the visible Conversation must use one presented projection authority. When the presented current turn is Mirror-committed, Desktop must not show a synchronization repair notice even if an older base renderer snapshot remains pending.

Genuine pending or divergent presented evidence must remain actionable and fail closed. The correction must not acknowledge an outbox item, mutate Mirror, invoke a provider or weaken durable recovery validation.

## Approved Scope and Plan

Authorized by the Navigator on 2026-09-20 together with selection, Driver, Delivery and implementation.

1. Derive pending Mirror repair from the same `presentedConversation` used by the visible Conversation surface.
2. Use that presented projection consistently for message-pair classification and related notice decisions.
3. Add a regression proving that a pending base snapshot plus a committed presented runtime snapshot does not expose `Repair Mirror synchronization`.
4. Preserve existing behavior when the presented projection itself has exact pending Mirror evidence.
5. Run focused and complete frontend gates, TypeScript/Vite build, roadmap consistency and whitespace validation.

## Acceptance Horizon

- A committed presented turn produces no pending Mirror repair or synchronization recovery notice.
- A stale pending base snapshot cannot override a committed presented runtime snapshot.
- A genuinely pending presented turn still produces the existing exact repair route.
- Composer admission remains independent from Mirror synchronization debt.
- No production mutation, provider execution, Pi JSONL rewrite or Mirror Core change.

## Affected Files

- `src/app/App.tsx`
- focused projection/navigation integration tests
- this CR and RS016/Workbench indexes

## Implementation Outcome

The synchronization recovery derivation now reads `presentedConversation`, the same projection selected by `navigationPresentation` for the visible transcript. Exact message-pair classification uses that same projection. A committed runtime snapshot therefore supersedes an older pending renderer snapshot for presentation purposes, while a genuinely pending presented projection retains the existing recovery route.

No persistence or provider path changed.

## Validation

- Red phase: focused `runtimeProjectionComponent` regression failed against the prior raw `conversation` wiring.
- Green phase: focused regression passed after the correction: 15 tests.
- Complete frontend suite: 159 files, 902 tests passed.
- `npm run build`: TypeScript and Vite build passed.
- `node scripts/roadmap_consistency.mjs`: `READY`.
- `git diff --check`: passed.

## Evidence

- Screenshot supplied by the Navigator on 2026-09-20.
- Read-only durable inspection of journal, outbox, generation-4 projection and exact Mirror message IDs.
- Automated regression asserts both positive presented-projection wiring and removal of the stale base-projection wiring.

## Proportionality and Debt Review

**Result:** `no_action` for implementation scope. The correction is a two-reference authority alignment with focused regression coverage; extracting a separate synchronization-presentation abstraction would add indirection without changing policy or reducing current risk.

Eval acceptance remains required before status transition or closure.

## Eval Candidate

With Navigator authorization, a production-authority Eval candidate was built and atomically installed on 2026-09-20 without launching it.

- application: `~/Applications/Mirror Desktop Eval.app`
- bundle name: `Mirror Desktop Eval`
- bundle identifier: `ai.mirrormind.desktop`
- executable SHA-256: `ba780ba3de4ae1fc056e0aac91853fbefbaa961db7a72fc428a4cb2d6123368f`
- Stable and Eval matching processes during installation: none
- local evidence: `/private/tmp/cr063-eval-20260920T210533Z`

## Failed Eval Acceptance: Runtime Snapshot After Automatic Repair

The Navigator initially observed the notice disappear, then reported its recurrence in the same Conversation after later turns. Closure and push were stopped before either action occurred.

Read-only inspection of the latest affected turn, `agent-run-2026-09-21T00:23:47.067Z`, proves that synchronization completed:

- journal `settled / completed / complete` at `2026-09-21T00:25:03.005Z`;
- no Journey outbox item;
- generation-4 durable projection has Harness, Pi and Mirror `committed` for all three retained turns;
- exact user and assistant IDs for the latest turn exist in Mirror Conversation `20f40b74`;
- the latest projection was saved at `2026-09-21T00:25:03.159Z`.

The timing and code path identify a second renderer authority gap. Automatic debt repair calls `publishSettledProjectionIfCurrent(...)`, which reloads and publishes the committed projection into base `conversation` state. It does not replace the matching Journey runtime `conversationSnapshot`. `deriveJourneyNavigationPresentation(...)` intentionally prioritizes that runtime snapshot over loaded/base state, so the presented Conversation can remain Mirror-pending after durable repair succeeds. CR063's first correction then correctly follows the presented projection, but that projection itself is stale.

The required extension is to publish a repaired settled projection to both base state and the exact matching runtime identity. Successor-safe checks must prevent an older repaired run from replacing or quarantining a newer runtime. Regression coverage must model pending runtime snapshot + committed durable repair and prove that the exact runtime snapshot advances while a successor remains untouched.

## Authority Boundary

Capture, selection, Driver `@alissonvale`, Delivery `refinement/rs016-cr063-align-sync-notice-projection`, initial planning and initial implementation were explicitly authorized on 2026-09-20. The failed Eval acceptance and read-only diagnosis were recorded on 2026-09-21. The extension described above requires renewed implementation authorization. Production mutation, acceptance, closure, push, merge, publication, release and Stable installation remain separately governed.
