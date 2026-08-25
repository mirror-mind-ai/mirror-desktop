[< Parent](../index.md)

# CV-003.DS-001.US-1 — Operational Journey Workspace

**Status:** 🟠 In Validation
**Type:** User Story

## User Story

As the Navigator,
I want the existing conversation and a Journey artifacts preview to share the Operational altitude,
so that I can feel work and its material context as one nearby field before real filesystem projection is built.

## Outcome

The approved altitude selector is mounted in a simplified live Journey header. Operational contains two alternate full-width surfaces, Conversation and Artifacts, so material context never permanently compresses the conversation or future altitudes. Tactical and Strategic are reachable as honest bounded placeholders for their subsequent stories. The former Mission, Delivery, Situation, Current Map and participant summaries are removed to create durable header space for altitude navigation and later Journey controls.

## Acceptance Behavior

```text
Given a loaded Journey conversation and an unsent draft
When I visit Tactical or Strategic and return to Operational
Then the same messages, draft, runtime state and reconciliation boundaries remain
And altitude navigation does not invoke Pi, Mirror or a provider.
```

```text
Given Operational is selected
When I alternate between Conversation and Artifacts
Then each surface occupies the full available workspace
And returning to Conversation preserves the draft, conversation and runtime state
And the Artifacts canvas gives its full body to Workspace structure and Artifact detail area without redundant framing.
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
- Add a controlled Conversation/Artifacts selector inside Operational.
- Keep the existing message stream, composer and runtime behavior intact in the full-width Conversation surface.
- Add a full-width representative Artifacts surface using the TS-1 fixture.
- Remove redundant Artifacts eyebrow, repeated Journey title, explanatory preview copy and badge so the two workspace cards occupy the canvas.
- Keep the existing grammar/settings panel optional in Conversation and force it closed outside Conversation.
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
- [Implementation](implementation.md)
- [Validation](validation.md)
