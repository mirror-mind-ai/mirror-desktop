# Implementation — CV-004.DS-001.TS-2

Added the versioned persistence envelope, renderer storage bridge, and namespace-confined Tauri commands. Dedicated records live under `journey-threads/<journey>.json`; writes stage then rename and validate Journey authority before activation. Parsing rejects cross-Journey, malformed, missing-active, non-monotonic, and reused-native-ID records.

Evidence: `src/tests/persistedNautilusJourneyThread.test.ts`, `src/tests/journeyThreadStorage.test.ts`, Rust test/check suite.
