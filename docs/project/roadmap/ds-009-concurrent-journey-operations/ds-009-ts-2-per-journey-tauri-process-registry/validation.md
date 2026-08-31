# Validation — DS-009.TS-2

## Status

Passed

## Automated Checks

- Independent review approved dc115b9 + f9de380 with no remaining blockers
- npm test: 78 files / 429 tests passed
- npm run build: passed
- cargo test stable: 58 passed
- cargo test --features development-channel: 58 passed
- git diff --check: passed
- TS-4, US-2, US-3 and RS015 scope diff: empty

Checks status: passed

## E2E

Decision: required

Evidence: Passed DEV-only sequential smoke on disposable us1-final-a-0831 and us1-final-b-0831. Settings showed DEV LAB, development, com.nautilus.harness.dev, isolated dev app-data, Mirror Dev code/home/user/database, validated. A admitted exactly one native child; B retained an editable draft while Send/Enter, attachment and mutation controls were blocked; owner-only cancel remained on A. A and then B settled sequentially with committed Harness/Pi/Mirror projections and no child overlap. Separate cancellation targeted journey us1-final-a-0831 + run agent-run-2026-08-31T19:52:03.814Z, persisted provider_cancelled interrupted evidence, removed the sole child, and restored B admission with no stale owner or capacity leak. Running/absent were directly observed; unknown/reconciling, reserved/finalizing, callback races, exact cleanup ordering and private inspection payload are transient/private and remain covered by deterministic tests. Stable app-data remained byte-identical (457 files; aggregate 8a9d2bdf92d2abea67b0ae8053f33efcfdce2ce2d2725698029bed4d5bd6d61e); production Mirror conversations/messages deltas were both zero.

### DEV environment and admission

- The installed stable app was closed before launch and remained closed throughout the smoke.
- The app identified itself as Nautilus Harness Dev / DEV LAB with channel `development`, bundle `com.nautilus.harness.dev`, app-data under `com.nautilus.harness.dev`, Mirror code/home/user under the Mirror Dev profile, and runtime status `validated`.
- Known-free startup restored normal operational controls. The initial `unknown`/`reconciling` interval completed too quickly for a reliable screenshot; deterministic occupancy tests remain the authority for that fail-closed transient.
- No reload was performed during a live run.

### Sequential completion

- A run `agent-run-2026-08-31T19:41:52.334Z` was the sole child of the Harness process while Working. Its Harness/Pi projection committed at `19:43:53.407Z` and Mirror committed at `19:43:55.376Z`.
- While a later A run owned the lease, B preserved the editable draft `TS2 NONOWNER B DRAFT EDITABLE DURING A2`; Send/Enter and attachment were disabled, settings/profile save actions and Journey administration mutations were disabled, no cancel was offered on B, and the sole native child remained A's.
- B was admitted only after A was absent/free. B run `agent-run-2026-08-31T19:45:06.483Z` committed Harness/Pi at `19:46:59.835Z` and Mirror at `19:47:01.305Z`. At no observation point did the Harness process have more than one Pi child.
- Successful A and B projections ended with Harness, Pi, and Mirror all `committed`; the durable outbox was empty after acknowledgement. The exact save/enqueue/cleanup/reinspection/append ordering is intentionally established by deterministic settlement tests rather than inferred from final files.

### Directed cancellation

- Owner A exposed the only cancel control while Working.
- The persisted exact target before cancellation was Journey `us1-final-a-0831`, run `agent-run-2026-08-31T19:52:03.814Z`, turn `turn-agent-run-2026-08-31T19:52:03.814Z`, generation 1.
- One owner cancel removed the sole child immediately. The durable turn retained the user message, no assistant duplicate was created, Pi became `failed` with `failureCode: provider_cancelled`, and Harness/Mirror remained pending as interrupted evidence.
- Fresh post-cleanup admission showed no child and restored B's Send control with its draft intact. No capacity leak or stale owner was observed.

### Inspection, privacy, and limits

- `running` and `absent/free` were directly observed. `reserved`, `finalizing`, first-terminal races, repeated/stale callbacks, and the short cleanup/reinspection interval were not slowed or fabricated for smoke capture; deterministic Rust/frontend tests remain authoritative for those phases.
- The private bounded inspection payload is not rendered in the product UI. Its strict allowlist and rejection of prompts, responses, provider configuration, `piSessionFile`, private paths, environment, stdout/stderr, secrets, malformed fields, and over-bound entries are covered by the accepted deterministic tests. No production failure or retained lease was manufactured.
- After the Dev app closed, stable app-data was still byte-identical across 457 files. The production Mirror database had zero conversation and message row deltas, so no writer attribution exception was needed for this run.

## Navigator Validation

Route: DEV-only sequential smoke: startup admission, Journey A occupancy and B blocking/drafting, exact completion cleanup before sequential B, separate owner-directed cancellation, bounded private inspection, and stable isolation.

Navigator accepted: yes

Expected observation: Nautilus Harness Dev remains globally serial at capacity 1; native occupancy fails closed until inspected, blocks all non-draft operations while leased, releases only after exact durable cleanup and fresh reinspection, and directed owner cancellation settles once without leakage.

Pass condition: Automated gates and independent review pass; the DEV-only sequential route passes without overlap, private inspection data, stable app-data changes, capacity 2, or sibling-story scope.

Fail condition: Any second invocation or overlap, premature admission, stale/replacement cleanup, duplicate cancel/done, private inspection leakage, stable mutation, or channel identity mismatch fails Validation.

## Missing Evidence

- none
