[< Story](index.md)

# Test Guide — CV-008.DS-006

## Aggregate Validation

CV-008.DS-006 is validated when the Navigator can search text within the exact active Conversation and use a separate turn navigator to jump among recognizable turns without mutating transcript content, persistence, or runtime authority.

## Child Work Packages

- CV-008.DS-006.US1

## Automated Checks

Cover the aggregate behavior with focused frontend tests before implementation is considered complete:

- Conversation search opens, accepts a query, updates as the query changes, and closes predictably.
- Search reports empty-query, zero-result, total-match, and current-position states honestly.
- Next/previous controls move among matches and keep the current match identifiable.
- Search remains scoped to the rendered/materialized active Conversation content.
- Turn navigation opens separately from search and lists turns in transcript order.
- Turn labels are derived from deterministic visible metadata such as role and order, not model-generated summaries.
- Selecting a turn scrolls/focuses the Conversation surface to the chosen turn.
- Search and turn navigation do not send, edit, append, retry, or reclassify any transcript message.
- Keyboard/focus behavior remains predictable when opening, using, and closing both controls.

## Navigator Validation

Use this route for Navigator-visible validation after automated checks pass:

1. Open a Conversation with several visible user and assistant turns.
2. Open Conversation search from the Conversation surface.
3. Search for a term that appears more than once.
4. Confirm the UI shows total matches and the current match position.
5. Move next and previous through the matches and confirm the transcript follows the active match.
6. Search for a term that is absent and confirm the zero-result state is explicit.
7. Close search and open the separate turn navigator.
8. Confirm turns are listed in a recognizable deterministic order without generated summaries.
9. Select a turn and confirm the transcript jumps to that exchange.
10. Confirm no message was sent, edited, appended, retried, or reclassified.
11. If the Conversation has partially loaded history, confirm the UI does not imply unbounded or cross-history search.

## Expected Observation

The Navigator sees distinct search and turn-navigation controls on the active Conversation surface. Search reports honest match state and moves among materialized matches. Turn navigation lists recognizable ordered turns and jumps to the selected turn. Both tools are read-only and scoped to the active Conversation.

## Pass Condition

Automated checks pass and Navigator validation confirms search, zero-result handling, next/previous navigation, turn listing, turn jump, focus behavior, and read-only authority preservation.

## Fail Condition

Validation fails if either control changes transcript content or authority, searches unrelated Conversations/Journeys, implies unbounded history without evidence, produces model-generated turn summaries, loses ordinary reading/selection/copy behavior, or cannot reliably navigate to matches/turns.

## E2E Decision

E2E is not required for the first DS-006 implementation if frontend tests cover the observable interaction contract and the Navigator-visible manual route is executed. Require E2E later if implementation moves search or navigation behind integration behavior that cannot be covered by the existing test stack.

## Validation Evidence

Automated implementation evidence recorded during local implementation:

- `npm test -- --run src/tests/conversationSearchNavigation.test.ts src/tests/conversationTranscript.test.ts` — passed, 7 tests.
- `npm test` — passed, 146 files / 810 tests.
- `npm run build` — passed (`tsc && vite build`).

Navigator-visible validation accepted. The Navigator validated the dev bundle behavior after iterative adjustments: search opens from the top bar, highlights found terms in yellow, reports match state, closes with the inline `×`, and turn navigation opens from the top bar as a right-side floating panel showing newest-to-oldest user turns with avatar, styled turn number and plain-text quote snippet. The controls remained read-only over the active Conversation.
