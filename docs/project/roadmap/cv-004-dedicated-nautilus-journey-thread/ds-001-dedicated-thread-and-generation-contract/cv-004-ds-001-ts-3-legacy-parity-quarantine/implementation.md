# Implementation — CV-004.DS-001.TS-3

Separated dedicated authority from `journey-conversations`. Legacy state is loaded only to derive `legacyStatePresent`; it is never classified as ready, rendered as the dedicated transcript, copied into `journey-threads`, or rewritten by the new readiness flow. The legacy conversation selector and restart controls are disabled while replacement lifecycle work remains deferred.

Evidence: dedicated storage tests assert only `load_journey_thread` / `save_journey_thread` commands are used and never invoke legacy conversation storage.
