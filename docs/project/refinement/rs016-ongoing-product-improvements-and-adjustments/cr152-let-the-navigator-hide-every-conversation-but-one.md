[< RS016](index.md)

# CR152: Let the Navigator Hide Every Conversation but One

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 4 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"opção 'hide all others' na lista de conversas"*

Hiding is one conversation at a time. Clearing the list down to the one being worked in means
repeating the act for everything else.

## What Exists

CR135 built the durable mechanism and it is per-Journey:

| function in `conversationVisibility.ts` | what it does |
|---|---|
| `hideConversation` | hides one |
| `revealConversation` | reveals one |
| `revealAllConversations` | reveals every one in a Journey |
| `partitionConversationVisibility` | splits a Journey's entries into visible and hidden |
| `isConversationHidden` | the predicate |

**The bulk direction already exists in one direction only.** `revealAllConversations` is the
all-at-once reveal; there is no all-at-once hide. So this CR is the symmetric act, against
`MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY = 256`.

## Outcome

From a conversation's own menu, the Navigator hides every other conversation in that Journey in one
act, and can undo it — `revealAllConversations` already exists as the way back.

## First Investigation

- **"All others" within what scope?** Within the Journey is the only grain the store has
  (`HiddenConversationsByJourney`). Whether the Navigator means the Journey or the whole list matters,
  and a cross-Journey bulk hide has no store today.
- **Does it respect the cap, and what happens at it?** A Journey with more than 256 conversations
  cannot hide them all. Failing silently at 256 would hide some and leave others with no explanation.
- **What about a conversation with live work?** CR135's hiding does not stop a run, and a hidden
  conversation with an active lease is a state RS024 made reachable. Whether a bulk hide may hide a
  running sibling, or must refuse and say why, is the real safety question here.
- **Is one undo enough?** `revealAllConversations` reveals everything, including conversations the
  Navigator had hidden deliberately long before. That is a real loss, and a bulk act that cannot be
  precisely undone may need to remember what it did.

## Boundaries

Does not delete anything, does not change what hiding means, and does not touch
`revealAllConversations`'s current behaviour. Hiding remains reversible and remains per-Journey.
Shares a surface with [CR153](cr153-let-the-navigator-see-only-desktop-conversations.md) and may be
delivered alongside it, but the two are different mechanisms: this one writes durable hidden state,
that one filters a view.

## Provenance

`conversationVisibility.ts` exports and caps read on 2026-10-12. The asymmetry between
`revealAllConversations` and the absent bulk hide is read from that export list.
