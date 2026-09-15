[< Parent](../index.md)

# CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to focus one Journey, browse its Desktop Conversations and useful Mirror history, and resize that space accessibly,
so that I can choose exact continuity or an honest cross-interface action without loading unrelated transcripts.

## Outcome

A focused Journey sidebar lists bounded Desktop-ready and Mirror-available metadata together. Ready entries resume exact Desktop authority; Mirror history exposes only `Rename in Mirror`, `Open in Terminal with recalled context` and `Create conversation from agent handoff`. The sidebar resizes by pointer and keyboard within persisted channel-local bounds.

## Acceptance Behavior

```text
Given one Journey contains ready and Mirror-available entries
When the Navigator focuses that Journey
Then only exact-Journey bounded metadata appears
And every entry communicates authority through icon plus text or accessible label
And no transcript body or model is loaded merely for catalog presentation

Given a Mirror history entry
When the Navigator chooses Rename in Mirror
Then full ID and exact Journey are revalidated
And the canonical title changes manually without a model call
And the UI discloses that other Mirror surfaces see the change

Given the Navigator resizes the focused sidebar
When pointer, keyboard, reset, relaunch or window resize changes geometry
Then width remains clamped and channel-local
And sidebar controls, conversation and composer remain usable without horizontal leakage
```

## Scope

- Focused Journey expansion and bounded metadata catalog.
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
