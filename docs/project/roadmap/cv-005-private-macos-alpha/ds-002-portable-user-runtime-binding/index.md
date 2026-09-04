[< CV-005](../index.md)

# CV-005.DS-002 - Portable User Runtime Binding

**Status:** 🟡 Planned

## Outcome

A source-built Mirror Desktop app can resolve, validate and persist a bounded binding to the current user's own configured Mirror installation instead of compiling `alisson-vale` or another personal profile into the stable runtime channel.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-005.DS-002.TS-1 | User Runtime Binding Contract | Technical Story | Mirror root, Mirror home, user identity, database and compatibility range form one validated non-secret binding with clear authority and confinement rules | 🟡 Planned |
| CV-005.DS-002.US-1 | Bind My Mirror Installation | User Story | An alpha user can accept a trusted discovered installation or explicitly select their configured Mirror location and see the resolved binding before use | 🟡 Planned |
| CV-005.DS-002.US-2 | Understand Runtime Readiness | User Story | Missing Mirror, Pi, uv, database, identity or version compatibility appears as bounded diagnosis with a corrective route instead of startup failure or silent fallback | 🟡 Planned |
| CV-005.DS-002.TS-2 | Trusted Runtime Process Environment | Technical Story | Every Pi and Mirror subprocess receives only the validated user's runtime coordinates and trusted executable paths | 🟡 Planned |
| CV-005.DS-002.TS-3 | Channel-Local Binding Persistence | Technical Story | User and development channels retain independent bindings without credentials, cross-user state or fallback to a developer's production coordinates | 🟡 Planned |

## Binding Contract

```text
Mirror Desktop channel
  validated Mirror root
  validated Mirror home
  explicit Mirror user
  confined database path
  compatible Core version
  trusted pi executable
  trusted uv executable
```

The binding is configuration authority, not discovery by coincidence. Conventional locations may produce candidates, but the application must validate the complete coordinate set before enabling Journey operations. A missing or contradictory coordinate fails visibly and never falls back to another profile.

## Done Condition

This Delivery Story is done when no production runtime path or user identity is hardcoded to a specific person; a configured alpha user can establish and inspect their binding; startup and subprocesses use only that validated binding; malformed, missing, mixed-channel, cross-user and incompatible configurations fail closed; channel-local persistence excludes secrets; and deterministic tests prove that one user's runtime cannot resolve to another user's Mirror home or database.

## Boundary

This story consumes an already configured Mirror installation. It does not install Mirror Core, authenticate Pi providers, create a new identity, copy databases, read SQLite directly, or provide general onboarding. Those remain later Installer and Desktop onboarding work.
