[< Parent](../index.md)

# CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to expand one Journey into a bounded unified conversation catalog and resize that focused sidebar,
so that all Mirror continuities are discoverable without exposing internal product boundaries or sacrificing the conversation workspace.

## Outcome

A focused Journey sidebar lists Desktop-ready and Mirror-available conversations together with accessible availability, recency and state. Imported originals remain available secondarily without ordinary duplication. The sidebar resizes by pointer and keyboard within persisted channel-local bounds.

## Acceptance Behavior

```text
Given one Journey contains ready, Mirror-available, importing and needs-attention entries
When the Navigator expands it
Then a bounded catalog presents each state with icon and accessible text without separate-product language
And transcript bodies are not loaded merely to list entries

Given the focused sidebar is visible
When the Navigator resizes it by pointer or keyboard
Then width remains within accepted limits and survives relaunch
And window shrink reclamps it safely
And sidebar controls, conversation reading width and composer remain usable
```

## Scope

- Journey focus/collapse navigation and bounded catalog presentation.
- Ready, available in Mirror, importing and needs-attention semantics.
- Secondary imported-originals access.
- Active Conversation and owner-specific run indication.
- Accessible resize separator, keyboard control, clamping, reset and channel-local preference.

## Out Of Scope

- Color-only state, unbounded geometry or cross-device width synchronization.
- Transcript import or execution authority from list selection alone.
- Cross-Journey catalog entries.
- Persona destinations.

## Validation

Component, integration, accessibility and layout tests cover bounded loading, state labels, pointer and keyboard resizing, persisted preference corruption, supported themes and window sizes. Navigator validation uses an isolated development bundle and confirms no transcript-body request on ordinary catalog opening.
