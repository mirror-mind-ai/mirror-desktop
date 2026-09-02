[< Story](index.md)

# Validation — DS-012 Durable Turn Lifecycle

**Status:** Accepted

## Navigator Acceptance

The Navigator reported that the essential manual validation passed and authorized closing DS-012.

The accepted manual route covered the user-visible behaviors that matter most:

- repeated sequential turns complete without restart or stale route/lease blockage;
- two different Journeys work concurrently without cross-routing responses;
- navigation remains presentation-only while exact owners continue working;
- targeted cancellation/interruption remains visible and does not disturb the sibling Journey;
- restart does not fabricate a response and permits a safe successor after durable interruption.

## Automated Evidence

- 84 frontend files and 472 tests passed.
- 81 native tests passed.
- TypeScript/Vite production build passed.
- DEV Tauri bundle passed.
- `cargo check` passed with only the pre-existing unused `merge_persisted_mirror_evidence` warning.
- `git diff --check` passed.

## Durable Frontier Evidence

- One channel-specific per-Journey journal owns admission, terminal outcome, cancellation intent, projection, outbox and settlement checkpoints.
- Exact terminal evidence is durable before native `done` and excludes prompt, protocol, stderr and reasoning streams.
- Controlled DEV fault injection proved `terminal_durable → app restart → exact projection/outbox settlement` without model replay.
- Running work without an exact live child becomes visibly and durably interrupted without assistant fabrication.
- A successor after interruption is admitted and settles normally.

## Capacity-Two Evidence

- The private production constant is exactly two and has no environment override.
- Deterministic tests prove same-Journey rejection, third-capacity rejection, directed control, stale callback isolation, sibling-safe journal transitions and bounded shutdown.
- The final DEV smoke observed two exact Journey journals simultaneously at `running`, revision 2.
- Both Journeys independently reached `settled`, revision 6, with exact committed projections and an empty DEV outbox.
- Navigation A → B → A did not change ownership.

## Isolation

- Mirror remains a generic explicit append destination and has no Nautilus lifecycle semantics.
- Production app data, installed bundle and Mirror coordinates were not changed.
- DEV and production outboxes were empty at final inspection.
- No DEV Harness process or child remained after smoke cleanup.

## Closure

All DS-012 child packages, deterministic gates, controlled frontier checks, desktop smoke milestones and Navigator manual acceptance passed. DS-012 is closed.

Commit, push, stable promotion, release, deployment and production runtime update remain separate authorization boundaries.
