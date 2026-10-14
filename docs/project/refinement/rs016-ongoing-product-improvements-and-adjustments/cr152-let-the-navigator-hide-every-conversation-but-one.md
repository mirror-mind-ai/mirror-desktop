[< RS016](index.md)

# CR152: Let the Navigator Hide Every Conversation but One

**Status:** in_progress
**Driver:** assistant
**Delivery:** `refinement/cr152-cr153-conversation-list-reduction`
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

---

## Investigation Answered (2026-10-13)

### Scope is the Journey, because that is the only grain the store has

`HiddenConversationsByJourney` is `Record<journeyId, key[]>` and every function in
`conversationVisibility.ts` takes a `journeyId`. A cross-Journey bulk hide has no store, so
*"all others"* means *all others in this Journey* and the label must say so.

### The cap, answered by not failing silently

`hideConversation` returns the state **unchanged** when the Journey is at
`MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY = 256` (`conversationVisibility.ts:62`). A bulk act built
naively on it would hide some conversations and silently abandon the rest — exactly what this CR's
First Investigation warned about.

So the bulk function returns a **result**, not just a state: how many it hid and how many it could
not. The surface reports the shortfall instead of leaving the Navigator to count.

The cap is not reachable today — the largest union measured is 57 Mirror entries plus 4 Desktop ones
— but a silent partial act is the kind of thing that is only ever discovered at the worst moment.

### A running sibling may be hidden, and the reason is structural

This was named *"the real safety question"*. It is answered by what hiding already is:
`conversationVisibility.ts` documents that *"hiding is a render filter. Nothing here removes an entry
from the catalog state, so CR134's route still resolves a hidden conversation and the Journey row
still carries its running work."* CR143 additionally puts the running count on the **closed** hidden
control, so hiding a working conversation cannot hide *that work is running*.

So a bulk hide needs no refusal and no special case for live work. **It must not invent one**, since
a refusal would make the act fail for a reason the Navigator cannot see and the surface already
answers.

### One undo is enough, because the precise one already exists

The concern was that `revealAllConversations` over-reveals, including conversations hidden
deliberately long before. True — and it is not the only way back. `revealConversation` is per-entry
and the surface already exposes it: `FocusedConversationSidebar` renders a **Reveal** button on every
row of the hidden section, beside *Reveal all N*.

So **no memory of the bulk act is built.** A durable record of *what this one act hid* would be new
persisted state, a new cap, and a new staleness question, to give a precision the product already
has. Declined, with the arithmetic above rather than on taste.

## Plan

**Scope.** `hideEveryOtherConversation(hidden, journeyId, entries, keep)` in
`conversationVisibility.ts`, returning `{ hidden, hiddenCount, skippedForCap }`. A menu item on a
conversation's own context menu, wired in `App.tsx`, reporting the count and any shortfall.

**Files.** `src/domain/conversationVisibility.ts` · `src/app/ConversationEntryContextMenu.tsx` ·
`src/app/FocusedConversationSidebar.tsx` · `src/app/App.tsx` ·
`src/tests/conversationHidingSurface.test.tsx`.

**Acceptance.** (1) Every other entry in that Journey becomes hidden in one act. (2) The conversation
the act was invoked from stays visible. (3) Another Journey's hidden set is untouched. (4) Already
hidden entries are not double-counted. (5) At the cap it hides what fits and **says** how many it
could not. (6) A running sibling is hidden like any other, and its work stays legible on the closed
hidden control. (7) Each entry can be revealed individually afterwards.

**Validation.** Pure-function assertions for all seven, including a synthetic 256-entry Journey for
the cap; `renderToStaticMarkup` for the menu item and the reported count.

**Exclusions.** Does not delete, does not change what hiding means, does not touch
`revealAllConversations`, does not add cross-Journey bulk hiding, does not record what the act hid,
and does not refuse on live work.

## Delivery (2026-10-13)

`hideEveryOtherConversation` in `conversationVisibility.ts`, built **on** `hideConversation` rather
than beside it so the caps and the composite key keep living in one place. A no-op is detected by
reference equality, which is exactly what `hideConversation` guarantees when it declines at the cap
— so the bulk act can count a shortfall without duplicating the cap logic that produces it.

Offered from a conversation's own context menu as **"Hide Other N (can be revealed)"**, and only
when `N > 0`. It names the number rather than saying *all others*: a bulk act whose size the
Navigator cannot see before invoking it is one they undo rather than trust.

**Nothing records what the act hid.** The concern was that `revealAllConversations` over-reveals,
and it does — but it was never the only way back. `revealConversation` is per-entry and the hidden
section already renders **Reveal** on every row. A durable memory of this one act would have been
new persisted state, a new cap and a new staleness question, bought to supply a precision the
product already had.

**A running sibling is hidden like any other, deliberately.** Hiding is a render filter: nothing
leaves the catalog, CR134's route still resolves a hidden conversation, the Journey row still
carries its running work, and CR143 puts the running count on the *closed* hidden control. A
refusal would have failed for a reason the Navigator cannot see, guarding something already
answered.

12 tests. Three controls, each compiling and then failing: removing the keep-guard (5 tests),
silencing the cap shortfall (1), and the two source guards when the wiring is removed.