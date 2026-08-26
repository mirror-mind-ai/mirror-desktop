# Plan — CV-003.DS-006.US-1

## Objective

Replace representative Tactical and Strategic fixtures in the running Harness with read-only, Journey-bound projections obtained through the installed public Mirror inspection contract.

## User-visible outcome

- Operational remains Conversation/Artifacts and gains no reporting dashboard.
- Tactical renders the published mission, related evidence and related deliverables for the selected Journey.
- Strategic renders the primary published realization, related impacts and equal pragmatic/integrative value lenses.
- A Journey with no derived projection keeps its named inert empty state.
- A stale Tactical or Strategic reading remains visible with one quiet, actionable provenance notice.
- Switching Journeys never retains another Journey's reading.

## Architecture

### Backend authority

Add one Tauri command accepting only `journeyId`. It invokes the installed public Mirror CLI inspection contract for:

```text
ariad:operational
nautilus-synthesis:tactical
nautilus-synthesis:strategic
```

The renderer never supplies a root, namespace, path or manifest location. Each successful inspection is already a consistent manifest/document pair from Mirror's publication kernel. `projection_not_found` becomes an honest absence; malformed, divergent or unavailable results become bounded load errors.

### Frontend validation

Add strict dependency-free TypeScript parsers for:

- the public inspection envelope;
- Operational snapshot coordinates;
- Tactical Protocol v1 content and relationships;
- Strategic Protocol v1 content and relationships.

Reject mismatched Journey, namespace, projection or source ancestry. Never fall back to representative content after a load failure.

### Staleness

Compare Tactical Operational ancestry with the loaded current Operational snapshot. Compare Strategic Operational ancestry and optional Tactical ancestry with loaded current coordinates. Staleness is displayed, never repaired automatically.

### Loading lifecycle

Load on selected Journey change. Clear prior readings immediately, ignore late responses for an earlier Journey, disable altitude selectors while loading, and preserve conversation/draft state. Loading never invokes Pi or a provider.

## Implementation steps

1. Add failing domain tests for parsing, relationship validation, missing projections, staleness and Journey isolation.
2. Add failing storage tests for the Tauri invoke boundary.
3. Add Rust characterization tests for public CLI result classification and aggregate projection payloads.
4. Implement the Tauri inspection command and register it.
5. Implement frontend storage and projection domain model.
6. Rework Tactical/Strategic components to consume published projection types.
7. Integrate load/clear/stale/error behavior into `App.tsx` without changing conversation persistence or invocation.
8. Remove representative preview fallback from live altitude rendering while retaining fixture utilities only where still used by isolated shell tests.
9. Validate automated suites, build, Rust checks and production Journey empty/published routes.

## Expected files

- `src-tauri/src/main.rs`
- `src/domain/journeyProjections.ts`
- `src/app/journeyProjectionStorage.ts`
- `src/app/App.tsx`
- `src/app/TacticalJourneyWorkspace.tsx`
- `src/app/StrategicJourneyWorkspace.tsx`
- `src/app/JourneyProjectionNotice.tsx`
- focused frontend and Rust tests
- this roadmap package and DS-006 index

## Non-goals

- Generating Tactical or Strategic content.
- Installing or invoking a provider.
- Automatic projection refresh, polling or watchers.
- Editing projection state.
- Provenance correction/checkpoint UX from DS-005.
- Tactical task management or Strategic reporting controls.
- Replacing Conversation or Artifacts with Operational JSON.

## Validation

Automated:

```text
npm test
npm run build
cargo test
cargo check
```

Driver E2E:

1. open a Journey without Tactical/Strategic and verify named empty states;
2. use isolated/public fixture inspections to load valid Tactical and Strategic projections;
3. verify correct content and quiet current state;
4. advance the supplied Operational coordinate and verify stale notice without implicit refresh;
5. switch Journey during load and verify no cross-Journey projection appears;
6. verify Conversation draft remains byte-exact and no Pi/provider invocation occurs.

## Pass condition

Published content appears only for its selected Journey, missing data remains honestly empty, stale ancestry is visible, all checks pass, and Harness remains read-only.

## Fail condition

Fixture fallback leaks into production, a root/path comes from the renderer, malformed or cross-Journey data renders, stale data appears current, or loading triggers synthesis/provider activity.

## Approval

Production installation and continued hydration were explicitly authorized by the Navigator. The Journey remains accelerated; Driver performs the implementation and validation checkpoints.
