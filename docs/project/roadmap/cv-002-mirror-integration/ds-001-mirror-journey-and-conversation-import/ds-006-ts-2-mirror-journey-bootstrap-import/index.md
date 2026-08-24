[< CV-002.DS-001](../index.md)

# DS-006.TS-2 — Mirror Journey Bootstrap Import

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Outcome

Implement Mirror Journey Bootstrap Import as an explicit local bootstrap path for Nautilus Harness. Add a read-only Mirror import boundary that can obtain the real hierarchical Journey registry and latest conversation per Journey, preferably through Mirror CLI/JSON commands or a small project-local exporter script rather than direct ad hoc database mutation. Materialize the imported hierarchy into the Harness JourneyRegistry shape and persist it as local app-data or an explicit local registry file consumed by the app. For each imported Journey, locate the latest Mirror conversation when one exists and seed the single local Nautilus Journey conversation with a safe normalized subset of messages: id, role mapped to user/assistant where possible, content text, createdAt, and optional imported metadata. Do not try to render every Mirror-specific surface perfectly in this TS; unsupported richness can be stored safely or reduced to readable text, with full rendering assigned to DS-006.US-3. The import must be explicit, repeatable, read-only against Mirror, non-secret, local-only, and must not invoke Pi, execute Missions, scan arbitrary workspace roots, mutate Journey files, create multiple Nautilus conversations per Journey, or perform continuous sync. Include automated tests for importer transformation/normalization using fixtures and a Navigator-visible validation route that imports from current Mirror state and confirms the sidebar/search sees the real Journey hierarchy and selected Journeys open seeded conversations.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Mirror Journey Bootstrap Import,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for Mirror Journey Bootstrap Import
When the Navigator exercises Mirror Journey Bootstrap Import
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Mirror Journey Bootstrap Import as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not implement sibling roadmap item: Render Imported Conversations.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
