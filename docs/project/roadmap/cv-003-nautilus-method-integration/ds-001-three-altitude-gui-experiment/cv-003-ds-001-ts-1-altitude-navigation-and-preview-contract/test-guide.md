[< Story](index.md)

# Test Guide — CV-003.DS-001.TS-1

## Purpose

Validate a reusable altitude-selector and representative-preview contract without mounting it into the live Harness or crossing any Pi/Mirror runtime boundary.

## Contract Scenario

Render `JourneyAltitudeSwitcher` once for each selected value.

Pass when:

- exactly Operational, Tactical and Strategic appear in stable order;
- the supplied value alone is selected;
- the group and options expose accessible selection semantics;
- the component accepts only a controlled value and callback.

Fail when the component owns persistence, Journey selection, invocation or unrelated application state.

## Preview Coherence Scenario

Inspect the representative model as pure data.

Pass when:

- its kind explicitly identifies representative preview content;
- artifact paths are relative and sanitized;
- the tactical mission relates to model evidence and deliverables;
- the strategic realization relates to impacts and both value lenses;
- Tactical and Strategic describe one coherent Journey thread;
- no private transcript, runtime identifier, prompt, response, reasoning or absolute private path is present.

## Runtime Separation Scenario

Characterize the new selector and preview modules.

Pass when they do not import or call:

- `piProcessStream` or any provider invocation boundary;
- Mirror reconciliation or conversation logging;
- Journey conversation/preference persistence;
- Tauri APIs;
- filesystem APIs.

Fail when altitude selection can trigger any side effect beyond the supplied callback.

## Automated Checks

Focused:

```bash
npm test -- --run src/tests/journeyAltitudePreview.test.ts src/tests/journeyAltitudeSwitcher.test.tsx
```

If Vitest rejects that argument ordering, run the equivalent supported focused-file command and record it.

Baseline:

```bash
npm test
npm run build
```

## Navigator Validation

No desktop E2E is required for this unmounted technical story. Present:

- static selector rendering for each selected altitude;
- the public sanitized preview shape;
- focused and full frontend results;
- confirmation that only the expected new presentation/test files changed.

Pass when the Navigator accepts the contract as a safe foundation for US-1. Fail when judging it requires prematurely integrating the live shell.

## Evidence Hygiene

Record only fixture structure, test counts and changed paths. Do not persist prompts, responses, private conversation content, arbitrary runtime metadata or reasoning.
