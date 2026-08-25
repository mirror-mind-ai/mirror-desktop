[< Parent](../index.md)

# CV-003.DS-001.TS-1 — Altitude Navigation and Preview Contract

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to experiment with three Journey altitudes without contaminating runtime authority,
as the Harness presentation layer,
I want a typed altitude state and one sanitized representative preview model,
so that every view can be composed and tested independently from Pi, Mirror and persisted conversation state.

## Outcome

The application has an accessible Operational/Tactical/Strategic selector and deterministic, visibly representative preview data shared across the experiment.

## Acceptance Behavior

```text
Given the existing Harness shell
When altitude state changes
Then only presentation selection changes
And no invocation, reconciliation or persistence operation runs.
```

## Scope

- Typed altitude values and Operational default.
- Pure representative preview data.
- Accessible selector states and labels.
- Characterization tests around runtime separation.

## Out Of Scope

- Altitude persistence.
- Live filesystem reads.
- Semantic derivation.
- Pi, Mirror, Rust or provider changes.

## Validation

Focused TypeScript/component tests plus the aggregate DS baseline.
