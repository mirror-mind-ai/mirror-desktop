[< Story](index.md)

# Test Guide — CV-009.DS-001

## Aggregate Validation

Review the completed publisher and custody documents against this Delivery Story plan and the existing versioned-release and trusted-updater guides. Verify that Software Zen is named as the intended publisher; credential classes, permitted storage, temporary use, cleanup and recovery are explicit; the VPS and personal-Mac runner responsibilities are separated; and no secret or publication authority appears in the documents.

## Child Work Packages

- CV-009.DS-001.TS-1
- CV-009.DS-001.TS-2

## Navigator Validation

Expected observation: the Navigator can follow the documents from Apple publisher facts through credential custody to a future manually authorized release runner, and can see where the process stops for human action.

Pass condition: the documents distinguish Developer ID signing, Apple notarization and Tauri updater signing; contain no secret material or private runtime data; require explicit authorization for account actions and publication; and leave unrelated Mirror Core repair outside this Delivery Story.

Fail condition: a credential value or private path is recorded, the personal Mac or VPS role is ambiguous, signing and updater trust are conflated, or the procedure implies automatic enrollment, signing, notarization or release publication.

## Validation Evidence

Documentation review and Navigator walkthrough after the child work packages are completed. No E2E notarization is required for this non-secret, non-artifact Delivery Story.
