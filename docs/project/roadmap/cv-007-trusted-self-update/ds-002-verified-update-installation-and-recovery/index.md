[< CV-007](../index.md)

# CV-007.DS-002 - Verified Update Installation and Recovery

**Status:** ✅ Done

## Outcome

After explicit user consent, Mirror Desktop can download an authorized compatible release artifact, verify checksum and provenance before mutation, refuse unsafe active operations, apply the update safely, restart into the expected version and recover or roll back without touching Mirror state.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-007.DS-002.US-1 | Consent to a Verified Update | User Story | A user can review release notes, compatibility and risk boundaries, then approve or cancel the update before download or mutation | ✅ Done |
| CV-007.DS-002.TS-1 | Safe Download and Verification | Technical Story | The updater downloads to a staging location and verifies checksum, provenance and architecture before any application replacement begins | ✅ Done |
| CV-007.DS-002.TS-2 | Update Quiescence Guard | Technical Story | The updater blocks installation while Pi runs, conversation commits, projection writes or other unsafe native operations are active | ✅ Done |
| CV-007.DS-002.TS-3 | Atomic Apply and Last-Known-Good Recovery | Technical Story | The updater preserves the current application as last known good, applies the replacement atomically where possible, verifies launch and can recover after failure | ✅ Done |
| CV-007.DS-002.US-2 | Continue After Update or Rollback | User Story | A user restarts into the expected version or recovered version with Journey continuity, runtime binding and Mirror state preserved | ✅ Done |

## Done Condition

This Delivery Story is done when an approved compatible update is staged, verified, applied and launch-checked with bounded diagnostics, and when failed download, verification, installation or launch can recover to the previous application without deleting Mirror homes, databases, app data, credentials, Journeys, conversations or Nautilus Harness state.

## Boundary

This story consumes release authority from CV-006. It does not create the release channel, publish artifacts, install Mirror Core, migrate identity, alter provider credentials, implement app-store distribution or widen access silently.
