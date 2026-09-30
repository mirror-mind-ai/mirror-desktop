[< RS021](index.md)

# CR106: Use Green for Ready Completion Signals

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

After an agent finishes work, icons and labels in the `Ready` completion state do not use the green
success register. Completion is therefore less immediately legible than it should be.

## Outcome

The visible `Ready` completion signals use the established green success colour consistently, while
remaining distinguishable for selection, focus, light theme and non-colour readers.

## First Investigation

Inventory every `Ready` icon and label across sidebar, header and relevant Conversation surfaces.
Confirm the state source and existing theme tokens before changing colour, so a local styling change
does not make stale or non-completion states look successful.

## Acceptance

- Ready icons and labels use the same green completion register wherever `Ready` is shown.
- The signal remains readable in light and dark themes, selected and unselected Journey rows, and
  reduced-motion mode.
- Text, accessible name or another non-colour cue continues to distinguish Ready from Working,
  Finishing, Idle, failure and interruption.
- The change does not alter the duration or durability semantics of Ready.

## Boundaries

No new completion state, notification ledger, runtime transition or process behaviour. This CR is
visual semantics only.
