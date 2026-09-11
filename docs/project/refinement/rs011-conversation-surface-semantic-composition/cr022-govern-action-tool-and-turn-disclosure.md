[< RS011 — Conversation surface semantic composition](index.md)

# CR022 — Govern action, tool, and turn disclosure

## Problem

The new semantic turn model needs a predictable relationship between Agent Actions and
tool calls. Long-running tools must remain visible while they execute, but completed
operational detail should not keep the conversation looking like a permanent process
log. The same tension applies across turn history: current work benefits from visible
anatomy, while older conversation should privilege the consolidated exchange.

## Expected Behavior

An Agent Action may own one or many sequential or concurrent tools that serve the same
human-readable intent.

- If any child tool is `running`, its Agent Action is automatically expanded and every
  running tool preserves the current automatically open tool box behavior.
- When no child tool remains `running`, the Agent Action collapses automatically and can
  subsequently be expanded for inspection.
- Successful, failed, interrupted, and cancelled tools settle without leaving an action
  permanently forced open or misreporting active work.
- The complete `Agent Actions`, `System Surfaces`, and `Agent Comments` anatomy is visible
  for the active turn and latest completed turn.
- Earlier turns compact around Agent Comments while retaining a discoverable control that
  restores their actions, tools, and System Surfaces without data loss.

Disclosure is derived from authoritative runtime state, not timers or visual guesses.
Semantic groups remain composed by role rather than interleaved chronologically.

## Impact

This CR depends on the semantic foundation refined in CR021. It affects action-to-tool
grouping, live runtime state, expansion authority, completion and error settlement,
historical turn presentation, restart recovery, keyboard interaction, and persisted
conversation inspection.

Source exploration:

- [Conversation Surface Semantic Turn Model](../../explorations/conversation-surface-semantic-turn-model/index.md)

## Assessment Questions

- What exact event boundary assigns one or many tool calls to an Agent Action?
- Can multiple actions own running tools concurrently, and how is each action settled?
- Does manual expansion during execution survive automatic collapse after the final tool
  settles, or does runtime authority always return the action to collapsed state?
- When exactly does the previous latest-completed turn become historical and compact?
- What compact indicator communicates hidden action and System Surface counts accessibly?
- How are expansion choices reconstructed after restart without preserving stale running
  state?

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- This capture does not select focus, approve a plan, assign a Driver, choose Delivery,
  authorize implementation, or authorize push, publication, release, or installation.
- CR021 must establish the semantic turn model before this disclosure behavior is treated
  as implementation-ready.
- This CR preserves existing provider-error and quiet-finalization settlement contracts.
- It must not hide a running tool, discard historical actions or surfaces, or restore a
  stale running state after restart.
- Highlighted-block copy behavior belongs to CR023.

## Proposed Plan

Not planned. Builder assessment and explicit Navigator approval are required before this
CR can move to `planned`.

## Proposed Acceptance

Not yet approved. Acceptance must cover sequential and concurrent tools, every terminal
tool state, automatic and manual expansion, active and historical turns, restart
recovery, accessibility, and regression protection for current running-tool visibility.
