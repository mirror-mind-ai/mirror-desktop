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

## Authority Boundary

Capture, selection, Driver `@alissonvale`, Delivery `refinement/rs016-cr063-align-sync-notice-projection`, planning and implementation were explicitly authorized on 2026-09-20. Production mutation, acceptance, closure, push, merge, publication, release and Stable installation remain separately governed.
