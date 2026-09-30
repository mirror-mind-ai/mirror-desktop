[< RS021](index.md)

# CR099: Allow Safe Editing During Another Journey's Work

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

When an agent is working in one Journey, the Navigator cannot edit another Journey. The interface
applies a global busy restriction where the relevant safety question is Journey-local.

## Outcome

A run in Journey A blocks only mutations that would conflict with Journey A or global runtime
invariants. Safe edits to Journey B remain available and correctly scoped to B.

## First Investigation

Characterise every disabled Journey edit control while another Journey is active. Separate genuine
shared-resource or hierarchy constraints from a global presentation guard, then test the native
mutation boundary independently of the UI.

## Acceptance

- With work active in Journey A, the Navigator can perform a safe edit to Journey B.
- Journey A's own unsafe edits remain unavailable or fail closed with a truthful reason.
- Editing Journey B never changes the active run's Journey, authority, prompt, process or
  conversation.
- The result remains correct across selection changes and app restart.

## Boundaries

No loosening of run cancellation, process admission, delete safety or exact-Journey authority. This
CR is about cross-Journey scope, not permission to mutate an actively executing Journey.
