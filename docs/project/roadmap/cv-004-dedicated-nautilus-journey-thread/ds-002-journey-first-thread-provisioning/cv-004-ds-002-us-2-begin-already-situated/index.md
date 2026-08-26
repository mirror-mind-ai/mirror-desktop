[< Parent](../index.md)

# CV-004.DS-002.US-2 — Begin Already Situated

**Status:** 🟠 Implemented — awaiting Navigator validation  
**Type:** User Story

## User Story

As the Navigator,  
I want the newly started conversation to open only after its Journey context is active,  
So that my first real message is already understood inside the correct Journey without an initialization exchange.

## Outcome

After verified readiness the composer appears empty, with no generated greeting. The first real user message is the first provider request and uses the exact dedicated Pi/Mirror authority with Journey identity, mode and semantic context already prepared.

## Acceptance Behavior

```text
Given start has completed but no real message was submitted
When native activity is inspected
Then provider request count is zero
And no synthetic user or assistant turn exists
```

```text
Given the generation is verified ready
When the Navigator submits the first real message
Then it is routed through the dedicated native pair
And certified Journey identity, mode and context predate invocation
```

```text
Given authority changes or no longer verifies before send
When the Navigator attempts the first message
Then invocation fails closed before provider use
```

## Scope

- Empty ready composer with no greeting.
- Dedicated native-ID routing for the first invocation.
- Immediate preflight revalidation of thread and activation receipt.
- Evidence that context activation precedes provider invocation.
- Fake-provider integration coverage and one desktop validation.

## Out Of Scope

- Full three-body turn commit, repair and later-turn integrity (DS-003).
- Importing external transcript history.
- Synthesis publication or Journey work execution during start.
- Hidden model calls for naming, activation or greeting.

## Expected Areas

- `src/app/App.tsx`
- invocation authority adapter/domain helpers
- first-message integration tests

## Validation

Start with observable provider count zero, send one real message, verify count one and exact dedicated authority, and confirm the response is situated without any preceding synthetic transcript entry.
