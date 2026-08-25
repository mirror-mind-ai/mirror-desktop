[< Story](index.md)

# Test Guide — CV-003.DS-001.US-3

## Purpose

Validate that Strategic becomes a durable, wider workspace shell over the same selected Journey: one realization leads, its observed impacts remain related, pragmatic and integrative value have equal weight, and no dashboard, scoring or cross-Journey leakage appears.

## Automated Validation

### Strategic relation contract

Verify that:

- the primary realization references existing impact IDs;
- Strategic renders only impacts referenced by that realization;
- deterministic source order is preserved;
- unrelated impacts do not appear;
- the realization remains related to the representative Tactical mission/deliverables in the shared typed model.

### Strategic component semantics

Static-render `StrategicJourneyWorkspace` and verify:

- `role="tabpanel"` and accessible Strategic workspace label;
- primary realization title;
- observed-impact heading and semantic list;
- pragmatic and integrative headings with their values;
- equal lens structure rather than score/rank structure;
- no Preview copy;
- no `form`, `input`, `textarea`, `button`, `select`, chart, score, KPI, progress or drag/drop affordance;
- no invocation, persistence, effect or native-command imports.

### App composition and Journey isolation

Characterize source/composition so that:

- Strategic mounts the dedicated component only when `contextualJourneyPreview` exists;
- Strategic otherwise mounts `JourneyAltitudeEmptyState` with `selectedJourneyItem.name`;
- Tactical and Operational branches remain intact;
- representative data is still keyed to its owning Journey ID;
- altitude selection remains isolated from Pi, Mirror and provider invocation.

### Regression baseline

Run:

```bash
npm test -- src/tests/strategicJourneyWorkspace.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts src/tests/journeyAltitudeEmptyState.test.tsx
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Desktop Scenario

1. Launch `npm run tauri dev` with the normal multi-Journey registry.
2. Select `nautilus-harness`.
3. Type a distinctive unsent draft in Operational → Conversation.
4. Select Strategic.
5. Read the realization, observed impacts, pragmatic value and integrative value.
6. Compare the spatial rhythm with Tactical.
7. Confirm no score, chart, metric, workflow action or Preview label appears.
8. Select a Journey without Strategic data.
9. Confirm the no-data surface names the newly selected Journey.
10. Return to `nautilus-harness`, then Operational → Conversation.
11. Confirm the draft, messages, runtime and reconciliation state remain unchanged.

## Expected Observation

Strategic feels wider and more contemplative than Tactical. The realization is clearly primary. Impacts read as consequences of that realization. Pragmatic and integrative value appear as complementary lenses with equal hierarchy, not as independent cards or competing scores. No Strategic content crosses Journey identity.

## Pass Condition

- all required checks pass;
- realization, impacts and both value lenses form one coherent reading;
- Strategic feels like meaning recognition rather than executive reporting;
- contextual data and empty-state isolation are correct;
- no execution/editing behavior appears;
- Operational state survives the round trip;
- the Navigator accepts the shell for later live hydration.

## Fail Condition

- unrelated impacts appear;
- the composition resembles a dashboard or report;
- either value lens dominates or becomes a score;
- Preview or authoritative-live wording appears;
- any Strategic interaction can invoke Pi, Mirror or a provider;
- data leaks across Journeys;
- Operational continuity or desktop readability regresses.

## Evidence Rules

Record the commit, automated check results and Strategic/empty-state screenshots or concise visual observations. Do not capture private prompts, responses, transcripts, secrets, environment variables or reasoning.
