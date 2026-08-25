[< CV-003](../index.md)

# CV-003.DS-006 — Three Published Journey Projections

**Status:** 🟠 In Progress

## Outcome

One selected Journey can publish coordinated Operational, Tactical and Strategic JSON read models through explicit ownership boundaries: Ariad deterministically owns Operational, Pi with Mirror context interprets Tactical and Strategic, Nautilus Protocol validates documents, Nautilus Method supplies semantic guidance, and Harness consumes projections without mutation authority.

## Delivery Sequence

This Delivery Story is intentionally gated:

1. Materialize the consumer-driven Mirror Journey Projection Contract v1, executable probe and return contract.
2. Stop while a separate Mirror session implements, validates, releases and installs the required capability.
3. Verify the unchanged consumer probe against the installed production version.
4. Only then initialize and evolve Nautilus Protocol and Mirror Extension, export the Method synthesis profile, hydrate Harness and run end-to-end validation.

The existence of one Delivery Story does not authorize crossing these gates implicitly.

**Current gate:** blocked until a separately released and installed Mirror version completes `RETURN-CONTRACT.md` and passes the unchanged consumer probe.

## Active Work Package

| Code | Work Package | Type | Outcome | Status |
|------|--------------|------|---------|--------|
| [CV-003.DS-006.TS-1](cv-003-ds-006-ts-1-mirror-journey-projection-contract/index.md) | Mirror Journey Projection Contract v1 and Return Probe | Technical Story | Give the independent Mirror release session a self-sufficient public contract and executable consumer acceptance kit without implementing Mirror Core here | ✅ Done |

## Later Work Packages

Later packages will be planned only after TS-1 defines the contract and its real return gate. They must preserve the sequence above and the responsibilities recorded by the exploration handoff.

## Boundaries

- This package does not implement Mirror Core.
- Nautilus consumption remains blocked until the released and installed Mirror capability passes the unchanged probe.
- Operational JSON is a deterministic Ariad read model, never a mutation source.
- Tactical and Strategic remain explicit interpretations and must reference the source snapshots they read.
- No renderer-authoritative roots, unrestricted file writes, implicit model invocation or private evidence are permitted.

## Source

- [Three Published Journey Projections exploration](../../../explorations/three-published-journey-projections-2/index.md)
