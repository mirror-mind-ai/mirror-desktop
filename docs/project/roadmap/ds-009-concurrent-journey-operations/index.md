[< CV-001](../cv-001-operable-agent-cockpit/index.md)

# DS-009 — Concurrent Journey Operations

**Status:** 🟠 In Progress

---

## Outcome

Nautilus Harness lets the Navigator move between Journeys while agent work continues and operate multiple Journeys concurrently without mixing processes, stream events, assistant responses, runtime activity, cancellation, settlement or persistence.

The concurrency unit is one active run per Journey. Different Journeys may run simultaneously; a second run in the same Journey remains blocked until its current run settles.

## Product Lens

A desktop agent cockpit should not turn one long-running Journey into a global application lock. Journey navigation remains available during work, each running Journey communicates its state in the sidebar, and returning to a Journey reveals the same live or settled run that belongs to it.

## Scope

- Introduce stable `runId` and `journeyId` correlation across Tauri process events and frontend stream handling.
- Replace the single backend child-process slot with a bounded per-Journey process registry.
- Replace global frontend run, projection, warning, diagnostic and streaming state with Journey-keyed state.
- Keep assistant deltas and runtime operations attached to the conversation that initiated the run, even when another Journey is selected.
- Allow Journey navigation and independent submission while other Journeys run.
- Permit at most one active run per Journey.
- Cancel, fail, settle and restart only the targeted Journey run.
- Show compact running state in the Journey sidebar without rotating completed history.
- Persist each Journey response to its own canonical local conversation.

## Planning Decisions

- Initial global concurrency limit after enablement is exactly two active Pi executions.
- Per-Journey concurrency limit is exactly one active or finalizing execution.
- Concurrency must not be enabled before TS-4 completes.
- Delivery proceeds in mandatory order: TS-1, TS-3, US-1, TS-2, TS-4, US-2, US-3.
- Backend process ownership moves to a registry keyed by `journeyId`; each registry entry owns exactly one `runId` and one `RunAuthority` constructed once at run start.
- `RunAuthority` is based on `TurnCorrelation` plus validated active-generation live identity for `piSessionFile`, because persisted `TurnCorrelation` schema `0.2.0` does not contain that field.
- `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` are mandatory inside `RunAuthority` for live dedicated runs after active-generation validation.
- No mutable authority copies or competing identity sources remain after `RunAuthority` construction.
- Persisted `TurnCorrelation` schema is not changed without explicit TS-1 compatibility analysis.
- Start and cancel commands require both `journeyId` and `runId`.
- Live dedicated runs require correlated authority before spawn.
- Provider configuration is captured as a backend snapshot at run start and is not emitted in events.
- Every process event carries bounded event authority derived from `RunAuthority`: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId` and `mirrorConversationId`; private paths such as `piSessionFile` stay out of event authority.
- Frontend event dispatch is centralized through one app-level listener, not one listener per run.
- Frontend event reducers reject events that are late, unauthoritative or attached to a replaced run; stale events are discarded or quarantined outside current run state.
- Frontend runtime state migrates from global selected-Journey state to Journey-keyed state.
- Settlement and persistence always use the authority captured at run start, never the Journey selected when the event or settlement callback arrives.
- Saves and finalization are serialized per Journey.
- The native lifecycle reserves `journeyId + runId` before spawn, releases process capacity on child termination, keeps the Journey leased through durable projection plus outbox enqueue, and handles spawn failure, cancellation/done races and process death idempotently.
- The native registry exposes bounded inspection of running and finalizing leases for dispatcher reconciliation.
- Finalization acknowledgement is idempotent after durable projection and outbox enqueue.
- App restart uses persisted dedicated projection and outbox state as authority, not dead child handles.
- Rollback reduces the single internal capacity constant to 1 without reverting correlated event, Journey-keyed state or directed API contracts.
- Aggregate validation happens only in the development channel before any stable promotion.

## Boundaries

- Do not share one Pi session, assistant response or runtime projection across Journeys.
- Do not increase concurrency through unbounded process spawning; define and enforce a local limit during planning.
- Do not absorb CV-002.DS-004 canonical conversation identity, imported-conversation mapping, context accounting or compaction work.
- Do not introduce multi-user or remote orchestration.
- Provider settings remain global unless a later story explicitly makes them Journey-specific.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-009.TS-1 | Correlated Journey Run Contract | Technical Story | Define complete `RunAuthority` derived from `TurnCorrelation` across serial process events, conversation updates, settlement and persistence | 🟡 Planned |
| DS-009.TS-3 | Journey-Keyed Frontend Runtime State | Technical Story | Deltas, operations, warnings, controls and terminal outcomes update only their owning Journey while execution remains serial | 🟡 Planned |
| DS-009.US-1 | Navigate While Journeys Work | User Story | Navigator can switch Journeys while an existing serial run continues and see which Journey is active | 🟡 Planned |
| DS-009.TS-2 | Per-Journey Tauri Process Registry | Technical Story | Backend owns a per-Journey registry with directed start/cancel and global limit 1 | 🟡 Planned |
| DS-009.TS-4 | Concurrent Persistence Guardrails | Technical Story | Background settlement and persistence use captured authority and per-Journey finalization leases while global limit remains 1 | 🟡 Planned |
| DS-009.US-2 | Operate Multiple Journeys Concurrently | User Story | Navigator can start work in another Journey after capacity is raised to 2, with one run allowed per Journey | 🟡 Planned |
| DS-009.US-3 | Targeted Journey Cancellation and Settlement | User Story | Cancelling, failing or settling one Journey under real concurrency does not disturb another Journey | 🟡 Planned |

## Done Condition

DS-009 is done when at least two Journeys can execute Pi-backed work concurrently; the Navigator can navigate between them; every process event, reasoning summary, operation, assistant delta and terminal outcome remains attached to its owning Journey; cancellation and restart are targeted; sidebar state is accurate; and each completed response persists only to the correct Journey conversation.
