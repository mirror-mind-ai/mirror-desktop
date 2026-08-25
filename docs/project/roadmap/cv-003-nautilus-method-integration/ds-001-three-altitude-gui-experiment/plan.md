# Delivery Story Plan — CV-003.DS-001

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Three-Altitude GUI Experiment

## Objective

Deliver a bounded, testable GUI experiment in the existing Tauri/React Harness so the Navigator can feel the selected Journey at operational, tactical and strategic altitudes. Preserve the current sidebar, live conversation, explicit invocation and reconciliation behavior; use one visibly representative preview data set for artifacts and derived views; validate spatial continuity in the desktop app before real filesystem projection or semantic derivation.

## Product Hypothesis

The three altitudes are not separate modules. They are changes of distance over the same selected Journey:

- Operational is close, dense and alive. The existing conversation remains primary and a representative artifacts panel suggests the future workspace relationship.
- Tactical lets conversation recede into a calmer reading of missions, evidence and deliverables.
- Strategic creates more space around realizations, impacts and value, with pragmatic and integrative lenses visible as complementary readings.

The experiment succeeds only if switching altitude feels like reframing one territory rather than navigating to an unrelated application area.

## Child Work Packages

### CV-003.DS-001.TS-1 — Altitude Navigation and Preview Contract

Characterize the existing shell and introduce the smallest typed experiment substrate:

- `JourneyAltitude` with `operational`, `tactical` and `strategic` values;
- an ephemeral selected-altitude state that defaults to Operational;
- one immutable representative preview model shared by all three views;
- explicit preview labeling so fixture content cannot be mistaken for live derivation;
- accessible labels and deterministic view-selection behavior;
- no change to Pi, Mirror, conversation, reconciliation or persistence contracts.

The preview model should use plausible material from `nautilus-harness`, including the recently completed three-body parity realization and the current method-integration mission. It must contain no private transcript content.

### CV-003.DS-001.US-1 — Operational Journey Workspace

Preserve the current working conversation as the Operational altitude:

- retain Journey selection, header, message stream, composer, runtime activity, reconciliation notices and keyboard behavior;
- add the altitude selector to the stable Journey header;
- compose a bounded artifacts preview beside the conversation using representative folders/files;
- distinguish artifact preview from real workspace inspection;
- keep allowed-root link behavior and the existing explicit invocation boundary unchanged;
- ensure draft text and loaded conversation survive switching away and back.

This package may reorganize presentation components, but must not rewrite the conversation lifecycle.

### CV-003.DS-001.US-2 — Tactical Journey Preview

Compose a quieter tactical view from the shared representative model:

- active mission as the directional anchor;
- evidence and deliverables as related, not independent, collections;
- restrained density and clear hierarchy;
- visible preview status;
- no editable forms, drag/drop board or claim of live derivation;
- no composer or provider action in the tactical surface.

The selected Journey remains visible and the sidebar remains usable.

### CV-003.DS-001.US-3 — Strategic Journey Preview

Compose a spacious strategic view from the same representative model:

- realizations as the primary selectable reading;
- observed impacts associated with the selected realization;
- pragmatic and integrative value shown together, not as competing scores;
- visual continuity with the tactical mission/deliverable material;
- visible preview status;
- no executive metrics dashboard, scoring or claim of authoritative value derivation.

### CV-003.DS-001.US-4 — Three-Altitude Desktop Review

Run the complete experiment in the real Tauri desktop shell and record Navigator judgment:

- feel the density shift from Operational to Tactical to Strategic;
- verify the same Journey remains the object of all three views;
- switch Journeys and confirm no conversation state or runtime ownership leaks;
- return to Operational and confirm the original draft, messages and controls remain intact;
- inspect preview honesty and desktop layout at the normal window size;
- classify the direction as continue, correct or discard before CV-003.DS-002 or semantic derivation is pulled.

## Implementation Shape

Prefer small presentation modules over adding more unrelated markup to the already large `App.tsx`:

```text
src/app/
  JourneyAltitudeSwitcher.tsx
  OperationalArtifactsPreview.tsx
  TacticalJourneyPreview.tsx
  StrategicJourneyPreview.tsx
  journeyAltitudePreview.ts
```

The exact names may change during TDD, but the boundaries should remain:

- pure typed preview data separate from runtime state;
- altitude selection separate from Pi/Mirror run state;
- existing chat behavior reused rather than duplicated;
- CSS extensions scoped under altitude-specific classes;
- no Rust or Python change expected.

The current right-side grammar inspector may be reused as the spatial location for the Operational artifacts preview, provided existing settings and diagnostics remain reachable. Tactical and Strategic can use the available workspace width without mounting the message composer.

## Scope

- Stable altitude navigation within the selected Journey shell.
- Functional existing conversation in Operational.
- Representative artifacts composition in Operational.
- Representative mission/evidence/deliverable composition in Tactical.
- Representative realization/impact/value composition in Strategic.
- Shared visual language with deliberate density changes.
- Accessible view labels and selected-state semantics.
- Unit/characterization coverage and real desktop Navigator review.

## Non-Goals

- Reading the real Journey filesystem.
- Attaching artifacts to prompts or granting broader filesystem authority.
- Deriving missions, evidence, deliverables, realizations, impacts or value.
- Persisting altitude preference.
- Provenance, confidence, correction or synthesis checkpoints.
- New Pi/provider/Mirror invocation paths.
- Changes to conversation identity, reconciliation, context accounting or compaction.
- Responsive mobile design or a final design system.
- Implementing DS-007, DS-008 or DS-009 implicitly.

## Acceptance Behavior

```text
Given a selected Journey with a loaded Harness conversation
When the Navigator selects Operational, Tactical and Strategic
Then each altitude presents a distinct density and purpose
And the Journey sidebar and active Journey identity remain continuous
And all non-operational content is visibly representative preview data.
```

```text
Given draft text, restored messages and existing runtime state in Operational
When the Navigator visits Tactical or Strategic and returns to Operational
Then draft text, conversation content, reconciliation boundaries and send controls are unchanged
And no Pi, provider or Mirror process was started by altitude navigation.
```

```text
Given the shared representative Journey model
When Tactical and Strategic are compared
Then missions/evidence/deliverables and realizations/impacts/value feel causally related
And pragmatic and integrative value remain two lenses over one realization
And the interface does not claim that these readings were derived live.
```

## Validation Route

Automated validation is necessary but insufficient. Use pure unit tests and static component rendering for the typed contract, accessible labels, preview honesty and view content. Run the existing frontend and native baselines because the experiment touches the main application shell.

Navigator E2E is required in the real desktop app. Use the current selected Journey and existing local conversation without sending a provider turn. Type an unsent draft, traverse all altitudes, switch back, and verify continuity. Capture feedback on spatial hierarchy and altitude feeling rather than treating screenshot fidelity alone as acceptance.

## Required Checks

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Stop Conditions

- The experiment requires changing Pi/Mirror runtime ownership.
- Representative content cannot be clearly distinguished from live data.
- Existing conversation, draft or reconciliation state is lost when switching altitude.
- The current shell cannot support the three views without an unbounded redesign.
- Real artifact access or semantic derivation becomes necessary to make the experiment understandable.
- A child package begins absorbing DS-007, DS-009 or CV-003.DS-002 through DS-005.

## Implementation Contract

- Follow TDD for behavior changes and characterize the current shell before restructuring it.
- Keep changes scoped to the five approved work packages.
- Preserve explicit invocation and all three-body safety contracts.
- Use representative, sanitized and visibly labeled preview data only.
- Keep Rust thin and avoid native changes unless a desktop rendering defect proves one necessary.
- Do not absorb real filesystem or semantic derivation work silently.
- Record Navigator visual feedback as validation evidence before recommending the next CV-003 story.

## Approval Gate

Implementation remains blocked until the Navigator reviews and approves this plan.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
