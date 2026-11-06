[< RS016](index.md)

# CR206: Work Only With Conversations Nautilus Created

**Status:** in_progress
**Driver:** assistant
**Delivery:** `main` (`6aaf505b`)
**Navigator decision:** 2026-11-06

## Decision

**Navigator (2026-11-06):** Nautilus stops supporting access to, or use of, conversations that the
Mirror Core created outside Nautilus (from the terminal, Pi, Claude Code or any other runtime).
Today the person can only hide them (CR153's "Desktop only"). From now on the app does not offer
them at all. The code is not deleted; the features that handle them are inhibited.

## What Is Inhibited

Every one of these features works with a `mirror_history` entry of the conversation catalog, so all
of them depend on one read:

- listing a Journey's Mirror history beside its Desktop conversations (`load_mirror_conversation_catalog`);
- opening a Mirror history entry, which shows `MirrorHistoryActionSurface`;
- "Continue in new Desktop Conversation", the agent handoff that recalls the source conversation;
- "Continue with recalled context in Terminal" (`open_mirror_conversation_in_terminal`);
- "Rename in Mirror" (`rename_mirror_conversation`);
- CR153's "Desktop only" filter, which only ever filtered Mirror history;
- restoring a remembered Mirror history selection after a relaunch (CR137).

## Design

One switch, `MIRROR_HISTORY_SUPPORTED` in `src/domain/mirrorHistorySupport.ts`, set to `false`.

- `loadMirrorConversationCatalog` returns no entries and does not ask the Core. With no
  `mirror_history` entry in any catalog, the entry, its action surface, its context menu and the
  rename dialog are unreachable.
- `openMirrorConversationInTerminal` and `renameMirrorConversation` refuse without calling the
  native command, and the handoff returns before creating a conversation, so a stale caller cannot
  reach the Core either.
- The sidebar does not offer the "Desktop only" filter.
- A remembered Mirror history selection finds no entry and lands on the Journey, as CR137 already
  does for any missing conversation.

Kept: the domain types and functions, the native commands, the components, and the person's
stored preferences (`hideMirrorHistory`, hidden conversations, remembered selections). Turning the
switch back on restores the previous behaviour.

Not affected: Desktop conversations already created by a handoff from Mirror history stay ordinary
Desktop conversations. Every Desktop conversation still has its own Mirror conversation, which is
how Nautilus records its turns.

## Boundary

The agent's own tools are not the app's surface: Mirror's recall skill inside Pi can still read a
Mirror conversation when the person asks the agent to. Restricting that would be a Core or runtime
decision, left to the Navigator.

## Acceptance

- No Journey's conversation list shows a conversation created outside Nautilus, and no
  `load_mirror_conversation_catalog` call is made.
- The "Desktop only" button is gone.
- Opening in Terminal, renaming in Mirror and the handoff refuse without calling the Core.
- A relaunch whose remembered selection was Mirror history lands on the Journey.
- Desktop conversations, including those created earlier from Mirror history, work as before.

## Delivery (2026-11-06)

`6aaf505b`: `src/domain/mirrorHistorySupport.ts` holds the switch; `mirrorConversationCatalog.ts`
returns no entries without calling the Core and refuses Terminal recall and rename; `App.tsx` guards
the handoff and passes `offerMirrorHistoryFilter={MIRROR_HISTORY_SUPPORTED}`; the sidebar drops the
filter when told to. `cr206OnlyNautilusConversations` (6 tests) was red first; seven mutations, one
per guard, were each caught. The Terminal-recall contract test in `mirrorConversationActions` runs
again only if the switch is turned back on. Suites: TS 2,761 passed and 1 skipped, `tsc` clean. No
Rust change.

## Check

In the development app (`npm run tauri:dev`), on a Journey that had Mirror history in its list:

1. Expand the Journey's conversations. Only Desktop conversations are listed; nothing marked
   "Mirror · N messages" appears.
2. The "Desktop only" button above the list is gone.
3. A Desktop conversation created earlier with "Continue in new Desktop Conversation" still opens
   and takes a turn.
4. Quit with a Desktop conversation selected and reopen: it is restored. (A Journey whose remembered
   selection was Mirror history opens on the Journey itself.)
