[< CV-004](../index.md)

# CV-004.DS-003 - Event-Specific Continuity Boundaries

**Status:** 🟡 Planned

## Outcome

Navigator sees the concrete event affecting continuity and receives the smallest safe action for that event instead of a generic synchronized, divergent or reload-conversation state.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-003.TS-1 | Independent Body Freshness Classifier | Technical Story | Classify Pi transcript, Harness projection, Mirror context and Mirror recording freshness independently under exact binding authority | 🟡 Planned |
| CV-004.DS-003.TS-2 | Composer Eligibility Matrix | Technical Story | Derive fail-closed send eligibility from the event requiring resolution rather than message-count parity | 🟡 Planned |
| CV-004.DS-003.US-1 | Understand What Changed | User Story | Navigator sees specific notices such as newer Pi turns, newer Mirror context, changed recording destination, pending recording or ambiguous Pi lineage | 🟡 Planned |
| CV-004.DS-003.US-2 | Take the Direct Safe Action | User Story | A unique known continuation offers a direct refresh or acknowledgement while a picker appears only for genuine ambiguity or explicit relinking | 🟡 Planned |

## Interaction Direction

Representative events and actions:

| Event | Composer | Primary action |
|-------|----------|----------------|
| Harness projection behind selected Pi lineage | Blocked while checking or refreshing | Refresh Pi transcript |
| Required Mirror context newer than acknowledged receipt | Blocked before generation | Load current Mirror context |
| Mirror recording pending after a complete Pi turn | Blocked until durable outcome is known | Retry recording without provider |
| Mirror recording destination changed explicitly | Blocked until binding is acknowledged | Adopt new Mirror epoch or retain prior destination |
| Multiple Pi lineages advanced | Blocked | Select lineage explicitly |
| All required authority current | Enabled | Send |

## Done Condition

This story is done when every blocking state names the affected body and reason; the composer enables only under a tested eligibility matrix; checking and recovery remain model-free; unique linked refreshes never open a redundant selector; ambiguous choices always remain explicit; and accessibility copy communicates both the condition and the consequence without exposing private transcript content.

## Boundary

A body-specific notice may acknowledge legitimate independence. It must not normalize missing native authority, cross-Journey evidence, incomplete turns or an unresolved multiple-lineage choice.
