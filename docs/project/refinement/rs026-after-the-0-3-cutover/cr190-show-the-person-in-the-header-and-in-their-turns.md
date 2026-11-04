[< RS026](index.md)

# CR190: Show the Person in the Header and in Their Turns

**Status:** captured
**Line:** 0.3 · Desktop

## Friction

Requested by the Navigator on 2026-11-03, to come right after CR187:

1. The chapters button at the top right leaves the header and becomes an item in the `⋯` menu.
2. In its place, a round button of the same shape shows the person's avatar. Clicking it shows the
   current person's name.
3. The person's own turns show their name instead of "You".
4. Confirm that **Reset agent context** explains the generation model the app uses and warns that
   the agent's context starts over. The Navigator believes a past generation cannot be brought back
   from the app.

## What the Code Does Today (read 2026-11-03)

- **Chapters:** `conversation-chapter-shortcut` in `App.tsx` (about line 6579), a `§` button. It is
  disabled when the Conversation has no chapters. It opens `ChapterIndexPanel`.
- **`⋯` menu:** `journey-menu` holds one item, **Reset agent context…**.
- **Avatar:** CR175's Settings › You sets `userAvatar`, which is shown on the person's turns
  (`MessageSpeakerAvatar`). Without a photo the fallback is the letter `N`, hard-coded for
  "Navigator", in the transcript and in Settings.
- **"You":** `inferMessageSpeaker` in `conversationPresentation.ts` returns the label `You` for every
  user message.
- **The name:** the Desktop holds no display name. A home is created with a slug (`alisson-vale`,
  `userNameFrom`); the Mirror's own identity holds the written name (`# Alisson Vale` in the user
  identity).
- **Reset:** the dialog says the Conversation is kept, Generation N+1 gets a fresh Pi context and
  Mirror conversation, Generation N stays preserved and read-only, and its messages "will not be
  copied verbatim into the new Pi context". It lists the generation history with each status.
  - It does not say in plain words that the agent will no longer remember what was said.
  - It does not say that a past generation cannot be made active again. No code path in the
    renderer opens or reactivates a past generation; the history rows are not actionable.

## First Investigation

1. **Where the name comes from.** Read it from the Mirror (the user identity's name) if the Core
   already exposes it to the host; otherwise from the home's name. A Desktop setting is the last
   resort, since the Mirror already knows the person. No Core change unless it is extend-only.
2. **What the avatar button opens.** A small popover with the name (and the photo), and perhaps a
   link to Settings › You. Confirm with the Navigator before building more than the name.
3. **The fallback letter** becomes the name's initial, in the transcript, in Settings and in the new
   button.
4. **Chapters in the menu:** keep the disabled reason ("No chapters yet…") on the menu item, and
   keep the panel's open state working when it is opened from the menu.
5. **Reset wording:** rewrite the dialog so it says, plainly, that the agent starts with no memory of
   this Conversation, that earlier generations stay readable but cannot be made active again, and
   what is kept (the Conversation, its transcript, the Mirror's memories).

## Acceptance

- The header's top right reads, left to right, `⋯` menu and avatar button, with Chapters inside the
  menu.
- Clicking the avatar shows the current person's name.
- The person's turns carry their name, not "You", after a reload too.
- The reset dialog states that the agent's context starts over and that a past generation cannot be
  brought back from the app.
