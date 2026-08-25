[< Parent](../index.md)

# CV-003.DS-001.TS-1 — Altitude Navigation and Preview Contract

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to experiment with three Journey altitudes without contaminating runtime authority,
as the Harness presentation layer,
I want a typed altitude contract and one sanitized representative preview model,
so that each user-facing view can be composed and tested independently from Pi, Mirror and persisted conversation state.

## Outcome

The application has a reusable accessible Operational/Tactical/Strategic selector contract and deterministic, visibly representative preview data shared across the experiment.

## Acceptance Behavior

```text
Given the existing Harness presentation boundary
When a controlled altitude selection changes
Then the selector exposes the new accessible selected state
And no invocation, reconciliation or persistence dependency participates.
```

```text
Given the representative Journey preview model
When Operational, Tactical and Strategic components consume it
Then they receive one typed, read-only and sanitized semantic thread
And the data identifies itself as preview rather than live derivation.
```

## Scope

- Typed altitude values, labels and Operational default.
- Controlled accessible altitude selector component.
- Pure representative preview model shared by later child stories.
- Sanitized content grounded in `nautilus-harness` public roadmap facts.
- Characterization tests proving separation from runtime ownership.

## Out Of Scope

- Mounting the selector in the live `App` shell.
- Altitude persistence or Journey-specific altitude state.
- Operational, Tactical or Strategic workspace composition.
- Real filesystem reads or semantic derivation.
- Pi, Mirror, Rust, provider or conversation changes.

## Validation

Use focused TypeScript and static React rendering tests. Full desktop E2E is deferred to US-1 and US-4 because this technical story creates an unmounted controlled presentation contract.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
