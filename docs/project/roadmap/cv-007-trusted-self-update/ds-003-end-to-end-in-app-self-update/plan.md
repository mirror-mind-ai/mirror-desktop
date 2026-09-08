# Delivery Story Plan — CV-007.DS-003

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

End-to-End In-App Self-Update

## Objective

Deliver the complete user-visible self-update loop for Mirror Desktop: the app checks the trusted update channel, notifies the user when a compatible newer version exists, shows release notes and boundaries, accepts an explicit Update action, fetches and stages the selected artifact, verifies checksum/provenance/architecture, refuses unsafe active operations, applies the update through a native boundary, relaunches into the expected version, preserves Journey continuity and Mirror state, and rolls back to last-known-good if install or launch verification fails.

## Child Work Packages

- CV-007.DS-003.US-1
- CV-007.DS-003.US-2
- CV-007.DS-003.TS-1
- CV-007.DS-003.TS-2
- CV-007.DS-003.TS-3
- CV-007.DS-003.US-3

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
