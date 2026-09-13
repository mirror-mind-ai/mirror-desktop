[< Parent](../index.md)

# CV-007.DS-004.US-1 - Understand What's New Before Updating

**Status:** ✅ Done
**Type:** User Story

## User Story

As a Mirror Desktop user reviewing an available update,
I want to understand its meaningful changes inside the update experience,
So that I can decide whether to install it without losing release identity or consent context.

## Outcome

The header update popover presents concise authoritative release highlights, while Details opens the complete embedded release note and canonical source coordinate in Updates settings before any download begins.

## Acceptance Behavior

```text
Given a trusted update with a valid reading is available
When I open its version chip and choose Details
Then I see concise highlights followed by the complete notes for the same offered version
And current and offered versions remain distinct
And no download or installation begins until I explicitly choose Update
```

## Scope

- Concise title, digest and bounded highlights in the update popover.
- Complete release-note reading in Updates settings.
- Honest fallback for missing or invalid reading metadata.
- Accessible English-only labels and keyboard operation.
- Persistent visual update-available indication after Later closes the popover.

## Out Of Scope

- Post-relaunch recognition, release content generation, external navigation and updater installation changes.

## Validation

Component and integration tests plus Navigator review in isolated Mirror Desktop Dev.
