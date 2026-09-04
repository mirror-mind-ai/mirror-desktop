# Mirror Desktop App Scope

**Status:** active
**Current roadmap source:** CV-005

## Product decision

Mirror Desktop is the first-party desktop application body of Mirror Mind, not a script surface and not the product body of one optional method.

The application makes Journey-bound Pi and Mirror operation visible through screens and native capabilities. CLI scripts remain useful for validation and development, but they are not the product body.

## Approved foundation

The application uses:

- Tauri 2 as the desktop shell;
- Vite as the frontend build tool;
- React with TypeScript for the GUI;
- TypeScript for application and domain behavior;
- Zod for protocol validation;
- Vitest for TypeScript tests;
- a bounded Rust shell for native process, filesystem and packaging behavior.

The transferred Tauri body already supports Journey navigation, provider configuration, concurrent runs, durable dedicated conversations, attachments, artifacts, Mirror context and Operational, Tactical and Strategic projections.

## Product boundary

Mirror Desktop owns:

- application and runtime-channel identity;
- Journey navigation and local workspace experience;
- native Pi process invocation and bounded control;
- presentation of Mirror identity, memory, mode and Journey context;
- local projections needed for desktop continuity;
- diagnosis and, in later slices, onboarding and recovery.

Mirror Core owns canonical identity, memory, Journey and projection contracts. Pi owns native agent sessions, transcript ancestry, context usage and compaction. Nautilus owns only its method semantics, synthesis profile and Tactical or Strategic projection meaning.

## Platform direction

The architecture remains compatible with Linux, macOS and Windows. CV-005 intentionally validates a private source-built macOS alpha first. This does not yet authorize public binaries, signing, notarization, automatic updates or a claim of cross-platform release readiness.

## Current alpha boundary

The private alpha is for explicitly authorized repository collaborators. It requires an independently configured compatible Mirror installation. CV-005 will establish the Mirror Desktop product identity, remove compiled personal runtime assumptions in a later Delivery Story and prove one reproducible source-build route.

Complete new-user installation, Pi authentication, general onboarding and recovery remain future Installer and Desktop work.

## Migration direction

Nautilus Harness remains predecessor history and an available rollback application during the alpha. Mirror Desktop receives parallel bundle and app-data coordinates. There is no automatic copy, rewrite or deletion of predecessor state.

Product names become Mirror Desktop. Generic capabilities become Mirror-owned when a bounded change is justified. Genuine Nautilus method language remains Nautilus. Persisted identifiers and schemas change only through explicit compatibility policy and tests.

## Validation

A capability is accepted through deterministic domain, native, persistence and integration checks, with batched desktop E2E only where visible native behavior cannot be proven otherwise. The private alpha additionally requires at least one authorized collaborator to build and operate the app from source in an external macOS user environment.
