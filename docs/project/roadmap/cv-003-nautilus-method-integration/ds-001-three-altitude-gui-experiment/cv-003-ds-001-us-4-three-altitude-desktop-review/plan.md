# Plan — CV-003.DS-001.US-4

## Objective

Validate the complete promoted three-altitude foundation as one coherent desktop Journey workspace. Exercise Operational, Tactical and Strategic together in the real Tauri app, confirm Journey isolation and Operational continuity, and record either aggregate Navigator acceptance or a bounded correction list before downstream semantic hydration continues.

## Current Foundation Under Review

This review evaluates the accepted product state, not earlier experimental assumptions:

- Operational contains live conversation and the real bounded Journey-root artifact browser delivered by `CV-003.DS-002.US-1`.
- Tactical uses Journey-contextual representative mission, evidence and deliverable content only for its owning Journey; other Journeys receive an honest empty surface.
- Strategic uses Journey-contextual representative realization, related impacts and equal pragmatic/integrative value lenses only for its owning Journey; other Journeys receive an honest empty surface.
- Fixture honesty follows from contextual ownership, inert presentation and no live-derivation claim; a redundant `Preview` banner is not required.
- Altitude and Operational-area selection remain ephemeral and never invoke Pi, Mirror or a provider.

This story does not reopen individually accepted composition choices without contradictory aggregate evidence. It looks for cross-altitude or desktop-level incoherence that isolated reviews could not expose.

## Execution Shape

### 1. Establish the review baseline

- Confirm a clean working tree and identify the commit under review.
- Materialize the normal Journey registry through the existing explicit bootstrap command if required.
- Run focused altitude and artifact characterization.
- Run complete frontend, production-build and Rust baselines.
- Do not send a provider turn or mutate Journey artifacts.

### 2. Review one Journey across all altitudes

In the real Tauri app, select `nautilus-harness`:

1. In Operational Conversation, note visible state and type a distinctive unsent draft.
2. Alternate Conversation and Artifacts at full width; inspect a supported text artifact read-only and return.
3. Move to Tactical; assess whether mission leads while evidence and deliverables support orientation rather than workflow.
4. Move to Strategic; assess whether realization leads while impacts and equal value lenses support meaning recognition rather than reporting.
5. Traverse Strategic → Tactical → Operational and verify the shift feels like distance over one Journey.
6. Confirm draft, conversation, notices, composer and runtime state are unchanged.

### 3. Review Journey isolation and honest absence

Switch to a registered Journey without Tactical or Strategic fixture data:

- confirm its name remains in the shared shell;
- confirm Tactical and Strategic show that Journey's named inert empty surface;
- confirm no `nautilus-harness` semantic content leaks across Journey identity;
- return to `nautilus-harness` and confirm Operational conversation and draft continuity;
- confirm artifact browsing remains rooted in the selected Journey.

### 4. Review accessibility, safety and desktop rhythm

At normal and narrower supported desktop widths:

- altitude tabs expose stable names and selected semantics;
- Conversation/Artifacts remain full-width alternates;
- selectors retain active-run/stream and Journey-reload guards;
- Tactical has no composer, workflow or mutation path;
- Strategic has no score, KPI, chart, ranking, workflow or mutation path;
- artifact listing and preview remain read-only and registry-rooted;
- navigation causes no invocation, persistence, filesystem mutation or reconciliation change;
- focus, hierarchy, contrast and responsive stacking remain usable.

### 5. Record the aggregate decision

Capture concise non-private evidence:

- commit and selected Journeys;
- one screenshot per altitude or equivalent aggregate set;
- continuity and density shift;
- empty-state and Journey-isolation result;
- automated baseline;
- Navigator decision: `accepted` or bounded corrections.

If accepted, proceed through Validation, Debt Review and Done, then close `CV-003.DS-001` coherently. If corrections are needed, record each as a bounded correction request with explicit pass/fail evidence. Do not perform an unbounded redesign inside this review story.

## Expected Files

Review-only completion should change roadmap evidence only:

```text
cv-003-ds-001-us-4-three-altitude-desktop-review/
  implementation.md
  validation.md
  review.md
  done.md
  index.md
../index.md
```

A bounded correction may change presentation or focused tests only after its scope is named. No Rust, Python, Pi, Mirror, storage, registry or conversation-lifecycle change is expected.

## Acceptance Behavior

```text
Given nautilus-harness with an unsent Operational draft
When the Navigator traverses Conversation, Artifacts, Tactical and Strategic and returns
Then each surface has a distinct purpose over the same Journey
And the draft, conversation, runtime and reconciliation state remain unchanged
And navigation invokes no agentic body.
```

```text
Given a registered Journey without Tactical or Strategic data
When the Navigator selects those altitudes
Then a Journey-named inert empty surface appears
And no representative meaning from nautilus-harness crosses the Journey boundary.
```

```text
Given the aggregate desktop foundation
When the Navigator compares all three altitudes
Then Operational reads as activity and artifacts
And Tactical reads as orientation
And Strategic reads as realization and value
And the foundation is coherent enough for downstream hydration without structural redesign.
```

## Non-Goals

- Do not implement Tactical derivation (`CV-003.DS-003`).
- Do not implement Strategic derivation (`CV-003.DS-004`).
- Do not add provenance, correction or checkpoint semantics (`CV-003.DS-005`).
- Do not add attachments, editing, watchers, polling or artifact execution.
- Do not persist altitude or Operational-area selection.
- Do not send a provider turn merely to validate navigation.
- Do not reopen accepted shell details without contradictory aggregate evidence.
- Do not perform aesthetic redesign unrelated to an observed acceptance failure.

## Required Checks

```bash
npm test -- src/tests/journeyAltitudeSwitcher.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyDocumentationBrowser.test.tsx src/tests/tacticalJourneyWorkspace.test.tsx src/tests/strategicJourneyWorkspace.test.tsx src/tests/journeyAltitudeEmptyState.test.tsx src/tests/journeyAltitudePreview.test.ts
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

No new automated test is required for review-only evidence. Every bounded behavioral correction must begin with a failing focused test or explicit characterization.

## Navigator Validation Route

1. Launch the real Tauri app with the normal multi-Journey registry.
2. Select `nautilus-harness` and type an unsent draft in Operational Conversation.
3. Open Artifacts, inspect a supported Journey text document, and return.
4. Visit Tactical then Strategic, comparing hierarchy, density and shared-territory continuity.
5. Return to Operational and confirm draft and conversation state.
6. Select another Journey and inspect its Tactical and Strategic empty surfaces.
7. Return to `nautilus-harness` and confirm state and contextual content.
8. Repeat the cross-altitude reading at a narrower supported desktop width.

### Expected observation

Operational remains dense and active, Tactical becomes calmer and mission-oriented, and Strategic becomes wider and realization-centered. All remain the same selected Journey. Conversation state survives every transition, artifacts remain read-only and root-bounded, and another Journey receives only its own empty derived surfaces.

### Pass condition

The Navigator accepts the aggregate foundation as the permanent workspace grammar and no structural correction is needed before `CV-003.DS-003` through `CV-003.DS-005` hydrate it.

### Fail condition

Any altitude feels disconnected; runtime or draft state changes; contextual data leaks; artifacts escape authority; Tactical resembles task management; Strategic resembles reporting; navigation invokes work; or layout/accessibility prevents coherent use.

## Stop Conditions

- Aggregate acceptance requires changing Pi/Mirror/provider ownership.
- A correction would absorb real Tactical or Strategic derivation.
- A correction would add checkpoint/provenance semantics.
- Journey isolation, artifact confinement or reconciliation safety fails beyond a bounded presentation fix.
- The requested change amounts to unbounded redesign.

## Implementation Contract

- Treat this as aggregate validation first, not feature construction.
- Keep evidence free of secrets, prompts, responses, private transcripts and raw reasoning.
- Use the real desktop app for final acceptance.
- Preserve explicit invocation and three-body reconciliation boundaries.
- Preserve Journey-contextual fixture ownership and honest empty states.
- Use TDD for every behavioral correction.
- Use no `dangerouslySetInnerHTML`.
- Stage only story-scoped files; never use `git add .`.
- Commit coherent changes with descriptive English messages explaining why.

## Approval Gate

Execution and validation remain blocked until the Navigator approves this plan.
