[< RS026](index.md)

# CR190: Show the Person in the Header and in Their Turns

**Status:** built, awaiting validation in development
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

## Built (2026-11-04)

**Where the name comes from.** The Core's Desktop API (`mirror-mind/desktop`, v0.39.4) exposes no
read of the user identity, so the Mirror's written name is out of reach without a Core change.
Reading the `identity` table from the host would bind the app to the Core's schema. The app
instead resolves, in order (`src/domain/personName.ts`):

1. the name the person writes in **Settings › You › Name** (saved with the app's preferences),
   which a new home fills in with the name typed at setup (below);
2. the home's user from the runtime channel, read as a name (`alisson-vale` reads "Alisson Vale");
3. "You".

An extend-only Core read of the user's name can later replace the second step.

**The header** now reads, at the top right, `⋯` and then a round **person button** with the photo
or the initial. A click shows the name in a small popover, and an outside click closes it. Nothing
more was built into the popover, as the First Investigation asked.

**Chapters** is the first item of the `⋯` menu and opens the same panel. With no chapters it is
disabled, and CR080's reason shows as text inside the item, because a browser shows no title on a
disabled control.

**The person's turns** carry their name and initial instead of "You" and "N", and so do the turn
navigator and the Settings preview.

**The reset dialog** now says that the agent will start with no memory of what was said in this
Conversation. It says that the past generation stays readable but its messages are not carried
into the new context and it cannot be made active again from the app. It also says that the
Mirror's memories are not affected. This was checked against the code: no path reactivates a past
generation.

Spec: `src/tests/cr190PersonInHeader.test.tsx`, checked failing first and by mutation. Four older
`?raw` guards were re-aimed, not relaxed: CR080's chapter reason, the chapter control, the
compaction lock on Chapters, and the reset wording.

**The name typed at setup (Navigator, 2026-11-04).** The setup screen asks "What should your Mirror
call you?" and kept only the user name derived from the answer, so "José Ávila" came back as "Jose
Avila". The answer is now kept as the person's name. A home owns its preferences, and the app
reloads into the new home right after creating it, so the name waits in local storage tagged with
its user name (`src/app/onboardingNameHandoff.ts`). The home whose user matches claims it once; a
failed creation forgets it; a name already written in Settings wins. A person who adopts an
existing home never sees that screen, so for them the name is still read from the home's user
until they write one. Spec: `src/tests/cr190OnboardingName.test.tsx`, checked failing first and by
mutation.

**After the Navigator's review in development (2026-11-04).**

- A separator in the `⋯` menu keeps Chapters, which navigates, apart from Reset agent context, a
  deliberate act.
- In the reset dialog, **Cancel** comes first, takes focus and is the emphasized button. Reset is
  the secondary one, so Enter or a hurried click keeps the context.
- The dialog now says **when to reset**: the agent keeps returning to a wrong direction that
  corrections no longer fix, a new subject that should start clean, or a context large enough to
  make turns slow or costly. When the context is only long and the thread should be kept, it points
  to **Compact now**, which summarizes instead of discarding.
- The reset dialog has a **Close** button at the top right of its header, the same as Settings,
  disabled while a reset is running.
