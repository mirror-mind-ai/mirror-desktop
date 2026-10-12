[< RS016](index.md)

# CR153: Let the Navigator See Only Desktop Conversations

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 5 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"opção 'show only desktop conversations' na lista de conversas"*

The conversation list mixes kinds, and the Navigator wants to see only the one they work in.

## What Exists

The list carries **three** kinds, not two:

| kind | what it is |
|---|---|
| `desktop_conversation` | a conversation created and worked in the application |
| `journey_workspace` | the Journey's own workspace entry |
| `mirror_history` | history coming from Mirror |

So "only desktop conversations" excludes two different things for two different reasons, and the
Navigator should confirm both are meant — `journey_workspace` is the Journey's own entry, and hiding
it may remove the way into the Journey itself rather than merely tidying the list.

## This Is a Filter, Not Hiding — and the Difference Matters

CR135's hiding and this filter look alike on screen and are not the same thing:

| | CR135 hiding | this filter |
|---|---|---|
| grain | one named conversation | a whole kind |
| durability | written per Journey in `HiddenConversationsByJourney` | a view preference |
| meaning | *I am done with this one* | *do not show me this category* |
| survives a new conversation of that kind | the new one is visible | the new one is filtered too |

**Implementing this as a bulk hide would be wrong**, and would look right at first: it would hide
today's non-desktop entries and then let tomorrow's appear, which is exactly the behaviour the
Navigator is asking to be rid of. The last row is the test that tells the two designs apart.

## Outcome

The conversation list has a filter that shows only desktop conversations, it persists across restart,
and a newly arriving non-desktop entry stays filtered without the Navigator acting again.

## First Investigation

- **Does it mean all three excluded, or only `mirror_history`?** The Navigator's words name what to
  keep rather than what to drop. `journey_workspace` is the ambiguous one and only they can settle it.
- **Where does the preference live?** `journey-preferences.json` already persists per-Journey
  selection state and would make the filter per-Journey; a global filter would need a different home.
  Per-Journey and global are different products — one is *this Journey is noisy*, the other is *I
  never want these*.
- **What happens to a filtered conversation that is selected, or running?** Filtering out the active
  conversation would be a worse version of the defect CR137 repaired, where the Navigator's work was
  present and unfindable. A filter must not be able to hide the thing being worked in.
- **How does it compose with CR135's hidden set?** Both reduce the list. A conversation that is both
  filtered and hidden must have one unambiguous way back, or the Navigator will not find it.
- **Is the filter's state visible when it is on?** A list that is quietly short is the beginning of
  believing something was lost.

## Boundaries

Does not delete, does not write hidden state, and does not change what any kind means or how entries
are produced. Does not change CR135's hiding. Shares a surface with
[CR152](cr152-let-the-navigator-hide-every-conversation-but-one.md) and may ship alongside it; the
mechanisms stay separate.

## Provenance

The three kinds read from `conversationSpaces.ts` and `journeyConversation.ts` on 2026-10-12.
CR135's store shape read from `conversationVisibility.ts`. The distinction between a durable hide and
a view filter is reasoned from those two shapes, not observed in the field.
