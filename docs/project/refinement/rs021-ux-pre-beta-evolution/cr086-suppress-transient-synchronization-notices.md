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

## Evidence

- User-selected screenshot: `/Users/alissonvale/Desktop/Captura de Tela 2026-09-23 às 15.04.17.png`.
- Observed UI copy: `Conversation synchronization needs attention` with `Repairing conversation synchronization…` and detail `mirror_append_item_conflict`.
- Navigator report: the notice appears frequently as a flicker and provides no value when transient.
