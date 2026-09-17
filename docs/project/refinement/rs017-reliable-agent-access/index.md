[< Refinement Workbench](../index.md)

# RS017 — Reliable Agent Access

**Status:** closed

## Framing

Mirror Desktop must preserve a safe route to the agent when a prior turn has a recoverable projection, journal, outbox or Mirror synchronization problem. Durability protects work, but incomplete secondary synchronization must not turn preservation into loss of access.

The selected Journey remains the destination of the turn and its Mirror history. It is not a knowledge or filesystem perimeter: relevant material may retain provenance from another Journey without forcing the agent to stop.

## Desired Outcome

A user can continue or deliberately start a healthy Conversation whenever Mirror Desktop can safely admit and persist a new local turn. Every real Send block names the corruption or execution risk it prevents. Recoverable synchronization remains visible and repairable without becoming a generic conversation blockade.

Journey authority remains exact for run correlation, cancellation, persistence and Mirror mutation while allowing legitimate cross-Journey material to be read and used.

## Boundaries

- Local durable admission is required before provider execution.
- A live same-Conversation execution, unavailable runtime, exhausted native capacity or inability to persist new authority may block Send.
- Mirror append, receipt and projection synchronization after local completion are recoverable work and do not independently justify indefinite loss of agent access.
- Existing turn data is preserved or quarantined, never silently erased to regain availability.
- Provider retry never occurs without explicit user intent.
- Native run correlation and exact persistence destination remain strict.
- Mirror Core changes, if required, belong in the `mirror-dev` development checkout and official release path. Production `~/mirror` is inspection-only.
- No CR grants push, merge, publication or release authority.

## Change Requests

- [CR033 — Separate Local Turn Completion from Mirror Synchronization](cr033-separate-local-completion-from-mirror-synchronization.md), `done`, validated with Driver `@alissonvale` and Delivery `refinement/rs017-cr033-local-completion`
- [CR034 — Replace Generic Retry with Explicit Recovery Routes](cr034-replace-generic-retry-with-explicit-recovery-routes.md), `done`, validated with Driver `@alissonvale` and Delivery `refinement/rs017-cr034-explicit-recovery-routes`
- [CR035 — Make Journey Authority Proportional to the Operation](cr035-make-journey-authority-proportional.md), `done`, validated with Driver `@alissonvale` and Delivery `refinement/rs017-cr035-proportional-journey-authority`
- [CR032 — Establish the Conversation Availability Contract](cr032-establish-conversation-availability-contract.md), `done`

CR032 established the centralized availability contract. CR033 separated exact durable local completion from secondary Mirror synchronization and was validated through a controlled DEV outbox failure, successor admission and later exact synchronization repair. CR034 replaced generic retry with explicit model-free recovery routes and passed Navigator DEV validation across stale projection recovery, failed-turn settlement, successors and normal Mirror synchronization. CR035 completed the series by making Journey authority proportional to destination, provenance and explicit mutation scope. The Navigator accepted the isolated Mirror Desktop Dev cross-provenance route, and Debt Review concluded `no_action`.

## Closure Review

RS017 delivered one coherent availability boundary across four intentionally separated changes:

- CR032 made one pure contract authoritative for draft, Send, new-Conversation and context-reset availability;
- CR033 established durable local completion as the successor-admission frontier without waiting for secondary Mirror synchronization;
- CR034 replaced generic retry with exact, evidence-driven, model-free recovery routes and retired superseded recovery behavior;
- CR035 kept exact destination and mutation authority while allowing intended material to retain cross-Journey provenance.

The aggregate result preserves durable evidence, provider explicitness, native occupancy and exact persistence authority while removing false access blockades caused by recoverable secondary work or source provenance.

## Aggregate Debt Review

**Decision:** no_action

Each CR completed its proportionality and Debt Review. The series leaves no parallel availability classifier, automatic provider retry, generic recovery dispatcher, obsolete opening recovery path, global cross-Journey read prohibition, schema migration or Mirror Core fork. CR034 removed the superseded recovery branches during closeout, and CR035 changed only the existing prompt authority contract. Remaining open work belongs to independently captured refinement scope rather than RS017 follow-up debt.

## Closure Evidence

- CR032–CR035 are all `done` with explicit Navigator acceptance where interaction validation was required.
- The final frontend baseline is 144 files and 798 tests passing.
- The production web build, roadmap consistency and diff checks pass.
- CR033–CR035 were exercised in isolated **Mirror Desktop Dev** without production app-data mutation.
- No push, merge, publication or release was performed.

## Outcome

Closed. Mirror Desktop can safely admit successors after exact durable local completion, repair preserved failures without implicit provider execution, and use relevant cross-Journey material without surrendering selected-Journey destination or mutation authority.
