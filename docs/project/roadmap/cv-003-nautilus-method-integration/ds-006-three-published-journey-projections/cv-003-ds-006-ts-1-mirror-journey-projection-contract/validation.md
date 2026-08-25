# Validation — CV-003.DS-006.TS-1

## Status

Passed

## Automated Checks

- Consumer probe self-tests: 16 passed
- Probe checksum verification: passed
- All contract JSON documents parse: passed
- Current installed Mirror baseline: contract_unavailable with exit 10
- npm test: 35 files, 237 tests passed
- npm run build: passed
- Mirror Core working tree: unchanged

Checks status: passed

## E2E

Decision: not_required

Evidence: Navigator accepted the self-contained contract kit after fixture-level executable validation. Stateful fake adapters cover conformance, absence, incompatibility, malformed output, unsafe paths/namespaces, partial publication and subprocess failure; the real isolated pre-release probe returns contract_unavailable as designed.

## Navigator Validation

Route: Review the contract in README order, verify checksums and tests, and inspect the blocked RETURN-CONTRACT gate.

Navigator accepted: yes

Expected observation: The package is sufficient for an independent Mirror session, current Mirror remains unavailable, and no source or production state was changed.

Pass condition: Navigator accepts the package as the immutable consumer acceptance kit for the Mirror release session.

Fail condition: The package needs conversation context, permits unsafe behavior, changes Mirror, or can open the gate without the unchanged installed-runtime probe.

## Missing Evidence

- none
