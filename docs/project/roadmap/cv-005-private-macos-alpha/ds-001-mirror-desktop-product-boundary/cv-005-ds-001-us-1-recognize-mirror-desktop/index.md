[< Parent](../index.md)

# CV-005.DS-001.US-1 - Recognize Mirror Desktop

**Status:** 🟠 In Progress
**Type:** User Story

## User Story

As a Mirror Desktop user,
I want the application, its conversations and its runtime surfaces to identify themselves consistently as Mirror Desktop,
so that I can inhabit the new product without encountering the predecessor application identity.

## Outcome

Window, navigation, conversation states, Settings, diagnostics, icons and guidance present Mirror Desktop or Mirror Desktop Dev. Nautilus remains visible only where a surface explicitly describes the Nautilus method, synthesis or historical evidence.

## Acceptance Behavior

```text
Given a user or development build of Mirror Desktop
When the user moves through launch, navigation, Journey start, conversation, Settings and runtime diagnostics
Then every ordinary product surface identifies Mirror Desktop consistently
And no surface calls the application or conversation Nautilus
And intentional Nautilus method surfaces remain correctly named
```

## Scope

- Tauri product and window names.
- Sidebar and application chrome.
- Journey conversation empty, loading, recovery and history states.
- Settings labels, diagnostics and default restoration copy.
- Human-readable new session and conversation labels.
- User-facing errors and canonical current-product documentation.
- Approved Mirror Desktop application artwork.

## Out Of Scope

- Renaming method-owned Nautilus synthesis and projections.
- Full visual redesign.
- Per-user runtime configuration.
- Migrating predecessor app data.

## Validation

Use focused rendering and metadata tests plus the aggregate macOS desktop route. The final search review must show that remaining user-visible Nautilus references are explicitly method-specific or historical.
