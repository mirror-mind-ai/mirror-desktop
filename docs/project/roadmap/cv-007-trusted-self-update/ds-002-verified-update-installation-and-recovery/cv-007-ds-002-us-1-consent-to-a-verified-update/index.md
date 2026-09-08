[< Parent](../index.md)

# CV-007.DS-002.US-1 - Consent to a Verified Update

**Status:** ✅ Done
**Type:** User Story

## User Story

As a Mirror Desktop user,
I want update consent to bind to the exact version and artifact checksum,
So that I never authorize a different update than the one I reviewed.

## Outcome

The update installation contract refuses download or installation unless consent accepts the currently available version and artifact SHA-256.

## Acceptance Behavior

```text
Given a compatible update is available
When consent is absent, names another version or names another checksum
Then update installation is blocked
When consent matches the exact version and checksum
Then installation may proceed to quiescence and staged verification checks
```

## Validation

`npm test -- src/tests/updateInstallation.test.ts` covers exact consent acceptance and mismatch rejection.
