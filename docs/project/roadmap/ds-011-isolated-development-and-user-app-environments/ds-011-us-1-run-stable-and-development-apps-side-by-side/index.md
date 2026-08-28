[< Parent](../index.md)

# DS-011.US-1 — Run Stable and Development Apps Side by Side

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator, I want the stable Nautilus app and Nautilus Dev open simultaneously so that I can develop safely without replacing or disturbing my daily workspace.

## Outcome

macOS treats the channels as separate applications. Each owns its process, bundle identity, app-data root, settings, registry, threads, generations, conversations and Pi artifacts.

## Acceptance Behavior

```text
Given the stable app is open with existing Journey history
When Nautilus Dev launches and exercises a development Journey
Then both apps remain independently usable
And restarting or resetting development leaves stable state unchanged
```

## Scope

- Side-by-side launch and operation.
- Independent persistence and restart.
- Stable-state non-mutation evidence.

## Out Of Scope

- Sharing conversations between channels.
- Running multiple Journeys concurrently inside one channel.

## Validation

Real Tauri desktop review with both apps open and bounded stable before/after evidence.
