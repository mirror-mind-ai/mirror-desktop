[< DS-010](../index.md)

# DS-010.US-1 — Create Journey

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want to create a Journey from the Tree context menu,
So that a new field of work can enter Mirror and the Harness without manual database or identity-file operations.

## Outcome

**Create Journey…** opens a deliberate screen for display name, editable suggested slug, description, root/parent and sibling position, and optional `project_path`. A confirmation summary precedes one canonical model-free creation transaction and verified tree reload.

## Acceptance Behavior

```text
Given valid unique Journey identity and placement
When I confirm creation
Then the Journey appears at the requested canonical position and remains unstarted until I explicitly choose Start this Journey.
```

## Scope

- Tree context-menu entry and accessible equivalent.
- Name, slug, description, position and optional path fields.
- Slug suggestion with explicit editability.
- Parent/position picker and confirmation summary.
- Honest validation, progress, success and recovery states.

## Out Of Scope

- Automatic repository, directory or file creation.
- Automatic Pi session, Mirror conversation or Nautilus thread creation.
- Provider-generated names, descriptions or slugs.

## Validation

Create root and nested Journeys, exercise duplicate/invalid slug, stale placement, optional path and failure recovery, then verify exact Mirror identity and registry position without any dedicated conversation side effect.
