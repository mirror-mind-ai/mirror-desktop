[< Parent](../index.md)

# CV-005.DS-002.TS-2 - Trusted Runtime Process Environment

**Status:** 🟠 In Progress
**Type:** Technical Story

## Technical Story

In order to prevent cross-user and cross-channel runtime execution,
As the native Pi and Mirror process boundary,
I want every process to derive authority from the currently revalidated binding,
So that no stale environment or developer fallback can select another user's runtime.

## Outcome

Administrative and conversational subprocesses use only the canonical bound root, home, user, database and closed executable path, and no Mirror-dependent process starts while the binding is unavailable or stale.

## Acceptance Behavior

```text
Given a channel owns a validated runtime binding
When Mirror Desktop prepares a Pi or Mirror subprocess
Then it revalidates the binding before process creation
And sets the controlled current directory, MIRROR_HOME, MIRROR_USER, DB_PATH and PATH
And strips unrelated turn authority from administrative calls
And refuses stale, changed, unbound or cross-channel coordinates before spawn
```

## Scope

- Revalidation at process creation.
- Controlled current directory and complete environment projection.
- Closed `pi` and `uv` executable resolution.
- Administrative correlation detachment.
- Characterization of every native Mirror and Pi caller.

## Out Of Scope

- Additional executable types or shell evaluation.
- Provider credentials.
- Remote runtimes.
- Changes to Mirror Core command contracts.

## Validation

Native tests capture exact command program, current directory and environment without spawning production operations. Integration tests prove no starter runs after binding rejection.
