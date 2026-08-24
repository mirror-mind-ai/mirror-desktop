[< Parent](../index.md)

# CV-002.DS-003.TS-1 — Reference Run and Minimal Event Contract

**Status:** ✅ Done
**Type:** Technical Story

---

## Outcome

Produce an evidence-based minimal Pi/Mirror event projection contract before further UI work: select representative prompts, capture the visible Pi/Mirror CLI sequence and corresponding --mode json JSONL, compare them with Nautilus ingestion/rendering, classify each gap as mapping, transport limitation, or context concern, and document the smallest next implementation slice. Do not change application code or UI in this story.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Reference Run and Minimal Event Contract,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given a minimal no-tool Pi run and a representative Mirror/Journey run
When their Pi JSON event streams are compared with Pi interactive rendering semantics and the current Nautilus bridge
Then the persisted evidence contains no private thinking payload
And the minimum run, assistant and tool-operation projection rules are explicit
And each observed gap is classified as mapping, transport or context
And the smallest next implementation slice is identified without changing application code or UI
```

## Scope

- Deliver CV-002.DS-003.TS-1 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not silently absorb adjacent roadmap work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Reference Run Evidence](reference-run.md)
- [Minimal Event Contract](minimal-event-contract.md)
- `evidence/pi-baseline-reference.sanitized.jsonl`
- `evidence/pi-mirror-reference.sanitized.jsonl`
