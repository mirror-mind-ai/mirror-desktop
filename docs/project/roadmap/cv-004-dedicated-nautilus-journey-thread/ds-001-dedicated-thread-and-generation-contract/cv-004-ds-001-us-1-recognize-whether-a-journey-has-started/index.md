[< Parent](../index.md)

# CV-004.DS-001.US-1 - Recognize Whether a Journey Has Started

**Status:** 🟠 Implemented — awaiting Navigator validation
**Type:** User Story

## User Story

As the Navigator,
I want Nautilus to distinguish a Journey with a proven dedicated thread from one that has never started or has inconsistent authority,
So that I never enter a generic chatbot or mistake an external Mirror conversation for the Journey's Nautilus conversation.

## Outcome

The selected Journey has one explicit readiness surface derived from its dedicated thread record. `ready` resumes the existing conversation shell. `absent` replaces chat and composer with a centered not-started state. `inconsistent` fails closed with bounded recovery copy. Legacy conversation presence may be acknowledged without being treated as active continuity.

## Acceptance Behavior

```text
Given the selected Journey has no dedicated thread record
When Nautilus opens it
Then the conversation and composer are not available
And a centered “This Journey has not started in Nautilus” state is visible
And existing legacy conversations are not offered for selection
```

```text
Given the selected Journey has one valid ready active generation
When Nautilus opens it
Then the existing conversation shell is eligible to resume from that exact generation
And no arbitrary Pi or Mirror conversation picker appears
```

```text
Given the selected Journey has malformed or contradictory dedicated authority
When Nautilus opens it
Then the composer remains blocked
And the surface explains that the Nautilus thread needs recovery
And no provider, import or automatic repair runs
```

## Scope

- Add a dedicated Journey-thread loading state to App.
- Add an accessible centered state component for `loading`, `absent` and `inconsistent` readiness.
- Gate conversation, composer, context inspection and live invocation on `ready` dedicated authority.
- Keep Operational artifacts and published altitude projections available because they belong to the Journey, not its conversation.
- Show bounded legacy-presence copy without listing or importing legacy conversations.
- Discard stale asynchronous thread-load results after Journey switching.
- Add component, App characterization and state-transition tests.

## Expected Files

- `src/app/JourneyThreadState.tsx`
- `src/app/App.tsx`
- `src/styles/app.css`
- `src/tests/journeyThreadState.test.tsx`
- focused App source/behavior tests

## Out Of Scope

- Making **Start this Journey** operational. That belongs to `CV-004.DS-002`.
- Creating or activating Pi/Mirror native pairs.
- Restarting conversation or browsing generation history.
- Removing the old conversation picker and reconciliation implementation before DS-005.
- Changing Tactical, Strategic or artifact hydration.

## Navigator Validation

1. Open a Journey containing parity-era conversations but no dedicated thread record.
2. Confirm Nautilus presents the centered not-started state and no generic composer.
3. Confirm no Mirror conversation picker or reconciliation preview appears.
4. Switch among Journeys and confirm each state remains Journey-scoped.
5. Confirm Operational artifacts and published Tactical/Strategic readings remain accessible.
6. Confirm no provider or native conversation creation occurs.

Pass condition: the desktop reliably distinguishes `absent`, `ready` and `inconsistent`, legacy state never enables conversation, and no non-ready Journey can submit a command.

Fail condition: an external or legacy conversation is adopted; the composer appears without ready dedicated authority; Journey switching leaks state; or recognition invokes Pi, Mirror mutation or a provider.
