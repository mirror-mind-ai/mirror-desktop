[< CV-009](../index.md)

# CV-009.DS-002 - Signed macOS Release Runner

**Status:** 🟡 Planned

## Outcome

A clean authorized Mirror Desktop revision can be built on the maintainer's Mac into a Developer ID-signed application bundle with Hardened Runtime, deliberate entitlements and bounded signing evidence.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-009.DS-002.TS-1 | Tauri Signing and Entitlements Contract | Technical Story | Configures and validates the exact signing, nested-code and entitlement behavior required by the pinned Tauri toolchain | 🟡 Planned |
| CV-009.DS-002.TS-2 | Manual macOS Release Runner | Technical Story | Provides a repeatable clean-build, temporary credential-import, signing, inspection and cleanup procedure for the maintainer's Mac | 🟡 Planned |

## Done Condition

A controlled dry run produces a signed bundle whose identity, Developer ID chain, Hardened Runtime and entitlements are inspected successfully, while failures fail closed and no credential is retained in source, artifact or ordinary logs.
