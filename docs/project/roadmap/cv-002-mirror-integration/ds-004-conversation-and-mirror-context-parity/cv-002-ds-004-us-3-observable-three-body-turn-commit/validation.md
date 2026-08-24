# Validation — CV-002.DS-004.US-3

## Status

Passed

## Automated Checks

- Harness npm test — 23 files, 156 tests passed
- Harness npm run build — passed
- Harness cargo test — 5 tests passed
- Harness cargo check — passed
- Mirror affected conversation-logger suites — 35 tests passed
- Mirror ruff check and format check — passed
- Mirror extension esbuild and ancestry lifecycle harness — passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated a normal live turn as in_sync with native Harness, Pi and Mirror ids. Navigator then ran controlled assistant Mirror failure: Pi answer remained visible, notice appeared, unresolved state survived a normal relaunch, and one Retry cleared the notice. Persisted state became in_sync with exactly two deterministic Mirror messages. The latest Pi session file remained unchanged, proving Retry invoked neither Pi nor provider.

## Navigator Validation

Route: Completed interactively in Laboratório Mirror Harness: normal success, controlled assistant failure, relaunch with pending notice, and idle Retry.

Navigator accepted: yes

Expected observation: Observed: normal success was quiet; failure preserved the answer and showed actionable notice; relaunch preserved pending state; Retry wrote only the missing assistant record and cleared the notice.

Pass condition: Satisfied: native correlated evidence exists in all three bodies; failure/relaunch/retry matched the contract; Retry created no Pi session or provider run; scoped checks are green; no US-4/US-5 behavior appeared.

Fail condition: Not observed: no duplicate turn, lost Pi answer, unproven synchronization, model-backed Retry, lost relaunch state, leaked content/secrets, or permanent success noise.

## Missing Evidence

- none
