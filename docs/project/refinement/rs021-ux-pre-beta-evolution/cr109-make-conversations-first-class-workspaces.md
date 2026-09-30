[< RS021](index.md)

# CR109: Make Conversations First-Class Workspaces

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The daily experience of working with the agent inside a Journey conversation is unstable. Four
observed symptoms are one product-level problem: the Desktop does not consistently distinguish the
Journey container, its conversations and the work actually owned by a conversation.

1. **Conversation list has no workable visibility control.** The sidebar shows many conversations
   that are no longer in focus: old work and imported Mirror Core history compete with active work.
   The Navigator cannot quickly hide and later reveal them without treating them as deleted.
2. **Runtime status belongs to the wrong level.** `Working`, `Ready` and related status signals are
   attached to the Journey even when the work is happening in one conversation below it. This is
   misleading in the sidebar, Journey header and above the Composer.
3. **Parent work is blocked by child work.** When a conversation is `Working`, the Navigator cannot
   send work to the parent Journey. Distinct workspaces are treated as one busy owner.
4. **Sidebar navigation changes selection when it should change only expansion.** Switching to
   another Journey collapses the original Journey's conversation list, losing direct access to the
   work in flight. Reopening that list by its disclosure arrow also selects the parent Journey and
   loads it, even when the Navigator wanted only to reveal its conversations. This makes stable
   alternation among concurrent work in several Journeys or conversations impossible.

## Outcome

A Journey is a durable container and a conversation is a first-class workspace within it. The
Navigator can keep active work visible, distinguish its exact owner, work in an independent parent
workspace while a child conversation runs when native authority permits it, and expand/collapse
sidebar structure without changing selection or losing access to ongoing work.

## First Investigation

Characterise before changing presentation or admission:

1. Inventory the conversation catalog, including dedicated Desktop conversations, Mirror Core
   history and their current source/provenance, lifecycle and persistence coordinates. Establish
   which states may be hidden safely without deleting or mutating their authority.
2. Trace identity through sidebar rows, headers, Composer status and `JourneyRuntimeState`: identify
   whether current runtime entries are keyed by Journey, conversation, generation or run, and where
   ownership is deliberately collapsed.
3. Map actual native admission constraints: Pi process capacity, exact Journey/thread/generation
   authority, parent workspace provisioning, and same-conversation exclusion. Do not infer that
   “different conversations” automatically means safely concurrent.
4. Trace sidebar selection, expansion and persistence separately. Reproduce the exact sequence:
   active conversation → select another Journey → return/disclose original Journey, and record every
   state transition that selects or reloads a workspace.
5. Compare a current Desktop conversation, a parent Journey workspace and a Mirror Core history
   entry. The visibility model must preserve provenance and never represent a hidden imported record
   as deleted or a selected parent as the active child.

## Acceptance

- The Navigator can hide a conversation from the sidebar's ordinary working set and reveal it again
  through an explicit, discoverable control; hiding is reversible and does not delete, retire,
  mutate, merge or lose its transcript, Mirror provenance, thread or run evidence.
- The sidebar, selected-workspace header and Composer name runtime status at the conversation/workspace
  that owns it. A parent Journey does not read `Working` merely because a child is working; aggregate
  Journey state, if shown, is explicitly aggregate rather than impersonating the child.
- Work in a parent Journey workspace can be admitted while a child conversation works when exact
  native admission and authority permit it. A genuine shared constraint names itself precisely
  (capacity, same workspace, generation or process authority) rather than using a generic global
  busy state.
- Expanding or collapsing a Journey's conversation disclosure never changes selected Journey,
  selected conversation, Composer target, loaded transcript or run ownership. Selection and
  structural visibility are separately operable with keyboard and pointer.
- Changing selected Journey does not silently collapse unrelated expanded conversation groups that
  contain active work. The Navigator can return to an active conversation directly from the sidebar.
- Old Desktop conversations and Mirror Core history remain distinguishable by provenance in any
  visibility/reveal surface.
- Reload preserves visibility choices and selected-workspace truth without fabricating a run owner
  or losing access to an active native process.

## Boundaries

No automatic deletion, archival, migration or pruning of conversations. No changes to Pi/Mirror
transcript authority. No fabricated concurrency: distinct visual workspaces may run together only
where native process capacity and exact Journey/thread/generation authority admit them. This CR does
not turn a disclosure click into selection, a hide into a delete, or a parent aggregate into a child
runtime claim.
