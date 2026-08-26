# Implementation — CV-004.DS-001.TS-1

Implemented `src/domain/nautilusJourneyThread.ts` as a pure, provider-free authority grammar. It parses bounded identifiers and timestamps, enforces monotonic generations, detects missing/non-ready authority and native-ID reuse, validates registry-wide reuse, and checks append-only generation transitions. The readiness classifier exposes only `absent`, `ready`, or `inconsistent`; legacy presence is evidence only.

Evidence: `src/tests/nautilusJourneyThread.test.ts`.
