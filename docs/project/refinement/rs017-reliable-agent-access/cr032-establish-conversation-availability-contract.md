[< RS017](index.md)

# CR032 — Establish the Conversation Availability Contract

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs017-cr032-conversation-availability-contract`

## Problem

Mirror Desktop derives Send availability from distributed booleans in `App.tsx`. Runtime occupancy, Journey loading, turn recovery, reconciliation and Mirror synchronization can all contribute to one undifferentiated blocked state. The app cannot explain which conditions protect a real safety boundary and which merely represent recoverable synchronization work.

This allowed secondary settlement failures to remove the user's primary route to the agent.

## Expected Behavior

One pure, typed decision defines Conversation availability. It distinguishes drafting, sending, new-Conversation creation and agent-context reset. Every blocking condition names the risk it protects, while recoverable Mirror synchronization is represented as visible non-blocking debt.

## Impact

This contract becomes the authority used by later CRs to change journal eligibility and recovery interaction without introducing another collection of ad hoc gates.

## Plan Or Decision

### Scope

- Introduce a pure Conversation availability model with explicit input evidence, availability conditions and allowed actions.
- Encode precedence for runtime binding, local conversation authority, local admission durability, same-Conversation execution, native capacity, recovery inspection and secondary Mirror synchronization.
- Treat recoverable synchronization as non-blocking in the policy model.
- Integrate Send admission and composer explanation with the centralized decision without yet changing turn-journal successor eligibility.
- Preserve native reservation as the final atomic admission authority.

### Affected Files

- `src/domain/conversationAvailability.ts`
- `src/tests/conversationAvailability.test.ts`
- `src/app/App.tsx`
- `src/app/composerPlaceholder.ts`
- relevant integration/source-contract tests

### Acceptance

- One pure decision returns `canDraft`, `canSend`, `canStartNewConversation`, `canResetAgentContext`, a canonical condition and explicit recovery actions.
- Runtime unbound, local authority unavailable, local admission unavailable, live same-Conversation execution and native capacity exhaustion remain blocking with distinct reasons.
- Recoverable Mirror synchronization alone does not block Send in the policy model.
- Unknown or actively inspected local execution authority fails closed until bounded inspection completes.
- App Send admission consumes the centralized decision rather than rebuilding its own recovery and synchronization boolean expression.
- Existing native reservation, provider validation and file-attachment checks remain independent final guards.

### Validation

- Develop the contract through focused unit tests.
- Run composer and Journey runtime integration tests.
- Run the complete frontend suite and production web build before handoff.

### Exclusions

- Do not make `projected` journal records successor-eligible in this CR.
- Do not redesign outbox persistence or background retry.
- Do not replace recovery buttons yet.
- Do not change Journey prompt or Mirror extension authority.
- Do not call the provider from recovery behavior.

### Authority Boundary

The Navigator approved this plan, Driver `@alissonvale`, Delivery `refinement/rs017-cr032-conversation-availability-contract` and local implementation. Commit authority is limited to the approved local separation and implementation work. Push, merge, publication and release remain separate decisions.

## Evidence

Implemented locally:

- `src/domain/conversationAvailability.ts` defines one pure availability decision, canonical conditions, allowed actions and recovery actions.
- The contract keeps drafting available in every state and distinguishes runtime binding, Conversation authority, local admission durability, live execution, native inspection, Journey lease occupancy, global capacity and recoverable Mirror synchronization.
- Recoverable Mirror synchronization resolves to `sync_pending` with Send still allowed by policy.
- `src/app/App.tsx` now derives `selectedInvocationAdmissionBlocked` from `conversationAvailability.canSend` rather than rebuilding runtime and occupancy booleans at the Send boundary.
- `src/app/composerPlaceholder.ts` explains the exact blocking boundary and does not replace ordinary ready copy for synchronization debt.
- `src/tests/conversationAvailability.test.ts` covers ten policy cases.
- Focused availability, composer and runtime integration checks passed: 42 tests.
- Complete frontend suite passed: 143 files and 791 tests.
- `npm run build` passed. Vite emitted only the existing chunk-size warning.

CR032 intentionally leaves projected journal records blocked until CR033 establishes the new local-completion frontier. It changes the authority for deciding availability without prematurely changing journal safety.

## Navigator Validation

Accepted by the Navigator after review of the centralized conditions, action-specific policy, integration boundary and complete automated evidence.

## Debt Review

**Decision:** no_action

The contract is deliberately small, pure and independent from journal transition mechanics. Its explicit condition vocabulary is required by the next three CRs rather than speculative abstraction. No proportional debt action is required before closure.

## Outcome

Done. CR033 is the recommended next movement.
