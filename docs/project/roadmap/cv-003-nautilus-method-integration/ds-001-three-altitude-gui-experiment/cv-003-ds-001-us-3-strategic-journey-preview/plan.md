# Plan — CV-003.DS-001.US-3

## Objective

Establish the permanent Strategic Journey workspace shell for the selected Journey. Make one realization the primary reading, relate its observed impacts, and present pragmatic and integrative value as complementary lenses with wider visual rhythm than Tactical. Preserve Journey-contextual resolution and the shared empty-data surface while leaving production strategic synthesis and checkpoints to `CV-003.DS-004` and `CV-003.DS-005`.

## Product Reading

Strategic is the widest distance over the same territory, not an executive dashboard. The composition should read in this order:

1. what became realizable or newly trustworthy;
2. what impact can be observed from that realization;
3. what practical capacity it creates;
4. what broader integration it enables.

Pragmatic and integrative value are equal lenses over one realization. Neither is a score, KPI, competing outcome or independent card inventory.

## Implementation Shape

### 1. Characterize the Strategic contract first

Add focused failing tests for:

- Strategic tab-panel identity and semantic hierarchy;
- primary realization title rendering;
- inclusion of only impacts referenced by that realization;
- pragmatic and integrative value rendered together with equal structural weight;
- absence of Preview copy, scores, metrics, forms and execution controls;
- pure component source with no invocation, persistence, effects or native commands;
- App composition showing contextual Strategic data only when the selected Journey resolver returns it;
- preservation of `JourneyAltitudeEmptyState` for Journeys without matching data.

### 2. Introduce a dedicated Strategic presentation component

Create `src/app/StrategicJourneyWorkspace.tsx`.

The component should:

- receive the typed `RepresentativeJourneyPreview` explicitly;
- use the first representative realization as the current primary reading without introducing selection state;
- resolve related impacts through `impactIds` in deterministic source order;
- render impacts as observed consequences of the realization;
- render pragmatic and integrative value as two equal lenses;
- expose accessible headings, semantic lists and `role="tabpanel"`;
- mount no button, form, effect, persistence or runtime command.

A missing realization should remain outside this component's contract: App should use the existing empty-data surface when no contextual Strategic model is available. Production partial/empty data handling belongs to DS-004.

### 3. Mount Strategic through the Journey-context resolver

In `src/app/App.tsx`:

- preserve the current Operational and Tactical branches;
- when `selectedAltitude === "strategic"` and `contextualJourneyPreview` exists, mount `StrategicJourneyWorkspace`;
- otherwise retain `JourneyAltitudeEmptyState` with the selected Journey name;
- pass no callbacks or runtime state;
- preserve ephemeral altitude selection and existing disabled-selector rules.

No global representative fallback is allowed. `nautilus-harness` may display its representative Strategic content; another Journey must remain empty until it owns data.

### 4. Establish a wider Strategic rhythm

Extend `src/styles/app.css` under Strategic-specific classes:

- use more whitespace and a broader reading measure than Tactical;
- make the realization the visual anchor;
- keep impacts subordinate and clearly associated;
- present pragmatic and integrative lenses side by side at equal weight on desktop;
- collapse safely at the existing narrow breakpoint;
- avoid progress bars, charts, scores, trend indicators and dashboard density;
- preserve the Nautilus visual language without copying the Tactical card composition mechanically.

### 5. Validate continuity, context and safety

Run focused and full regression checks. In the real desktop app without sending a provider turn:

- type an unsent Operational draft;
- inspect `nautilus-harness` Strategic realization, impacts and both value lenses;
- switch to a Journey without Strategic data and verify the contextual empty surface;
- return to Operational and verify draft/conversation continuity.

## Expected Files

```text
src/app/StrategicJourneyWorkspace.tsx               new
src/app/App.tsx                                     narrow Strategic branch change
src/styles/app.css                                  Strategic-scoped styles
src/tests/strategicJourneyWorkspace.test.tsx        new focused behavior tests
src/tests/operationalJourneyWorkspace.test.tsx      composition/context characterization
src/tests/journeyAltitudePreview.test.ts            relation contract if needed
```

No Rust, Python, storage, registry, conversation, Pi or Mirror files are expected to change.

## Acceptance Behavior

```text
Given the contextual representative model for nautilus-harness
When Strategic is rendered
Then the realization is primary
And only impacts linked by its impact IDs appear
And pragmatic and integrative value remain visibly equal readings of that realization.
```

```text
Given a selected Journey without matching Strategic data
When Strategic is rendered
Then its Journey-named empty surface appears
And no realization, impact or value from nautilus-harness leaks into it.
```

```text
Given the Strategic surface
When I inspect its markup and controls
Then I find no score, metric dashboard, form, mutation control, provider action or live-derivation claim.
```

## Non-Goals

- Do not implement aggregate foundation review US-4.
- Do not derive Strategic meaning from real artifacts, conversation or Tactical data.
- Do not add multiple-realization navigation or selection state.
- Do not introduce provenance, confidence, correction or checkpoint semantics.
- Do not create scores, KPIs, charts, rankings or executive reporting.
- Do not alter Tactical or Operational composition.
- Do not persist altitude or Strategic state.
- Do not add native commands or invoke Pi, Mirror or a provider.

## Required Checks

```bash
npm test -- src/tests/strategicJourneyWorkspace.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts src/tests/journeyAltitudeEmptyState.test.tsx
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Validation Route

1. Launch the real Tauri desktop app with the normal multi-Journey registry.
2. Select `nautilus-harness` and type an unsent Operational draft.
3. Select Strategic.
4. Read the realization, its impacts and both value lenses.
5. Confirm the surface feels wider and less dense than Tactical.
6. Confirm there are no scores, charts, workflow controls or Preview labels.
7. Select a Journey without Strategic data and confirm its name appears in the empty surface.
8. Return to Operational and confirm the draft and conversation remain intact.

### Expected observation

Strategic feels contemplative rather than managerial. One realization anchors the surface, impacts remain visibly related, and pragmatic/integrative lenses have equal weight. Switching Journey never carries Strategic content across the boundary.

### Pass condition

The Navigator accepts the composition as the permanent Strategic shell for later hydration by `CV-003.DS-004`, with contextual isolation, empty-state behavior and Operational continuity preserved.

### Fail condition

The surface resembles a metrics dashboard, value lenses compete or look scored, impacts feel unrelated, another Journey receives `nautilus-harness` data, empty-state context is wrong, or Operational continuity changes.

## Stop Conditions

- The composition requires live derivation to be understandable.
- Multiple-realization interaction becomes necessary.
- The work begins absorbing DS-004 derivation or DS-005 checkpoint semantics.
- Mounting Strategic threatens Operational/Tactical state or invocation ownership.
- Required checks fail without a story-scoped fix.

## Implementation Contract

- Follow TDD for behavior changes.
- Keep representative data keyed to its owning Journey.
- Keep the Strategic component pure and presentation-only.
- Preserve the shared contextual empty-data surface.
- Preserve explicit invocation and three-body reconciliation boundaries.
- Use no `dangerouslySetInnerHTML`.
- Use `uv run` for project Python commands when applicable.
- Stage only story-scoped files; do not use `git add .`.
- Commit coherent changes with descriptive English messages explaining why.

## Approval Gate

Implementation remains blocked until the Navigator approves this plan.
