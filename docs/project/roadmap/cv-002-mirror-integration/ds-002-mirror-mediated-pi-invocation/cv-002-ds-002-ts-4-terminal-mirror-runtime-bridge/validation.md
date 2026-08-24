# Validation — CV-002.DS-002.TS-4

## Status

Blocked

## Automated Checks

- Mirror runtime mode now passes the natural latest user message to Pi instead of the Harness-authored technical JSON prompt.
- Raw local Pi fallback still uses the previous read-only Harness task-packet prompt.
- Mirror runtime invocation runs from the Mirror runtime root and injects --session-id nautilus-<journey-id> plus --approve when absent.
- Provider settings label Mirror runtime Pi distinctly from Raw local Pi.
- npm test passed: 17 files, 77 tests.
- npm run build passed.
- cargo check passed before the final label-only edit; no Rust changed after that.

Checks status: passed

## E2E

Decision: required

Evidence: none

## Navigator Validation

Route: In Harness Settings, confirm Invocation mode is Mirror runtime Pi. On a pt-BR Journey, ask the same pt-BR question used in Pi terminal. Confirm the reply follows Mirror terminal behavior more closely: no Harness JSON-task framing, natural language response, Mirror voice/language behavior from runtime context. Then test Raw local Pi fallback if desired.

Navigator accepted: no

Expected observation: Mirror runtime mode no longer replaces Mirror behavior with the Harness technical prompt; it sends the user's natural message through Pi from the Mirror runtime root.

Pass condition: The answer no longer defaults to the Harness English task-packet voice; Mirror terminal-like behavior is observed, and raw fallback remains available.

Fail condition: Harness still sends the technical JSON task prompt in Mirror mode, output remains framed as Harness mission extraction, or cancellation/streaming breaks.

## Missing Evidence

- required E2E evidence is missing
- Navigator validation has not been accepted
