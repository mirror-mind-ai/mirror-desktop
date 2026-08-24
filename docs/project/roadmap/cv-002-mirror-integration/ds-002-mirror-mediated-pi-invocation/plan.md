# Delivery Story Plan — CV-002.DS-002

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Mirror-mediated Pi Invocation

## Objective

Deliver CV-002.DS-002 Mirror-mediated Pi Invocation as one aggregate slice. Replace or complement the current raw Pi invocation path with an explicit Mirror-mediated mode that runs the agent from the Mirror runtime/context rather than the Harness directory, associated with the active Journey, so Nautilus-initiated work is captured by Mirror conversation logging and can later be reloaded into Harness. First inspect the existing Mirror CLI/runtime logging boundary and identify the stable command or minimal wrapper needed to send a prompt through Mirror while preserving streaming/cancellation/error behavior as much as practical. Update Harness provider/run configuration UI to make the invocation mode clear to the Navigator: raw/local Pi vs Mirror-mediated Pi if both remain supported, with Mirror-mediated as the intended integration path. Implement backend Tauri process invocation so Mirror-mediated runs use the Mirror project directory/runtime and pass active Journey/session context without persisting secrets. Ensure resulting Mirror conversation is durably logged and, after completion, can be reloaded or reflected in the active Journey conversation using the existing selected reload/import path where appropriate. Preserve explicit invocation only: no auto-run on startup, Journey selection, import, reload, title generation, search, pinning or sorting. Add tests for command construction, mode labeling, Journey context propagation, no secret persistence, cancellation/error boundaries, and guardrails. Validate with npm test, npm run build, cd src-tauri && cargo check, plus a Navigator/manual route: send a Harness message through Mirror-mediated mode for a test Journey, confirm Mirror records a conversation/message for that Journey, confirm Harness can reload that conversation from Mirror, and confirm cancellation still works.

## Child Work Packages

- CV-002.DS-002.US-1
- CV-002.DS-002.TS-1
- CV-002.DS-002.TS-2
- CV-002.DS-002.TS-3

## Scope

Pending — name what this Delivery Story delivers across its child work packages.

## Non-Goals

Pending — name what is explicitly out of scope for this Delivery Story.

## Acceptance Behavior

Pending — describe the aggregate observable outcome, using Given/When/Then when practical.

## Validation Route

Pending — describe how the aggregate delivery is validated, including whether E2E is required.

## Implementation Contract

Pending — record the constraints for child work: TDD for behavior changes, changes scoped to this Delivery Story's children, and no silent scope absorption.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
