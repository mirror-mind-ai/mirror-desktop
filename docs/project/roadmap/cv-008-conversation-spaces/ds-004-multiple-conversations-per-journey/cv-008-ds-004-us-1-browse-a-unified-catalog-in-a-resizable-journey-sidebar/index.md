[< Parent](../index.md)

# CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar

**Status:** 🟢 Done
**Type:** User Story

## User Story

As the Navigator,
I want ordinary Journey clicking to remain unchanged while a downward arrow reveals associated Conversations inline beneath their Journey,
so that I can return to the Journey workspace or choose exact child continuity and honest cross-interface actions without loading unrelated transcripts.

## Outcome

The ordinary sidebar still lists all Journeys and clicking one opens its existing root workspace. Expanding one Journey inserts bounded Desktop-ready and Mirror-available children directly below it; Journeys above remain fixed and later Journeys move downward in the same scrollable list. The root workspace is never a child row. Ready children open transcript/composer or an empty first-turn surface. Mirror history opens a no-composer action surface. Collapse removes only the inline catalog and returns to the root workspace. The sidebar resizes by pointer and keyboard within persisted channel-local bounds.

## Acceptance Behavior

```text
Given the ordinary sidebar lists Journeys
When the Navigator clicks one without expanding it
Then the existing Journey-level conversation opens unchanged
And it is not represented as a child Conversation

Given one Journey contains ready and Mirror-available children
When the Navigator explicitly expands that Journey
Then exact-Journey bounded metadata appears immediately beneath it without hiding siblings
And its Journey card returns to the root workspace
And collapse removes only the inline catalog and returns to the root workspace
And no active child owner is retargeted

Given a ready child is selected
When it has turns or remains empty
Then the established transcript/composer or dedicated first-turn surface opens

Given a Mirror history entry is selected
Then a non-executable action surface opens without a composer
And authority is communicated through icon plus text or accessible label
And no transcript body or model is loaded merely for presentation

Given a Mirror history entry
When the Navigator chooses Rename in Mirror
Then full ID and exact Journey are revalidated
And the canonical title changes manually without a model call
And the UI discloses that other Mirror surfaces see the change

Given the Navigator resizes the non-compact sidebar while Conversations are expanded or collapsed
When pointer, keyboard, reset, relaunch or window resize changes geometry
Then width remains clamped and channel-local
And sidebar controls, conversation and composer remain usable without horizontal leakage
```

## Scope

- Unchanged ordinary Journey list, click behavior and root workspace.
- Explicit downward inline expansion, Journey-card-to-root navigation and deterministic collapse.
- Root workspace exclusion from the child catalog.
- Ready child transcript/empty-start routing and Mirror-history action-surface routing.
- Ready, available in Mirror, preparing handoff and needs-attention semantics.
- Explicit source actions supported by the released runtime.
- Model-free manual canonical rename.
- Pointer and keyboard separator, accessible value, clamping, reset and persistence.

## Out of Scope

- External transcript rendering in Desktop.
- Working-copy import, source suppression or divergence detection.
- Execution authority from list selection.
- Web Console embedding or deep links.

## Validation

Use generated entries and exact Journey mismatch fixtures. Verify catalog work remains metadata-only, rename never invokes a provider, source messages stay unchanged, availability does not depend on color and all admitted sidebar widths protect the composer and reading surface.
