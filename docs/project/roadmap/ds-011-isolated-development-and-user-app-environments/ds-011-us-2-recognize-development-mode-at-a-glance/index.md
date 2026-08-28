[< Parent](../index.md)

# DS-011.US-2 — Recognize Development Mode at a Glance

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator, I want Nautilus Dev to be unmistakable before interaction so that I do not confuse experimental work with the stable daily-use app.

## Outcome

Development has a distinct committed icon, window/product name, coherent accent palette and persistent textual `DEV` indicator. Stable appearance remains recognizable and unchanged.

## Acceptance Behavior

```text
Given both Nautilus channels are open
When I inspect Finder, Dock, app switching or either window
Then I can identify development without opening Settings
And the distinction does not depend on color alone
```

## Scope

- Development icon assets and Tauri bundle mapping.
- Root channel class/data attribute.
- Persistent DEV badge and development palette.
- Development in-app brand icon.

## Out Of Scope

- General stable-app redesign.
- Using visual state as runtime authority.

## Validation

Component/config tests and real macOS Finder, Dock, app-switcher and window review.
