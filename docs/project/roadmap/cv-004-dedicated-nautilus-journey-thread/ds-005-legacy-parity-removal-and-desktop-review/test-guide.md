# Test Guide — CV-004.DS-005

## Automated Gate

### Reachability characterization

Prove the production desktop and Tauri handler no longer expose:

- Mirror conversation picker/reload/title generation;
- external Pi polling or transcript projection;
- Mirror-only reconciliation preview/application;
- arbitrary conversation hydration/reset;
- generic parity conversation authority;
- bootstrap conversation materialization.

Tests should assert absence of obsolete imports, commands, handler entries, UI copy and production call paths—not merely hidden rendering.

### Dedicated safety regression

Retain coverage for:

- clean start and provider-free provisioning;
- exact active-generation authority;
- complete Pi evidence before projection;
- idempotent Mirror recording/retry;
- exact Pi transcript resume;
- restart transaction/history;
- generation-scoped Harness projection;
- post-response drafting release with invocation still gated;
- rapid Journey switching and stale-result confinement.

### Retirement fixtures

Cover valid parity projection, already retired projection, malformed JSON, wrong Journey, symlink, unknown file, receipt-write failure, deletion failure and crash/retry. Assert native Pi/Mirror fixtures remain byte-identical.

## Commands

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
```

## Navigator Desktop Matrix

Use at least one clean Journey, one active dedicated Journey, one restarted multi-generation Journey and one parity-evidence Journey.

1. Confirm **Start this Journey** on the clean/parity-only Journey.
2. Confirm provisioning is provider-free and produces one native pair.
3. Send first real turn and verify situated Journey authority.
4. Switch away/back and verify exact active-pair resume without picker.
5. Advance a separate terminal conversation and verify Nautilus remains unchanged.
6. Exercise Mirror recording failure/retry without provider reinvocation.
7. Restart and verify inactive prior generation plus empty replacement.
8. Exercise interrupted lifecycle recovery.
9. Verify bounded parity retirement and unchanged native history.
10. Switch Journeys rapidly during bounded lifecycle work and verify late-result confinement.
11. Confirm interaction/drafting release immediately after provider completion.

One aggregate Navigator acceptance closes the story.

## Evidence Restrictions

Store only bounded IDs, statuses, reason codes, operation coordinates and file-class outcomes. Never store transcript bodies, prompts, responses, reasoning, tool output, secrets or arbitrary environment values.
