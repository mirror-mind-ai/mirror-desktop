# Plan — CV-003.DS-001.TS-1

## Objective

Define the typed, presentation-only contract for Operational, Tactical and Strategic altitude selection plus one sanitized read-only preview model shared by the three views. Characterize the current shell first, keep altitude selection controlled and independent from Journey conversation/runtime ownership, expose accessible deterministic selection, and prove the contract cannot invoke Pi, Mirror or a provider.

## Existing Terrain

`App.tsx` currently owns Journey selection, conversation lifecycle, provider configuration, Pi context, reconciliation and the three-column desktop shell. It is already large and imports every invocation boundary directly. This story must not add altitude state to that component yet.

The repository already validates presentation components with Vitest and `renderToStaticMarkup`, and uses raw-source characterization where an architectural non-import or call-site invariant matters. That is sufficient for this unmounted foundation.

## TDD Sequence

### 1. Characterize the separation boundary

Add a focused test that defines the contract before production code:

- accepted altitude values are exactly `operational`, `tactical` and `strategic`;
- Operational is the declared default;
- selector output identifies all three choices and one selected choice accessibly;
- the selector and preview modules do not import Pi process, provider, Mirror reconciliation, conversation storage or Tauri APIs.

Keep this architectural assertion narrow. It should name forbidden runtime dependencies rather than freezing incidental source formatting.

### 2. Introduce the altitude contract

Create `src/app/journeyAltitudePreview.ts` with:

- `JourneyAltitude` union;
- ordered altitude descriptors with stable labels;
- `defaultJourneyAltitude`;
- read-only types for artifacts, mission, evidence, deliverables, realizations, impacts and value lenses;
- one exported representative preview model.

The model should be a compile-time read-only fixture, not React state and not persisted data. It should use sanitized roadmap facts such as three-body conversation parity and the current method-integration experiment. No prompts, responses, transcript fragments, private reasoning, runtime identifiers or user-private paths may enter the fixture.

Every exported preview model must carry an explicit marker such as `kind: "representative_preview"` and user-facing preview copy for later views.

### 3. Create the controlled selector

Create `src/app/JourneyAltitudeSwitcher.tsx` as a controlled presentation component:

```ts
type JourneyAltitudeSwitcherProps = {
  value: JourneyAltitude;
  onChange: (altitude: JourneyAltitude) => void;
};
```

The component should:

- render the ordered altitude descriptors from the contract;
- expose a labelled `tablist` or equivalent single-selection navigation pattern;
- expose each option as a button with selected-state semantics;
- call only the supplied `onChange` callback;
- contain no persistence, invocation or Journey switching behavior;
- provide stable class hooks for US-1 styling without defining the final visual treatment.

Do not mount it in `App.tsx` in this story. Live integration and ephemeral state ownership belong to US-1.

### 4. Prove the shared semantic thread

Add fixture tests that establish relationships later views will rely upon:

- Tactical mission references evidence and deliverable identifiers present in the same model;
- Strategic realization references impacts and both value lenses in the same model;
- the strategic realization is related to the tactical mission/deliverables rather than an unrelated example;
- artifact entries are representative relative paths only and contain no absolute private paths;
- all user-facing fixture groups inherit explicit preview status.

These tests validate coherence, not final Nautilus semantics.

### 5. Run the scoped baseline

Run focused tests first, then the full frontend suite and production build. No Rust behavior changes are expected, so native checks belong to the aggregate DS baseline rather than this isolated technical contract unless an unexpected native dependency is introduced.

## Expected Files

```text
src/app/journeyAltitudePreview.ts
src/app/JourneyAltitudeSwitcher.tsx
src/tests/journeyAltitudePreview.test.ts
src/tests/journeyAltitudeSwitcher.test.tsx
```

Existing files should remain unchanged unless a narrow test helper or export is required. In particular, do not modify `App.tsx`, `app.css`, Rust, Python or Mirror code under this story.

## Scope

- Typed Operational/Tactical/Strategic vocabulary.
- Stable order, labels and default altitude.
- Controlled accessible selector contract.
- Sanitized read-only representative Journey model.
- Coherence and architectural-separation tests.

## Non-Goals

- Mounting or styling the selector in the current shell.
- Storing selected altitude in `App`, local storage or Journey preferences.
- Rendering Operational artifacts, Tactical cards or Strategic value surfaces.
- Reading the filesystem.
- Deriving semantic data.
- Adding preview interaction beyond altitude selection.
- Changing Pi/Mirror invocation, context, reconciliation, conversation or persistence.
- Implementing any sibling package.

## Acceptance Behavior

```text
Given the altitude contract
When a consumer renders the selector with Tactical selected
Then Operational, Tactical and Strategic remain available in stable order
And Tactical alone exposes the selected state
And selecting another option only calls the consumer callback.
```

```text
Given the representative preview model
When its relationships and content are inspected
Then one sanitized Journey thread spans artifacts, mission, evidence, deliverables, realization, impacts and both value lenses
And every derived-looking group is explicitly marked as representative preview content.
```

```text
Given the existing runtime architecture
When the new modules are inspected and the full frontend suite runs
Then they have no Pi, Mirror, provider, persistence, Tauri or conversation dependency
And existing behavior remains green.
```

## Validation Route

This technical story uses fixture/component-level validation rather than desktop E2E because the selector is deliberately not mounted in the live app until US-1. Navigator-visible validation consists of reviewing static rendered selector output for each selected altitude and the sanitized representative model shape.

Required checks:

```bash
npm test -- --run src/tests/journeyAltitudePreview.test.ts src/tests/journeyAltitudeSwitcher.test.tsx
npm test
npm run build
```

The command syntax may be adjusted to Vitest's supported focused-file form if needed, without changing the validation intent.

## Pass Condition

- focused contract and component tests pass;
- full frontend suite and production build pass;
- preview content is sanitized and explicitly non-authoritative;
- new modules do not import runtime ownership boundaries;
- no existing production file outside the expected presentation contract is changed without documented cause.

## Stop Conditions

- selector behavior requires mounting or restructuring `App.tsx`;
- preview content requires private conversation/runtime evidence;
- a Pi, Mirror, provider, Tauri, filesystem or persistence dependency appears necessary;
- semantic decisions from CV-003.DS-002 through DS-005 are needed to define the fixture;
- a required baseline fails for reasons outside the narrow story and no scoped fix is clear.

## Implementation Contract

- Follow red/green/refactor.
- Keep the selector controlled and side-effect free.
- Keep preview data typed, read-only, sanitized and separate from runtime state.
- Do not use `dangerouslySetInnerHTML` or local-link behavior in this foundation.
- Stage and commit only story-scoped files with an English message explaining the isolation boundary.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
