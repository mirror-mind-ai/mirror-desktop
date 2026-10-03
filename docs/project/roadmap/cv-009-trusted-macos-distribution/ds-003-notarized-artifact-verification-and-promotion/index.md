[< CV-009](../index.md)

# CV-009.DS-003 - Notarized Artifact Verification and Promotion

**Status:** 🟡 Planned

## Outcome

A signed Mirror Desktop release candidate can receive an Apple notarization ticket, be stapled to its distributable artifact, be verified independently and enter the existing governed release route only through an explicit promotion decision.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-009.DS-003.TS-1 | Notary Submission and Stapling Procedure | Technical Story | Submits the precise signed artifact, captures bounded acceptance or failure evidence and staples the accepted ticket | 🟡 Planned |
| CV-009.DS-003.US-1 | Verify a Trusted macOS Download | User Story | A recipient can open the exact released artifact on a clean supported Mac without a Gatekeeper exception and with trustworthy failure diagnosis when verification fails | 🟡 Planned |
| CV-009.DS-003.TS-2 | Notarized Release Evidence and Promotion Guard | Technical Story | Connects final artifact identity, checksum, notarization evidence and rollback coordinates without making publication or stable promotion automatic | 🟡 Planned |

## Done Condition

A dry-run or explicitly authorized release candidate completes notarization and stapling, passes signature and Gatekeeper checks on an appropriate clean macOS environment, and preserves only bounded evidence tied to the existing release provenance. Publication remains a separate decision.
