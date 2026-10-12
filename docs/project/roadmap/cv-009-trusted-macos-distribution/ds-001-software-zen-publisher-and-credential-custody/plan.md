# Delivery Story Plan — CV-009.DS-001

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Software Zen Publisher and Credential Custody

## Objective

Establish Software Zen as the accountable Apple publisher and define secure, auditable custody and temporary use of Developer ID, notarization and updater credentials through the VPS and the maintainer's personal Mac, without creating credentials, signing an artifact or publishing a release.

## Child Work Packages

- CV-009.DS-001.TS-1
- CV-009.DS-001.TS-2

## Scope

- Record Software Zen as the intended accountable Apple publisher and identify the account-holder, Team ID and minimum release roles that must be confirmed before credentials are created or used.
- Define the credential inventory and custody model for the Developer ID Application certificate and key, notarization authentication, and existing updater signing key.
- Define the VPS as encrypted custody and release coordination, and the maintainer's personal Mac as the initial manual macOS release runner.
- Specify temporary secret injection, Keychain use, cleanup, access revocation, rotation, recovery evidence and log-redaction expectations.
- Produce reviewable operational documentation and bounded validation evidence only.

## Non-Goals

- Enroll Software Zen in Apple Developer Program, create certificates or API keys, import real secrets, sign a bundle, submit to Apple, notarize, staple, tag, publish, deploy or promote a release.
- Alter Tauri signing configuration, updater key custody, release endpoints, Mirror data, application data or production credential stores.
- Repair the separate Mirror Core operational-projection defect discovered during Ariad refresh.

## Acceptance Behavior

Given a maintainer preparing future macOS signing, when they consult the completed custody documentation, then they can identify Software Zen's required Apple-account facts, every credential class, its permitted custody location, the authorized personal-Mac release path and the cleanup or recovery action without obtaining or exposing a secret.

Given an attempted release procedure, when a required identity, authorization, encrypted secret, clean runner or evidence boundary is absent, then the procedure fails closed and does not permit signing, notarization or publication.

## Validation Route

Review the custody and publisher documentation against the existing versioned-release and updater procedures. Confirm that it contains no credential value, private filesystem path, provider credential, Mirror data or publication authority; that it distinguishes Apple signing from updater signing; and that each defined release action has an explicit human authorization point. No end-to-end notarization is required because this Delivery Story intentionally creates neither credentials nor an artifact.

## Implementation Contract

Child work remains documentation and procedural design scoped to CV-009.DS-001. Any behavior change requires a separately approved plan and TDD. Do not silently absorb Apple enrollment, account administration, secret creation, signing, notarization, endpoint publication or the unrelated Mirror Core projection repair. Preserve the existing release candidate, alpha-channel and updater trust boundaries.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
