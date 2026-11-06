[< RS016](index.md)

# CR207: Create a Conversation in the Journey Whose New Was Pressed

**Status:** in_progress
**Driver:** assistant
**Delivery:** `main` (`75382d16`)
**Reported:** Navigator, 2026-11-06, on v0.4.0-alpha.4 development

## Friction

With Nautilus selected (from Recent), the Navigator pressed **New** under Vida Técnica's
conversations in the tree. "New Conversation #1" was created in Nautilus.

## Cause

Every open conversation group (CR133 lets several be open) passed the same
`requestBlankDesktopConversation`, and `createBlankDesktopConversation` created in `selectedJourney`,
named it with the selected Journey, suggested and validated the title against the selected
Journey's list, and added it to that list.

## Change

The request carries the group's Journey (`requestBlankDesktopConversation(journey.id)`; the recovery
route keeps the selected one). The dialog's target holds that Journey and its name; the title is
suggested and validated against its own list; the dialog reads "New Conversation in <Journey>";
the conversation is created there, added to that Journey's catalog, and the app goes to it, as
choosing a conversation in a group does.

## Check

1. Select Nautilus. In the tree, open Vida Técnica's conversations and press **New**. The dialog
   says "New Conversation in Vida Técnica".
2. Create it. The app goes to Vida Técnica, with the new conversation selected and listed under
   Vida Técnica, not under Nautilus.
3. New in the selected Journey's own group still works as before.
