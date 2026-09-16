[< Refinement Workbench](../index.md)

# RS017 — Reliable Agent Access

**Status:** active

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

- [CR032 — Establish the Conversation Availability Contract](cr032-establish-conversation-availability-contract.md), `in_progress`
- [CR033 — Separate Local Turn Completion from Mirror Synchronization](cr033-separate-local-completion-from-mirror-synchronization.md), `captured`
- [CR034 — Replace Generic Retry with Explicit Recovery Routes](cr034-replace-generic-retry-with-explicit-recovery-routes.md), `captured`
- [CR035 — Make Journey Authority Proportional to the Operation](cr035-make-journey-authority-proportional.md), `captured`

CR032 is the only selected and assigned item. Later CRs preserve the agreed sequence without authorizing planning or implementation.
