[< Parent](../index.md)

# DS-011.TS-4 — Channel Isolation Guardrails

**Status:** 🟢 Done
**Type:** Technical Story

## Technical Story

In order to keep future changes from collapsing the channel boundary, add aggregate fail-closed checks across app identity, persistence, subprocess routing and documentation.

## Outcome

Mismatched bundle ID, app-data root, Mirror root/home/user/database or dedicated channel marker stops before mutation or provider activity with a bounded actionable diagnostic.

## Acceptance Behavior

```text
Given any stable/development coordinate is mixed
When startup or command preflight runs
Then the operation is rejected before Journey mutation, provisioning or Pi invocation
And no cross-channel state changes
```

## Scope

- Negative profile matrix.
- Source/config checks for removed hard-coded fallback.
- Command preflight and dedicated authority checks.
- Documentation/link drift checks.
- Aggregate isolation evidence.

## Out Of Scope

- Filesystem sandboxing for Pi.
- Security credential storage.

## Validation

Automated mismatch matrix plus model-free real-runtime probes and production non-mutation evidence.
