# Delivery Story Plan — CV-007.DS-002

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Verified Update Installation and Recovery

## Objective

Implement the mutation half of Trusted Self-Update: after explicit user consent, Mirror Desktop stages an authorized compatible release artifact, verifies checksum, provenance and architecture before mutation, refuses installation while unsafe native operations are active, preserves the current application as last-known-good, applies the update safely, verifies the expected version on restart, and can recover or roll back without touching Mirror homes, databases, credentials, Journeys, conversations, app data or Nautilus Harness state.

## Child Work Packages

- CV-007.DS-002.US-1
- CV-007.DS-002.TS-1
- CV-007.DS-002.TS-2
- CV-007.DS-002.TS-3
- CV-007.DS-002.US-2

## Scope

This Delivery Story will:

- require explicit user consent for the exact available version and artifact checksum;
- block update installation unless the native operation snapshot is quiescent;
- verify staged artifact bytes against the manifest SHA-256 before any apply plan is accepted;
- create a bounded apply plan that preserves the current application as last-known-good and verifies the expected version after restart;
- create a rollback plan that restores only previous application bytes and preserves Mirror state, app data and Nautilus Harness state;
- document the verified installation and recovery boundary without performing a live application replacement in tests.

## Non-Goals

This Delivery Story will not:

- execute a real download or replace the currently running application during automated tests;
- bypass macOS permissions or security policy;
- install, update or migrate Mirror Core;
- read or mutate `memory.db`, Mirror homes, Journey files, identity, credentials, conversations or durable app data;
- publish release artifacts or create update channels;
- implement code signing, notarization or app-store distribution.

## Acceptance Behavior

```text
Given discovery has found a compatible available update
When the user has not accepted the exact version and checksum
Then download and installation remain blocked
When unsafe native work is active
Then apply remains blocked with a bounded reason
When staged bytes match the manifest checksum
Then the artifact can become a verified apply candidate
When an apply plan is created
Then it preserves last-known-good application bytes and names expected launch verification
And any recovery plan restores only those previous application bytes while preserving Mirror and predecessor state
```

## Validation Route

Run focused domain tests for consent, quiescence, staged checksum verification, apply plan creation and rollback preservation. Run `npm run build` to prove the TypeScript contract compiles. Review `docs/update/trusted-self-update.md` and this story package for the no-Mirror-mutation and no-live-replacement boundaries. Desktop E2E with a real app replacement is deferred until an explicit release candidate and installation environment are available.

## Implementation Contract

Use TDD for all state and verification behavior. Keep live mutation behind explicit future native integration: the implementation here may define consent, verification, apply and rollback plans, but must not replace app bytes in the development checkout, touch Mirror state or perform irreversible external actions. Preserve CV-006 release authority and CV-007.DS-001 discovery authority as inputs rather than inventing new release trust.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
