[< Parent](../index.md)

# CV-002.DS-003.US-2 — Pi/Mirror CLI Parity Review

**Status:** ✅ Done
**Type:** User Story

---

## Outcome

Execute and document a paired semantic parity review of the essential Pi/Mirror operational loop, using the same provider/model and same prompts in Pi interactive CLI/TUI and Nautilus. Compare a no-tool baseline and the laboratorio-mirror-harness Mirror/Journey prompt across run start, ordered operations, provider-designated reasoning summaries, operation updates/output, Mirror surfaces, assistant response separation/streaming, terminal settlement, and absence of private-thinking or rotating-history leakage. Judge phases and distinctions rather than pixel layout or exact generated prose. Materialize a parity matrix with observed terminal and Nautilus sequences, evidence references, pass/gap classification, and Navigator acceptance. If a meaningful mismatch appears, record it before proposing a narrow correction; do not silently implement workarounds or absorb DS-004 conversation/context/mode/context-window/compaction scope. Validate success plus the already-proven cancellation/failure settlement without persisting raw private reasoning or display summaries.

## Story Statement

As the Navigator,
I want to compare the same representative commands in Pi/Mirror CLI/TUI and Nautilus,
So that I can confirm Nautilus preserves the meaningful operational experience without copying terminal pixels or inventing unrelated features.

## Acceptance Behavior

```text
Given the same representative prompt and equivalent provider/model configuration
When the Navigator compares Pi/Mirror interactive CLI/TUI with Nautilus
Then both expose the same meaningful active, operation, surface, response, and terminal phases
And Nautilus keeps certified display summaries ordered and separate while never leaking private reasoning
And presentation-only differences are identified rather than treated as missing features
And context concerns are routed to DS-004 rather than implemented here
```

## Scope

- Compare a no-tool baseline and one Mirror/Journey tool-use run.
- Record a sanitized parity matrix covering active status, displayable reasoning summaries, operations, surfaces, response separation, and settlement.
- Reuse accepted TS-3 cancellation/failure evidence.
- Classify every difference before deciding whether correction is required.

## Out Of Scope

- Pixel parity, exact prose/timing, unrelated Pi TUI features, direct Pi integration, and DS-004 conversation/context/mode/context-window/compaction work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Parity Review](parity-review.md)
