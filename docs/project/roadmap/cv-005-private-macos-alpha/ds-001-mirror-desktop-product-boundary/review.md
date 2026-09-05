# Debt Review — CV-005.DS-001

## Status

review:pay_now

## Summary

Pay the validation-discovered channel bootstrap debt now: add an explicit development registry import, present channel-correct empty-state guidance, and provide a safe source-built desktop validation launch that does not inherit conflicting Mirror coordinates.

## Resolution

The selected debt was paid in the same Delivery Story. Mirror Desktop now exposes separate stable and development registry import commands, renders channel-correct recovery guidance, and provides one macOS validation launcher that refreshes both registries and removes inherited Mirror coordinates before opening the source-built bundles.

Evidence:

- `npm test`: 100 files and 565 tests passed.
- `npm run build`: passed with only the existing large-chunk advisory.
- `cargo test`: 92 tests passed.
- `cargo check`: passed.
- `npm run import:mirror`: published 11 stable root Journeys.
- `npm run import:mirror:dev`: published 3 development root Journeys.
- `npm run validate:desktop:launch`: opened both bundles concurrently with distinct channel registries and no new development crash report.

No relevant debt from this review remains unresolved.

## Child Work Packages

- CV-005.DS-001.TS-1
- CV-005.DS-001.US-1
- CV-005.DS-001.TS-2
- CV-005.DS-001.TS-3

## Boundary

No push or release action is authorized by this checkpoint.
