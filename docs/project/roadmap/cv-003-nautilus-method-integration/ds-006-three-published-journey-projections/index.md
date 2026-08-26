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

**Current gate:** open. Mirror `v0.31.10` first completed the immutable return contract. Mirror `v0.31.11` at commit `c9519c30caac1522209a56840a09dabc123cead0` then fixed confined parent-link compilation; the installed public rebuild and inspection passed against this Journey without rewriting source links.

## Mirror Return Evidence

- [Return record](../../../../../contracts/mirror-journey-projections/v1/mirror-return.json)
- [Installed probe result](../../../../../contracts/mirror-journey-projections/v1/installed-probe-result.json)
- Contract: `mirror.journey-projections@1.0`
- Extension API: `1.1`
- Gate: `open`

## Active Work Package

| Code | Work Package | Type | Outcome | Status |
|------|--------------|------|---------|--------|
| [CV-003.DS-006.TS-1](cv-003-ds-006-ts-1-mirror-journey-projection-contract/index.md) | Mirror Journey Projection Contract v1 and Return Probe | Technical Story | Give the independent Mirror release session a self-sufficient public contract and executable consumer acceptance kit without implementing Mirror Core here | ✅ Done |
| [CV-003.DS-006.TS-2](cv-003-ds-006-ts-2-repository-baselines-and-mirror-compatibility/index.md) | Repository Baselines and Mirror Compatibility | Technical Story | Version Protocol and Mirror Extension independently and prove the extension consumes the released public API without internal imports | ✅ Done |
| [CV-003.DS-006.TS-3](cv-003-ds-006-ts-3-nautilus-projection-protocol/index.md) | Nautilus Projection Protocol | Technical Story | Define validated Tactical and Strategic document contracts over the released Mirror envelope | ✅ Done |
| [CV-003.DS-006.TS-4](cv-003-ds-006-ts-4-nautilus-method-synthesis-profile/index.md) | Nautilus Method Synthesis Profile | Technical Story | Export compact versioned semantic guidance for explicit Tactical and Strategic interpretation | ✅ Done |
| [CV-003.DS-006.TS-5](cv-003-ds-006-ts-5-explicit-synthesis-publication-boundary/index.md) | Explicit Synthesis Publication Boundary | Technical Story | Keep Pi interpretation explicit while the extension owns Protocol validation and publication authority | ✅ Done |

## Next Delivery Boundary

TS-2 through TS-5 established repository ownership, released Mirror compatibility, Nautilus projection contracts, the Method runtime profile and an explicit Pi-to-publication boundary. The next package should hydrate Harness from the current manifest and three projection documents without moving derivation or mutation authority into the desktop app.

## Boundaries

- This package does not implement Mirror Core.
- Nautilus consumption requires a released and installed Mirror capability that passes the unchanged probe and current confined-link rebuild gate.
- Operational JSON is a deterministic Ariad read model, never a mutation source.
- Tactical and Strategic remain explicit interpretations and must reference the source snapshots they read.
- No renderer-authoritative roots, unrestricted file writes, implicit model invocation or private evidence are permitted.

## Source

- [Three Published Journey Projections exploration](../../../explorations/three-published-journey-projections-2/index.md)
