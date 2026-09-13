[< RS016](index.md)

# CR029 — Restore responsiveness for long conversations

## Problem

As the conversation associated with the `mirror-desktop` Journey has grown, typing in the composer has become noticeably slow. Switching away from that Journey and returning to its long conversation has also become slow.

The observed symptoms indicate that conversation length may be causing excessive work during input updates, conversation rendering, restoration or navigation. The exact cause is not yet established. Other side effects of long conversations have not yet been characterized.

## Expected Behavior

- Composer typing remains responsive even when the selected Journey has a long conversation history.
- Switching back to a Journey with a long conversation completes within a usable and predictable interval.
- Investigation identifies which rendering, projection, persistence, reconciliation or derived-state paths scale with conversation size.
- Other user-visible or operational effects of long conversations are characterized before choosing an implementation adjustment.
- Any optimization preserves complete conversation history, semantic turn composition, Steering evidence, exact Journey authority and restart behavior.

## Impact

Slow keystroke feedback interrupts prompt composition and makes the application feel unreliable during sustained use. Slow conversation switching weakens navigation between Journeys and suggests that continued conversation growth may produce additional responsiveness, memory or lifecycle costs.

## Plan Or Decision

Captured for investigation under RS016. Selection, profiling scope, implementation strategy and acceptance thresholds remain pending. No root cause, virtualization strategy, pagination boundary, truncation policy or persistence migration is assumed by this capture.

## Evidence

Navigator report during continued use of Mirror Desktop:

- typing in the composer became slow in the long `mirror-desktop` Journey conversation;
- switching to another conversation and returning to the long `mirror-desktop` conversation also became slow;
- investigation should include other possible side effects of long conversations and implementation-level adjustment options.

## Outcome

Pending selection, planning and implementation.
