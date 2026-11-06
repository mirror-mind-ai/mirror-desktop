[< RS028](index.md)

# CR099: Allow Safe Editing During Another Journey's Work

**Status:** done
**Driver:** @alissonvale
**Delivery:** `main` (`03e38bbc`), RS028 group C; validated 2026-11-06
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

## Census (2026-11-06)

Every control the app-wide guard reached, with the verdict delivered for each. "Gate removed" means
the control no longer consults a turn at all.

| Control | Site | Verdict |
| --- | --- | --- |
| Create Journey, tree menu, sidebar footer, item menu | `App.tsx` `openCreateJourney`, `JourneyItemContextMenu` | gate removed |
| Edit Journey | `openEditJourney` | gate removed |
| Move Journey | `openMoveJourney` | gate removed |
| Drag to reparent | the `journey-item` `draggable` | gate removed |
| Appearance, system icon and custom image | `applyJourneySystemAppearance`, `chooseJourneyCustomAppearance` | gate removed |
| Reload Journey tree | `reloadJourneyTree` | gate removed |
| Pin or unpin | `togglePinnedJourney` | was never gated |
| Project path, set and clear | `executeJourneyMutation` | allowed, with a note on the running Journey |
| Delete Journey | `openDeleteJourney`, `executeJourneyMutation`, the item menu | **refused** for a working subtree or an unreadable lease registry |
| Send, restart, compaction, self-update, provider session controls, file drop | various | out of scope; `runtimeBusy` keeps them |

### What was read to decide

- The native mutation `mutate_journey_registry` never had a busy guard of its own. Its guards are
  0.2's and they are about the data, not about a turn: a Journey with dedicated conversation history
  refuses deletion, and deleting the active Journey demands an explicit replacement.
- The host answers one request at a time, in order, and the Rust side holds the host behind a mutex
  while a request is in flight. A tree mutation sent during a *streaming* turn finds no host call in
  flight and goes straight through. During settlement it queues behind the append. A hung append
  (CR163) would therefore hold a tree mutation too. That is a wait, not a wrong answer, and the
  right repair belongs to CR163 rather than to a disabled button.
- `reconcileReloadedJourneyState` only drops ids that disappeared and moves selection only when the
  selected Journey is gone. Selection already moves freely during a run, because runtime state is
  keyed per workspace, so reloading the tree during a turn is safe.

### Why these two refusals

Deleting is the one tree operation that cannot be undone and that takes a run's destination away. An
unreadable lease registry is the one state where no Journey can be cleared of a running agent, so it
refuses the irreversible operation and nothing else: making the person wait for a registry read
before renaming a Journey would be the old global guard with a new name.

## Falsifiers

- With a turn streaming in Journey A, create, rename, move, drag, repaint and reload remain
  available on A and on every other Journey.
- Deleting a Journey with a working agent, or whose descendant has one, is disabled and the control
  says which Journey is working.
- Deleting a sibling of a working Journey is available.
- Changing the running Journey's project path succeeds, says the next turn is when it applies, and
  the turn in flight keeps running where it started.
- The mutation refuses on its own: a delete reaching `executeJourneyMutation` for a working Journey
  fails with the reason in the dialog, even if the menu item were enabled.
