# Test Guide — CV-003.DS-001.US-4

## Purpose

Validate the aggregate three-altitude foundation in the real desktop Harness after its individual shells have been accepted. This tests continuity across surfaces and Journeys rather than repeating isolated component approval.

## Preconditions

- Use the normal multi-Journey registry in Tauri.
- Review the committed build without sending a provider turn.
- Select `nautilus-harness` plus a Journey without contextual Tactical or Strategic fixture data.
- Exclude private transcript content from screenshots and evidence.

## Scenario 1 — Operational round trip

1. Select `nautilus-harness` and Operational Conversation.
2. Type a distinctive unsent draft.
3. Note the final visible message, reconciliation notice and runtime footer.
4. Open Artifacts and inspect one supported text document.
5. Return to Conversation.

Pass when both areas use full width, artifact access remains read-only, and conversation state is unchanged.

## Scenario 2 — Altitude rhythm

1. Move from Operational to Tactical.
2. Confirm mission leads while evidence and deliverables support it.
3. Move from Tactical to Strategic.
4. Confirm realization leads while impacts and equal value lenses support it.
5. Return through Tactical to Operational.

Pass when density progressively recedes without changing Journey, Tactical is orientation rather than task management, and Strategic is meaning recognition rather than reporting.

## Scenario 3 — One territory

Compare Operational activity/artifacts, Tactical mission and Strategic realization for `nautilus-harness`.

Pass when they feel like three distances over one Journey while Tactical and Strategic remain representative pending derivation. Fail if they read as unrelated modules or claim live derivation.

## Scenario 4 — Journey isolation

1. Switch to another Journey without derived fixture data.
2. Visit Tactical and Strategic.
3. Confirm both empty surfaces name that Journey.
4. Confirm no `nautilus-harness` semantic content appears.
5. Return to `nautilus-harness` and Operational.

Pass when contextual data and artifacts remain Journey-bound and the original draft/conversation restore unchanged.

## Scenario 5 — Inert navigation and safety

Traverse altitude and Operational-area selectors without sending a message.

Pass when no Pi, Mirror or provider work starts; no persistence or filesystem mutation occurs; active-run/reload guards remain; and reconciliation state does not change.

## Scenario 6 — Accessibility and desktop layout

At normal and narrower supported widths:

- inspect tab names and selected semantics;
- navigate controls by keyboard;
- inspect focus visibility and reading order;
- confirm value lenses stack coherently;
- confirm essential content remains reachable.

Pass when the workspace remains legible and operable without losing distinct altitude rhythm.

## Scenario 7 — Forbidden affordances

Confirm:

- Tactical has no composer, editable form, task board or workflow mutation;
- Strategic has no score, KPI, chart, ranking, report control or workflow mutation;
- Artifacts has no editing, opening, execution, attachment, watcher or polling;
- no `dangerouslySetInnerHTML` exists;
- altitude navigation has no invocation handler.

## Automated Baseline

```bash
npm test -- src/tests/journeyAltitudeSwitcher.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyDocumentationBrowser.test.tsx src/tests/tacticalJourneyWorkspace.test.tsx src/tests/strategicJourneyWorkspace.test.tsx src/tests/journeyAltitudeEmptyState.test.tsx src/tests/journeyAltitudePreview.test.ts
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

No new test is required for review-only evidence. Every bounded behavioral correction requires a focused failing test or characterization.

## Evidence Record

Record the commit, selected Journeys, automated results, altitude observations/screenshots, draft continuity, artifact authority, Journey isolation, accessibility/narrow layout, and aggregate decision (`accepted` or bounded corrections).

## Pass Condition

All checks and scenarios pass, and the Navigator accepts the aggregate foundation as the durable grammar for downstream hydration.

## Fail Condition

Any continuity, Journey isolation, artifact authority, runtime safety, accessibility or altitude-purpose boundary fails, or structural redesign is required before hydration.
