[< Roadmap](../index.md)

# DS-008 - Provider Settings Persistence

**Status:** 🟡 Planned

## Outcome

Nautilus Harness can persist non-sensitive provider settings locally so the app reopens with the Navigator's chosen provider/model configuration.

## Why This Matters

DS-003 makes provider configuration visible and editable, but only for the current app runtime. That is safe for the first configuration boundary, but inconvenient for daily use. Once the provider/model choice becomes part of the working cockpit, the app should remember non-sensitive settings without storing API keys or secrets.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-008.US-1 | Remember Provider Settings | User Story | Navigator can reopen the Harness and keep the last non-sensitive provider/model settings | 🟡 Planned |
| DS-008.US-2 | Reset Persisted Provider Settings | User Story | Navigator can restore the default lightweight Pi configuration explicitly | 🟡 Planned |
| DS-008.TS-1 | Local Settings Storage Boundary | Technical Story | Harness persists allowlisted provider settings locally without storing secrets | 🟡 Planned |
| DS-008.TS-2 | Settings Persistence Guardrails | Technical Story | Persistence excludes API keys, tokens, arbitrary env vars and broad process authority | 🟡 Planned |

## Done Condition

DS-008 is done when provider command/model settings survive app restart through an explicit local non-secret settings store, and the Navigator can reset them to the default lightweight Pi profile.

## Boundary

This delivery persists non-sensitive local settings only. It does not store API keys or secrets, sync remotely, configure external accounts, invoke Pi automatically, execute Missions, mutate files, or integrate Mirror.
