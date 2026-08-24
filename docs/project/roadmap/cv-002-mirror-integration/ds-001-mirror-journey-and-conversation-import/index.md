[< CV-002](../index.md)

# CV-002.DS-001 - Mirror Journey and Conversation Import

**Status:** ✅ Done

## Outcome

Harness can explicitly import the Mirror Journey hierarchy, materialize Mirror conversations into local Harness state, render imported Mirror activity richly and inertly, and reload a selected Mirror conversation for the active Journey with confirmation and backup.

## Why This Matters

This work established the first Mirror integration layer. The Harness no longer depends on fixture Journeys or an ephemeral bootstrap file: Mirror can seed the local Journey registry and canonical Journey conversations. The Navigator can also use Mirror terminal and Nautilus side by side, then deliberately reload the relevant Mirror conversation into Nautilus for observation and continuation.

## Absorbed Historical Work

These packages were originally delivered inside DS-006 Journey Management and were repositioned here because they form the Mirror Integration capability foundation.

| Original Code | Story | Status |
|---------------|-------|--------|
| [DS-006.TS-2](ds-006-ts-2-mirror-journey-bootstrap-import/index.md) | Mirror Journey Bootstrap Import | ✅ Done |
| [DS-006.TS-5](ds-006-ts-5-full-mirror-conversation-activity-import/index.md) | Full Mirror Conversation Activity Import | ✅ Done |
| [DS-006.TS-6](ds-006-ts-6-materialize-mirror-import-as-local-harness-state/index.md) | Materialize Mirror Import as Local Harness State | ✅ Done |
| [DS-006.US-3](ds-006-us-3-render-imported-conversations/index.md) | Render Imported Conversations | ✅ Done |
| [DS-006.US-7](ds-006-us-7-reload-journey-from-mirror/index.md) | Reload Journey from Mirror | ✅ Done |
| [DS-006.US-8](ds-006-us-8-select-mirror-conversation-to-reload/index.md) | Select Mirror Conversation to Reload | ✅ Done |

## Delivered Behavior

- Explicit import materializes:
  - `journey-registry.json`
  - `journey-conversations/<journey-id>.json`
  - backups under `journey-conversations/backups/<timestamp>/`
- Imported activity preserves Ariad surfaces, metadata, LLM provenance, attachments and operation-like events as inert history.
- `Load Conversation from Mirror...` opens a selected-conversation flow instead of guessing the latest Mirror conversation.
- The Navigator can generate conversation titles through Mirror's own title service.
- Selected reload overwrites only the active Journey's canonical local conversation after confirmation and backup.

## Boundary

This delivery imports and reloads Mirror-owned Journey/conversation data into local Harness state. It does not continuously sync, invoke Pi, execute imported commands/tools, render chain-of-thought, mutate Journey workspaces, or create multiple local Harness conversations per Journey.
