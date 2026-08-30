[< Parent](../index.md)

# DS-009.TS-2 — Per-Journey Tauri Process Registry

**Status:** 🟡 Planned
**Type:** Technical Story
**Order:** 4 of 7
**Concurrency:** backend registry with global limit 1

## Outcome

Tauri owns a bounded process registry keyed by `journeyId`, with each entry owning exactly one `runId`, `RunAuthority`, child process, cancellation state, terminalization state and provider snapshot while the global execution limit remains 1.

## Scope

- Replace the single global child-process slot with a registry abstraction.
- Keep the global execution limit at 1 while introducing the registry.
- Reserve `journeyId + runId` atomically before spawn.
- Reject simultaneous starts for the same Journey and starts beyond global capacity.
- Require `journeyId` plus `runId` for start and cancel.
- Compare `runId` before mutating or removing any registry entry.
- Release process capacity when the child terminates.
- Handle spawn failure after reservation, cancellation/done race and process death idempotently.
- Support an injected registry limit in tests and one internal production capacity constant.
- Expose bounded inspection of running and finalizing leases without prompts, responses, provider snapshots, secrets or arbitrary environment.

## Acceptance Behavior

```text
Given the backend registry is active with global limit 1
When two start attempts race
Then exactly one reservation succeeds when capacity allows
And failed spawn, process death or repeated terminal signals clean up without leaking capacity
And stale cleanup cannot remove a substituted run with another runId
And bounded inspection can report running and finalizing leases for frontend reconciliation.
```

## Out Of Scope

- Enabling global limit 2.
- Concurrent settlement semantics beyond registry lifecycle.
- Frontend visual sidebar work beyond consuming registry state.

## Validation

Rust tests or bounded native-command tests cover simultaneous start attempts, duplicate Journey rejection, capacity rejection, mismatched cancel rejection, targeted cancel, spawn failure after reservation, cancellation/done race, process death, stale removal, bounded lease inspection and limit injection with value 1.
