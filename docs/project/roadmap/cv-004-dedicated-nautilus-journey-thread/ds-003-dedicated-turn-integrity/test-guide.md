# Test Guide — CV-004.DS-003 Dedicated Turn Integrity

## Purpose

Prove that every Nautilus turn advances only the verified active dedicated pair and that post-Pi interruption is recoverable without provider reinvocation or external transcript reconciliation.

## Automated Coverage

### Pure authority and ledger

- accept exact Journey/thread/generation/Pi/Mirror/receipt coordinates;
- reject absent, inconsistent, closed, stale and cross-Journey coordinates;
- reject native-ID mismatch before staging or invocation;
- accept duplicate native evidence idempotently;
- reject contradictory evidence;
- keep incomplete Pi tails inert;
- classify only active-pair internal states.

### Runtime adapters

- pass the exact Pi session file and dedicated Mirror conversation ID;
- prove complete native Pi turn ancestry before projection;
- persist checkpoints atomically and monotonically;
- retry projection and Mirror logging without provider invocation;
- discard stale run/turn/Journey/generation events;
- ignore external Pi and Mirror advancement.

### Resume and desktop

- restore exact-session complete turns once;
- show no conversation picker or external import affordance in the dedicated path;
- gate composer for unresolved active-pair commits only;
- show body-specific retry language;
- preserve transcript ordering across restart and Journey switching.

## Required Commands

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
```

## Navigator Validation

1. Select a Journey with a ready dedicated generation.
2. Send one real message and observe one settled response.
3. Confirm the exact dedicated Pi session contains the complete native turn.
4. Confirm the exact dedicated Mirror conversation contains one correlated user/assistant pair.
5. Restart or reselect the Journey and confirm the turn is restored once.
6. Simulate interruption after Pi completion and before one downstream checkpoint.
7. Use the specific recovery action and confirm no provider call occurs.
8. Advance an unrelated external Pi or Mirror conversation and confirm the Nautilus transcript and composer remain unchanged.
9. Switch Journeys during settlement and confirm late events remain bound to the originating coordinates.

One aggregate Navigator acceptance occurs after all five child packages are implemented.

## Evidence Restrictions

Validation receipts may contain bounded IDs, states, timestamps, counts and reason codes. Do not capture prompt/response bodies, private context, reasoning, tools, secrets or arbitrary environment values as authority evidence.
