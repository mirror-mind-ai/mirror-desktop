# Validation — CV-002.DS-004.US-4

## Status

Passed

## Automated Checks

- Harness npm test — 24 files, 164 tests passed
- Harness npm run build — passed
- Harness cargo test — 6 tests passed
- Harness cargo check — passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator resumed exact Pi JSONL externally at base 0a39a884. Native user 6030b130 and terminal assistant c907c120 projected on Laboratório Mirror Harness activation as deterministic Harness ids, advanced state to pi_advanced, and survived repeated focus recovery plus full Nautilus relaunch without duplication. Viagem do Lipe remained unchanged while active before activation.

## Navigator Validation

Route: Completed: external exact-session turn while another Journey was active; activate mapped Journey; repeat focus twice; close and reopen Nautilus.

Navigator accepted: yes

Expected observation: One quiet ordered external turn, responsive focus, pi_advanced state, no run/provider activity, no duplicate after focus or relaunch.

Pass condition: Exact descendant turn projects once and remains once across focus and relaunch without cross-Journey mutation.

Fail condition: Missing/duplicate turn, focus stall, provider run, or cross-Journey mutation.

## Missing Evidence

- none
