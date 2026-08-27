[< Parent](../index.md)

# CV-004.DS-003.TS-1 — Dedicated Invocation Authority

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

Every new provider run is authorized immediately before staging by the selected Journey's exact ready thread, active generation, activation receipt, native Pi session and dedicated Mirror conversation.

## Acceptance Behavior

```text
Given exact dedicated authority is ready
When a real Navigator message is submitted
Then Journey, thread, generation, Pi, Mirror, receipt, run and turn coordinates are bound before invocation
And stale, closed, inconsistent or cross-Journey authority is rejected without invoking the provider
```

## Scope

- Pure invocation-authority coordinate and parser.
- Read-back preflight against persisted dedicated thread authority.
- Exact Pi session file and Mirror conversation transport.
- Late event confinement by Journey, generation, run and turn.
- Characterization of existing legacy turn-correlation checks before separating the dedicated path.

## Out of Scope

- Turn-body checkpoint persistence; TS-2.
- Recovery UI; US-2.
- Generation restart; DS-004.

## Validation

Table-driven authority tests plus Tauri preflight tests proving rejection occurs before process creation or transcript staging.
