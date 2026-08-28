[< DS-007](../index.md)

# DS-007.TS-3 — Dedicated Turn Context Projection

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to make attached evidence part of exactly one authorized request,
As the Harness invocation and dedicated-turn coordination boundary,
I want to stage immutable context snapshots with the active Journey generation and project them into Pi input,
So that the model receives what the Navigator reviewed without gaining filesystem authority or leaking context across turns.

## Outcome

Immediately before explicit Send, Harness verifies ready dedicated authority and pending attachment ownership, stages the exact snapshot set with the user turn, and constructs a deterministic labeled context section for the existing Pi invocation. The set is consumed once; failures before staging preserve the draft, while failures or cancellation after staging produce an interrupted turn without silently reapplying attachments.

## Acceptance Behavior

```text
Given a ready Journey, one user draft and reviewed attachment snapshots
When I explicitly send the request
Then the exact snapshots accompany only that Journey generation and user turn
And Pi receives labeled content rather than permission to reopen any source path
```

## Scope

- Extend send preflight with exact Journey, thread, generation and attachment ownership checks.
- Define deterministic prompt/context serialization with clear source delimiters and untrusted-content framing.
- Keep user instruction distinct from attached source content to reduce instruction confusion.
- Stage attachment metadata/digests with dedicated-turn evidence before provider launch.
- Consume one pending set once and define pre-staging versus post-staging failure behavior.
- Preserve interruption, cancellation, restart and recovery invariants.
- Prevent Journey switches or stale async callbacks from moving attachments to another run.

## Out Of Scope

- Letting attached text override system or safety instructions.
- Giving Pi arbitrary file arguments or workspace browsing permissions.
- Reusing historical attachments automatically.
- Concurrent Journey runs, which remain DS-009 scope.
- Synthesis publication or Mirror attachment creation.

## Validation

Vitest and boundary tests prove exact one-turn serialization, Journey/generation correlation, deterministic ordering, no cross-Journey leakage, preflight preservation, post-staging interruption, cancellation behavior, restart isolation and unchanged attachment-free invocation behavior.
