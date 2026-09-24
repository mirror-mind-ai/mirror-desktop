[< RS021](index.md)

# CR081: Agent Running Animation

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Journey pin icon is doing too much. It would work better if the visible animated affordance represented agent execution status, while pinning had its own distinct control. Today the pin shape can be confused with active-run state.

## Expected Behavior

Active agent execution has a dedicated animated status indicator. Pinning remains available as a separate, stable affordance that does not carry run-state meaning.

## Proposed Scope

- Separate pin state from active/finalizing/running agent state in the sidebar presentation.
- Design an animated execution icon that is visible, calm and accessible.
- Add or reposition a distinct pin control.
- Preserve existing pin semantics and preferences.

## Acceptance

- Running/finalizing state is recognizable without overloading the pin icon.
- Pin/unpin remains available and does not trigger navigation or agent control.
- Animation is accessible and does not harm light/dark theme contrast.

## Exclusions

- No change to process admission or cancellation semantics.
- No hidden auto-follow or focus change caused by the status animation.
