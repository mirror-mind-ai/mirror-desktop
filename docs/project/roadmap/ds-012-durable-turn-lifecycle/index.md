[< CV-001](../cv-001-operable-agent-cockpit/index.md)

# DS-012 — Durable Turn Lifecycle

**Status:** 🟢 Done

---

## Outcome

Nautilus Harness owns one durable, idempotent lifecycle record for every dedicated turn, so a normal successor send, frontend loss, process termination, cancellation, restart, local projection and Mirror delivery all resume from exact committed evidence instead of reconciling independent React, dispatcher, lease and persistence snapshots.

The serial path becomes trustworthy before bounded concurrency returns. DS-009 remains the authority for exact Journey/run/generation correlation, targeted control, sibling isolation and capacity two.

## Product Lens

The Navigator should be able to send ordinary messages repeatedly without understanding leases, routes, projection frontiers or settlement recovery. A turn may take time or fail, but it must have one legible biography and one safe next action. The application must never require a new repair merely to send the next message.

## Planning Decisions

- The Harness owns the durable turn journal. Mirror remains the explicit append destination and does not acquire Harness lifecycle semantics.
- Exact `RunAuthority` remains immutable and continues to preserve DS-009 identity boundaries.
- Lifecycle phase, terminal outcome, cancellation intent, delivery checkpoints and recovery disposition remain orthogonal fields advanced through one validated journal transition contract.
- React expresses intent and renders projections. It does not own lifecycle or infer completion.
- The dispatcher transports correlated events. It does not own lifecycle or settlement.
- The native registry enforces bounded execution ownership. A lease is derived operational evidence, not a competing lifecycle source.
- Bounded final output and exact terminal authority become durable before native `done` can retire observation or authorize lease release.
- Pi JSONL remains execution evidence only. Recovery cannot reconstruct destination or message authority from it.
- Migration began with production capacity fixed internally at one. After the serial coordinator, cold-start recovery and TS-3 frontier were proven, US-3 restored the same private constant to exactly two.
- Existing local conversation projection and Mirror append outbox remain idempotent adapters driven by journal checkpoints.
- Desktop E2E smoke is exceptional and batched. Technical stories rely on deterministic unit, integration, fault-injection and build evidence. One short DEV smoke window validates the serial cutover and restart recovery together; one final DEV smoke validates restored capacity two. Screen automation and screenshots are used only when the behavior cannot be established through durable state, logs or native inspection, and the Navigator receives notice before the computer is occupied.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-012.TS-1 | Canonical Turn Journal and Transition Contract | Technical Story | Harness persists one bounded exact-authority turn record and validates monotonic, idempotent lifecycle transitions while the existing serial path runs in shadow comparison | 🟢 Done |
| DS-012.TS-2 | Durable Native Terminal Adoption | Technical Story | Exact bounded terminal output is durably adopted before native done, observation retirement or Journey lease release | 🟢 Done |
| DS-012.US-1 | Reliable Sequential Turn Settlement | User Story | Two and subsequent turns in one Journey complete through journal-owned projection and outbox checkpoints without route or lease resurrection | 🟢 Done |
| DS-012.US-2 | Deterministic Turn Recovery After Restart | User Story | Restart resumes each non-terminal turn from its last durable checkpoint with one safe action and no transcript reconstruction | 🟢 Done |
| DS-012.TS-3 | Retire Distributed Lifecycle Authority | Technical Story | React effects, dispatcher tombstones and lease/projection heuristics stop acting as lifecycle authorities after journal ownership is proven | 🟢 Done |
| DS-012.US-3 | Restore Bounded Concurrent Journey Turns | User Story | Capacity returns to exactly two and two journal-owned Journey turns execute, cancel, settle and recover independently | 🟢 Done |

## Boundaries

- Do not redesign Pi sessions, Mirror conversations, generation identity, context compaction, provider settings or Journey navigation.
- Do not increase capacity beyond two or add remote or multi-user orchestration.
- Do not make Mirror aware of Nautilus or move lifecycle authority into Mirror.
- Do not treat screenshot-driven desktop automation as a default validation layer.
- Do not promote a stable bundle, push, release or deploy without separate authorization.
- Preserve the current outbox limits and explicit append contract unless a child plan proves a necessary compatible change.

## Delivery Documents

- [Implementation plan](plan.md)
- [Test guide](test-guide.md)
- [Validation](validation.md)

## Done Condition

DS-012 is done when one durable turn journal can explain and resume every supported lifecycle frontier; repeated sequential sends complete without retained leases or active-route conflicts; app/frontend termination after Pi completion resumes from durable terminal evidence; local projection and Mirror outbox checkpoints are exact and idempotent; distributed lifecycle inference has been retired; capacity two is restored without cross-Journey mutation; all automated fault and interleaving tests pass; and the two explicitly planned, batched DEV smoke windows are accepted without touching stable state.
