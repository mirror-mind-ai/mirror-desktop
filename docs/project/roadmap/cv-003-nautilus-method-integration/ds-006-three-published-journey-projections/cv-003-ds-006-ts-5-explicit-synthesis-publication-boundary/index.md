[< Parent](../index.md)

# CV-003.DS-006.TS-5 — Explicit Synthesis Publication Boundary

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

Pi operating with active Mirror context can respond to the four explicit Nautilus synthesis intents, derive candidate meaning from inspected Journey projections, and hand only candidate content to a self-contained extension. The extension owns source coordinates, envelope construction, Protocol validation and atomic publication without invoking a provider itself.

## Acceptance Behavior

```text
Given a registered Journey with a current Ariad Operational projection
And the Nautilus extension contains immutable Protocol v1 and Method profile v1 runtime assets
When the Navigator explicitly asks Pi to update Tactical, Strategic, Operational or all Journey syntheses
Then Pi inspects the selected Journey and interprets only the requested altitude
And the extension constructs, validates and publishes the derived envelope in namespace nautilus-synthesis
And Tactical cites the selected Operational snapshot
And Strategic cites the selected Operational snapshot and, when supplied, the selected Tactical snapshot
And malformed or relationally invalid content does not replace the last valid projection
And no extension command invokes Pi, Mirror Mode, a persona or a provider implicitly
```

## Scope

- Add explicit Tactical and Strategic publication commands accepting content through standard input.
- Keep Journey and source-snapshot coordinates outside model-authored content.
- Bundle checksum-traceable Protocol schemas/validators and the Method synthesis profile as extension runtime assets.
- Encode the four Portuguese explicit intents and deterministic execution order in the Pi skill.
- Preserve `contract-smoke` as an isolated compatibility diagnostic.
- Return bounded structured publication receipts without echoing candidate content.

## Out of Scope

- Harness projection hydration.
- Automatic or background synthesis.
- Conversation transcript persistence as evidence.
- Checkpoint correction UX or meaning approval semantics from DS-005.
- Mirror Core changes or cross-namespace filesystem access by the extension.
- Claiming that publication makes an interpretation timeless or mutation truth.

## Key Ownership Decision

The Pi skill may inspect Ariad Operational through the public Mirror CLI because the Extension API is intentionally namespace-bound. It passes immutable source coordinates and candidate content to the extension. The extension never claims Ariad authority and never supplies a Journey root.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)
- [Validation](validation.md)
- [Debt Review](review.md)
- [Done](done.md)
