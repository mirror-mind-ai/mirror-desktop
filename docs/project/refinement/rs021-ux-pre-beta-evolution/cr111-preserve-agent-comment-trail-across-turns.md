[< RS021](index.md)

# CR111: Preserve the Agent Comment Trail Across Turns

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The Agent Comments surface has two incompatible visual grammars for the same kind of work.

While an agent is working, comments appear as a coherent reading trail: aligned points on one
vertical conductor make sequence, continuation and work-in-progress legible. In the observed live
surface, the agent's plan, each file read and truncation continuation belong to one scanable trail.

After the agent finishes and the Navigator sends a following turn, that same material is rendered as
one large Agent card per comment/turn. Each card repeats the agent header, model identity, container
and disclosure affordance. The sequence is fragmented into stacked boxes, making the quieter,
continuous live presentation unavailable precisely when the work becomes history to review.

The issue is not that comments should be hidden or merged into an answer. It is that a faithful
comment trail loses its reading form across the live → settled → subsequent-turn boundary.

## Outcome

Agent comments retain one coherent, accessible trail presentation wherever their structural
relationship is continuous — while live, after settlement, after a subsequent turn and after reload.
Cards remain available only where a genuine turn/workspace boundary needs to be named, not as an
incidental consequence of the stream becoming persisted.

## First Investigation

1. Trace the two render paths shown in the images: live runtime activity / `Agent Comments` trail,
   and settled or reconstructed conversation cards. Identify the exact identity and boundary data
   each receives (run, turn, assistant message, stream boundary, comment order and completion).
2. Establish the structural rule for continuity. Determine when adjacent comments belong to one
   agent turn, one run with intervening operations, distinct turns, a model change, an interruption,
   a compaction chapter or a restored historical segment. Do not infer grouping from prose.
3. Compare the same real Pi-backed comments before completion, after completion, after a following
   user turn and after reload. Record which projection or persistence step discards the existing
   trail boundary.
4. Inventory interaction currently carried by a card: model attribution, copy action, turn details,
   action count, keyboard order, accessible names and focus. The trail must preserve or relocate
   these without making every comment a card again.
5. Test long trails, one-comment turns, comments separated by operations, interrupted runs and
   comments from adjacent models. The live and restored reading forms must express distinctions
   that are structurally true.

## Acceptance

- A contiguous agent-comment sequence retains the conductor/trail reading form after the agent
  settles, after a later user turn and after reload.
- Adjacent comments are grouped only by durable structural authority (run/turn/message boundary and
  recorded stream order), never by similarity of text.
- A genuine boundary — different turn/run where appropriate, model change, interruption, chapter,
  or restored segment — remains visibly and accessibly distinguishable.
- Model attribution, copy, turn details and action disclosure remain reachable without repeated
  card chrome for every comment in a continuous trail.
- The live trail and its reconstructed counterpart preserve the same comment order and do not
  invent transcript, answer status or an agent action Pi did not record.
- The design stays readable with a single comment, a long trail, screen readers, keyboard focus,
  light/dark themes and reduced motion.
- Tests cover live, settled, subsequent-turn and reload surfaces from the same recorded comment
  sequence.

## Boundaries

No merging of comments into final answers, no suppression of recorded comments, no prose-based
classification and no alteration of Pi/Mirror transcript authority. This CR changes the stable
reading surface, not the underlying comment, turn or action evidence.
