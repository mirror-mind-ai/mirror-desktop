[< Parent](../index.md)

# CV-003.DS-006.US-1 — Published Journey Projection Hydration

**Status:** 🟠 In Progress
**Type:** User Story

## Outcome

The selected Journey's Tactical and Strategic workspaces render only validated published projections obtained through the installed Mirror contract. Missing readings remain honestly empty, stale ancestry is visible, and Operational conversation/artifact continuity remains unchanged.

## Acceptance behavior

```text
Given a Journey selected from the authoritative local registry
When Harness loads its fixed Operational, Tactical and Strategic coordinates
Then the renderer supplies only the Journey ID
And Mirror returns consistent manifest/document inspection pairs
And valid derived readings render only for that Journey
And absent readings show Journey-named empty states
And stale ancestry produces an inert notice without automatic repair
And changing Journeys clears the previous reading before asynchronous load
And no load invokes Pi, synthesis, a provider or projection mutation
```

## Scope

- Installed public Mirror inspection boundary.
- Strict frontend Protocol/relationship validation.
- Published Tactical and Strategic rendering.
- Current/absent/stale/error states.
- Journey race isolation and selector loading guard.
- Fixed-manifest coordinate discovery with symlink and size rejection.

## Out of scope

- Generating or refreshing projections.
- Polling, watchers or background synthesis.
- Checkpoint correction UX.
- Tactical workflow controls or Strategic reporting.
- Replacing Operational Conversation/Artifacts with a dashboard.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)
