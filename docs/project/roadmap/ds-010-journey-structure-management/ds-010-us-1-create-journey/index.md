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

**Create Journey…** is available from the Tree control context menu for root placement and from every Journey item's context menu for child placement. The item action opens a deliberate screen with that Journey already selected as the editable parent, alongside display name, editable suggested slug, description, sibling position and optional `project_path`. A confirmation summary precedes one canonical model-free creation transaction and verified tree reload.

## Acceptance Behavior

```text
Given valid unique Journey identity and placement
When I confirm creation
Then the Journey appears at the requested canonical position and remains unstarted until I explicitly choose Start this Journey.
```

## Scope

- Root creation from the Tree control context menu.
- Child creation from a Journey item's right-click context menu, with `Shift+F10` and Context Menu key parity.
- Item-scoped creation preselects that exact native Journey as parent while keeping parent and position editable before confirmation.
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
