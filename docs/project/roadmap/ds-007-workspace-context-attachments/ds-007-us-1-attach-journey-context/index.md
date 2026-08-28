[< DS-007](../index.md)

# DS-007.US-1 — Attach Journey Context

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want to attach supported files from the selected Journey workspace to my current draft,
So that my next request can include deliberate local evidence without giving Pi permission to browse the workspace.

## Outcome

The active Journey composer exposes an explicit context action. Selection is confined to visible supported files under that Journey's registered project root, remains model-free, and adds bounded pending context to the current draft only.

## Acceptance Behavior

```text
Given a ready dedicated Journey and an editable composer draft
When I explicitly select one or more supported visible Journey files
Then those files appear as pending context for this draft
And no provider, Pi session mutation, Mirror conversation mutation or source-file mutation occurs
```

## Scope

- Add a clear composer action for attaching context.
- Start from the active Journey and its exact registered project root.
- Support selecting one or more visible textual files already eligible for bounded workspace reading.
- Keep draft text and prior selections intact when valid context is added.
- Report unavailable project roots, unsupported files and rejected selections without optimistic attachment state.
- Keep composer accessibility and keyboard operation intact.

## Out Of Scope

- Attaching directories.
- Selecting files from another Journey or arbitrary filesystem roots.
- Drag-and-drop from external applications unless separately validated during planning.
- Automatic suggestions, semantic search or provider-assisted selection.
- Starting an invocation merely because a file was selected.

## Validation

Navigator selects supported Journey files in the desktop app, confirms they appear only in the active draft, switches Journeys to verify no leakage, and confirms selection generates no runtime/provider activity.
