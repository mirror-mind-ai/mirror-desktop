[< Parent](../index.md)

# CV-003.DS-001.US-1 — Operational Journey Workspace

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want the existing conversation and a Journey artifacts preview to share the Operational altitude,
so that I can feel work and its material context as one nearby field before real filesystem projection is built.

## Outcome

The approved altitude selector is mounted in a simplified live Journey header. Operational remains the complete functional cockpit, now accompanied by a clearly representative artifacts panel. Tactical and Strategic are reachable as honest bounded placeholders for their subsequent stories. The former Mission, Delivery, Situation, Current Map and participant summaries are removed to create durable header space for altitude navigation and later Journey controls.

## Acceptance Behavior

```text
Given a loaded Journey conversation and an unsent draft
When I visit Tactical or Strategic and return to Operational
Then the same messages, draft, runtime state and reconciliation boundaries remain
And altitude navigation does not invoke Pi, Mirror or a provider.
```

```text
Given Operational is selected
When I inspect the workspace
Then conversation remains primary
And representative folders/files appear beside it with explicit preview labeling
And settings and diagnostics remain reachable.
```

```text
Given the simplified Journey header
When the altitude selector is mounted
Then Mission, Delivery, Situation, Current Map and participant summary components are absent
And Journey identity, menu actions and the concise moment summary remain available.
```

## Scope

- Remove Mission, Delivery, Situation, Current Map and participant summaries from the header, including dead presentation logic and styles.
- Preserve Journey identity, menu actions and the concise moment summary.
- Mount and style the three-altitude selector in the simplified Journey header.
- Keep the existing message stream, composer and runtime behavior intact in Operational.
- Add a representative artifacts panel using the TS-1 fixture.
- Add honest bounded placeholders for Tactical and Strategic.
- Keep selected altitude ephemeral and presentation-only.
- Prevent altitude switching from hiding an active run or Journey reload.
- Cover continuity, preview honesty and runtime separation with tests and desktop validation.

## Out Of Scope

- Tactical mission/evidence/deliverable composition.
- Strategic realization/impact/value composition.
- Real workspace reads, file opening or prompt attachment.
- Semantic derivation, provenance, correction or checkpoints.
- Altitude persistence.
- Pi, Mirror, provider, conversation identity or reconciliation changes.

## Validation

Run focused presentation/characterization tests, the complete frontend/native baseline and a Navigator-guided route in the real Tauri app.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
