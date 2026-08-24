[< CV-001](../cv-001-operable-agent-cockpit/index.md)

# DS-009 — Concurrent Journey Operations

**Status:** 🟡 Planned

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

## Boundaries

- Do not share one Pi session, assistant response or runtime projection across Journeys.
- Do not increase concurrency through unbounded process spawning; define and enforce a local limit during planning.
- Do not absorb CV-002.DS-004 canonical conversation identity, imported-conversation mapping, context accounting or compaction work.
- Do not introduce multi-user or remote orchestration.
- Provider settings remain global unless a later story explicitly makes them Journey-specific.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-009.TS-1 | Correlated Journey Run Contract | Technical Story | Define `runId` and `journeyId` ownership across process events, conversation updates, settlement and persistence | 🟡 Planned |
| DS-009.TS-2 | Per-Journey Tauri Process Registry | Technical Story | Backend can run and cancel bounded independent Pi processes without cross-run event leakage | 🟡 Planned |
| DS-009.US-1 | Navigate While Journeys Work | User Story | Navigator can switch Journeys while existing runs continue and see which Journeys are active | 🟡 Planned |
| DS-009.US-2 | Operate Multiple Journeys Concurrently | User Story | Navigator can start work in another Journey while one is already running, with one run allowed per Journey | 🟡 Planned |
| DS-009.TS-3 | Journey-Keyed Frontend Runtime State | Technical Story | Deltas, operations, warnings, controls and terminal outcomes update only their owning Journey | 🟡 Planned |
| DS-009.US-3 | Targeted Journey Cancellation and Settlement | User Story | Cancelling or failing one Journey does not disturb work or controls in another Journey | 🟡 Planned |
| DS-009.TS-4 | Concurrent Persistence Guardrails | Technical Story | Background responses persist to the correct Journey conversation without overwrite, loss or stale selected-Journey writes | 🟡 Planned |

## Done Condition

DS-009 is done when at least two Journeys can execute Pi-backed work concurrently; the Navigator can navigate between them; every process event, reasoning summary, operation, assistant delta and terminal outcome remains attached to its owning Journey; cancellation and restart are targeted; sidebar state is accurate; and each completed response persists only to the correct Journey conversation.
