[< RS028](index.md)

# CR099: Allow Safe Editing During Another Journey's Work

**Status:** captured
**Driver:** —
**Delivery:** —
**Group:** C, reshaping the tree

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

## Finding appended from CR140 (2026-10-10)

The app-wide block this CR exists to narrow is `runtimeBusy` at `App.tsx:1106`–`:1108`, and it has
**two** global sources, not one: `hasBlockingPiInvocationOccupancy` (an active lease in any Journey
in the native registry) and `navigationPresentation.runtimeBusy`, which is
`hasActiveOrFinalizingJourneyRuntime(runtimeState)` (an entry in any workspace in the renderer's
runtime map). Narrowing either alone changes nothing. What `runtimeBusy` gates is file drop,
conversation restart, reload tree, create and edit Journey, appearance and attachments — not Send,
which is already workspace-scoped through `conversationAvailability`. CR140 deliberately left this
reach untouched; it is this CR's to plan against both predicates.

## Direction widened by the Navigator (2026-11-05)

No operation on the Journey tree should be blocked because a turn is running, anywhere, unless there
is a very strong reason, and that reason is then named on the control. This includes the running
Journey itself, not only its siblings. The investigation therefore lists every tree operation gated
by `runtimeBusy` (create, edit, move, drag, delete, reload tree, appearance, pin) and, for each,
either removes the gate or records the strong reason. Candidates the Driver expects to keep, to be
confirmed by measurement rather than assumed:

- Deleting a Journey, or a subtree (CR204), that contains a running agent: the run would lose its
  destination.
- Changing the project path of the Journey whose turn is running: the running turn keeps its cwd, so
  this may be allowed with a note that it takes effect on the next turn.

Moving or renaming a running Journey changes metadata only and is expected to be allowed.
