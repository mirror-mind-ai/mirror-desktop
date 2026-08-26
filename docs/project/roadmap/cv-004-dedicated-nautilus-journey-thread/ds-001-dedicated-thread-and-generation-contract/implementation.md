# Implementation — CV-004.DS-001

The Harness now has a dedicated Journey-thread authority boundary independent from parity-era conversation state:

- pure schema, parser, invariant and readiness classification;
- append-only generation transition and cross-registry native-ID checks;
- atomic `journey-threads` persistence through dedicated Tauri commands;
- legacy state quarantine without migration, deletion or automatic adoption;
- loading, absent and inconsistent desktop states;
- fail-closed composer and command guard;
- Journey artifacts and published projection surfaces remain independent of conversation readiness.

No provider is invoked by classification, loading or persistence. DS-001 does not provision a thread; that remains CV-004.DS-002.
