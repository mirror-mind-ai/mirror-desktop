[< RS021](index.md)

# CR086: Suppress Transient Synchronization Notices

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr086-suppress-transient-sync-notice`

## Problem

The conversation surface can briefly display a synchronization warning while Mirror Desktop is still repairing or reconciling a transient persistence state. In practice this appears as a flicker: the message catches the Navigator's attention, occupies the area above the Composer, and then disappears without requiring any user action.

The selected evidence image shows the current transient surface:

- title: `Conversation synchronization needs attention`
- body: `The agent is inactive, but Mirror Desktop could not complete the preserved persistence path.`
- action/status: `Repairing conversation synchronization…`
- detail: `mirror_append_item_conflict`

When this state is transient and self-repairing, it creates noise rather than value. It also weakens trust by presenting a recoverable implementation detail as if the user needs to intervene.

## Expected Behavior

Synchronization notices are user-visible only when there is durable evidence of a real synchronization failure that needs attention. Short-lived, self-repairing, or in-flight reconciliation states must not flicker into the main conversation surface.

The ordinary healthy path is quiet:

- transient repair can run without showing the warning surface;
- successful self-repair leaves no visible debt;
- the Composer remains visually stable;
- permanent or unrecoverable synchronization failure still surfaces clearly.

## Proposed Scope

- Characterize the current state machine that decides when to show conversation synchronization notices.
- Distinguish transient/in-flight repair from durable synchronization failure.
- Gate the visible notice on persistent failure evidence rather than momentary reconciliation state.
- Keep diagnostic detail available for real failures and developer inspection.
- Add tests for transient repair silence and permanent failure visibility.

## Acceptance

- A transient synchronization repair does not render the `Conversation synchronization needs attention` notice.
- If reconciliation succeeds, no warning is shown at any point that requires Navigator attention.
- A real durable/permanent synchronization failure still renders an actionable notice with details.
- The fix does not suppress provider errors, send rejection notices, or other non-sync user-visible failures.
- Automated tests encode the distinction between transient repair and durable failure.

## Exclusions

- No change to Pi JSONL, Mirror database, outbox, journal, or transcript authority.
- No hidden retry of agent/model/provider work.
- No automatic conversation rewrite, compaction, split, or data migration.
- No release, push, publication, or beta promotion authority.

## Diagnosis (2026-09-24)

Three blocks in `src/app/App.tsx` render the synchronization attention copy. Only the
recovery panel is gated by the CR065 rule (durable debt plus failure evidence). The
retained-lease block and the standalone commit-error block render on the presence of a
Journey error string alone, with no durable-debt gate and no persistence requirement.

That string is written on the first failed attempt, not on persistent failure:

- the Journey hydration effect runs automatic convergence on every Journey switch,
  occupancy change or runtime-busy change and records any non-lease error immediately;
  the next run shows `Repairing…` and clears on success, which is the observed flicker;
- exact settlement errors are recorded per item inside the convergence loop before the
  overall outcome is known, and are projected into the same Journey error string;
- Journey error strings survive Journey switches while outbox and journal state are
  reset, so returning to a Journey re-shows a stale transient error until the next
  convergence clears it;
- `Repairing conversation synchronization…` is an in-flight state presented as an
  alert title.

The `mirror_append_item_conflict` reason itself is tracked separately as CR087.

## Plan

1. New domain module `src/domain/synchronizationAttention.ts`: a per-Journey attempt
   ledger (`recordSynchronizationAttempt`) and a pure gate
   (`deriveSynchronizationAttention`). Attention requires durable debt for the selected
   Journey and failure that persisted: at least two consecutive failed attempts since
   the last success, or one failure older than a bounded window (10 s). An in-flight
   attempt is never attention by itself. A read failure of the durable evidence store
   counts as attention without debt, because debt cannot be derived.
2. The contract world fixture (`src/tests/fixtures/convergentTurnWorld.ts`) models the
   ledger with a controllable clock. New CR064 scenes: a single transient failure that
   self-repairs never shows the notice; a failure that persists through a second attempt
   or past the window shows it; navigating away and back after repair keeps it hidden.
3. `App.tsx` replaces the per-Journey error string state with the ledger. Every
   convergence entry point (hydration, live finalization failure, manual repair,
   post-terminal recovery) records an attempt outcome. The three notice blocks and the
   Composer status all derive from the single gate. The in-flight title is removed; the
   `Repairing…` label stays only on the button inside an already legitimate notice.
4. Exact settlement errors remain the detail text for a legitimate notice and are no
   longer failure evidence on their own.
5. Source-text assertions that describe the old wiring are updated to the new module.

## Implementation Evidence (2026-09-24)

Delivered on `refinement/rs021-cr086-suppress-transient-sync-notice`.

- **New domain module** `src/domain/synchronizationAttention.ts`. A per-Journey ledger
  (`beginSynchronizationAttempt`, `recordSynchronizationAttempt`) and one pure gate
  (`deriveSynchronizationAttention`). Constants: two consecutive failed attempts, or one
  failure older than 10 s with no retry in flight. Success clears the ledger; an
  active-lease refusal is a deferral and leaves failure counts untouched; a read failure
  of the outbox counts as attention without derived debt.
- **App wiring** in `src/app/App.tsx`. The per-Journey error string state is gone. The
  ledger is fed by every convergence entry point: Journey hydration, live finalization
  success and failure, manual repair, post-terminal recovery and preserved-response
  recovery. Durable debt and attention are derived once, before navigation presentation,
  and feed the three notice blocks, the Composer status, recovery routing and the
  legacy-gap classification. Exact settlement errors are projected into the notice
  detail only when attention is already legitimate. The `Repairing…` copy is no longer a
  title; it is the button label inside an already visible notice. A bounded timer
  re-evaluates a single aging failure exactly at the window deadline.
- **No change** to the turn journal, outbox, Rust commands, coordinator routines or
  Mirror Core. `convergeDelivery` still records exact errors per item; the gate makes them
  harmless on their own.
- **Tests.** `src/tests/synchronizationAttention.test.ts` (11 cases). The CR064 contract
  world now models the ledger with a controllable clock, and gained five scenes: first
  failure stays internal, transient failure that self-repairs never shows, failure
  persisting through a second attempt shows with reason, single failure aging past the
  window shows, resolved failure does not re-show after navigating away and back. One
  source-text assertion was updated to the new gate.

## Validation

- `npm test`: 171 files, 1020 tests green.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.
- Dev bundle built with `npm run tauri:build:dev -- -- --locked` and installed at
  `/Applications/Mirror Desktop Dev.app` for Navigator homologation.

Navigator homologation pending. Suggested route: run several turns in a Journey that
previously flickered, switch between Journeys repeatedly, and confirm no synchronization
notice appears; then, if desired, force a persistent failure and confirm the notice with
details and the repair action still appears.

## Evidence

- User-selected screenshot: `/Users/alissonvale/Desktop/Captura de Tela 2026-09-23 às 15.04.17.png`.
- Observed UI copy: `Conversation synchronization needs attention` with `Repairing conversation synchronization…` and detail `mirror_append_item_conflict`.
- Navigator report: the notice appears frequently as a flicker and provides no value when transient.
