# Validation — CV-003.DS-006.TS-5

## Status

Passed

## Automated Checks

- Mirror Extension suite: 13 passed
- Agentic Protocol suite: 7 passed
- Nautilus Method suite: 6 passed
- Harness suite: 35 files, 237 tests; production build passed
- Runtime assets current; extension manifest validated

Checks status: passed

## E2E

Decision: required

Evidence: Driver installed the extension in an isolated Mirror home, published and inspected Tactical and Strategic with explicit ancestry, then proved an invalid replacement exited 2 and preserved the stable Tactical SHA.

## Navigator Validation

Route: Accelerated Driver route: isolated installed extension round trip with bounded receipts and zero provider invocation.

Navigator accepted: yes

Expected observation: Tactical and Strategic publish only from explicit stdin candidates; ancestry is visible; invalid content is rejected without replacing last valid state.

Pass condition: All suites pass, installed round trips inspect as ok, invalid replacement preserves last valid state, and extension source contains no model or subprocess boundary.

Fail condition: Implicit provider invocation, model-owned envelope authority, missing ancestry, invalid publication or last-valid mutation.

## Missing Evidence

- none
