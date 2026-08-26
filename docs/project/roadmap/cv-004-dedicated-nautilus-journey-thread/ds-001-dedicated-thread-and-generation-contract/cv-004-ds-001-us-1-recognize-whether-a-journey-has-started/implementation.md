# Implementation — CV-004.DS-001.US-1

The Operational Chat surface now loads dedicated authority before exposing conversation. Loading, not-started, and fail-closed recovery surfaces are centered in the workspace. Existing Journeys without proven dedicated records intentionally appear not started; legacy history is acknowledged but not adopted. Operational artifacts and published Tactical/Strategic projections remain accessible. Sending is guarded in code as well as by hiding the composer.

Evidence: `src/tests/journeyThreadState.test.tsx` plus the full frontend build and test suite.
