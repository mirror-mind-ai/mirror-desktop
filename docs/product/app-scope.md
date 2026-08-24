# Nautilus Harness App Scope

**Status:** scoped
**Roadmap source:** DS-003.US-2

## Product decision

Nautilus Harness is a real desktop application body, not a script surface.

The Harness must make the Nautilus experience visible through screens and app capabilities. CLI scripts may remain useful for validation and development, but they are not the Harness product body.

## Approved stack

The initial Harness stack is:

- Tauri 2 as the desktop shell;
- Vite as the frontend build tool;
- React with TypeScript for the GUI;
- TypeScript for Nautilus app and domain code;
- Zod for protocol and fixture validation in TypeScript;
- Vitest for TypeScript unit tests.

Tauri implies a small Rust shell. Rust should remain infrastructure only. Nautilus domain logic belongs in TypeScript.

## Platform requirement

The GUI must be compatible with desktop use on at least:

- Linux;
- macOS;
- Windows.

The first implementation does not need installer polish, signing, auto-update or distribution channels. It must be shaped so those paths remain possible later.

## Migration decision

Existing Python produced during DS-001 and DS-002 must be migrated to TypeScript for non-Mirror bodies:

- `agentic-protocol` should move protocol parsing and validation to TypeScript;
- `harness` should move app behavior to TypeScript and desktop GUI;
- `agentic-method` remains primarily documentation and does not need runtime migration;
- `mirror-extension` may remain Python because it belongs to the Mirror runtime body.

The Python scripts in `agentic-protocol` and `harness` are now considered prototype artifacts. They remain useful as characterization references until TypeScript parity exists.

## Initial app body

The first real Harness app should include:

- a desktop window;
- a Nautilus identity area showing name and versions;
- a Mission area showing the formulated Mission;
- a compatibility or validation state;
- a clear indication that the Mission is formulated, not executing;
- fixture loading from the local protocol fixture or an app-bundled equivalent.

## Initial capabilities

The first app slice should be able to:

- load a Nautilus protocol fixture;
- validate identity and Mission fields in TypeScript;
- render identity and Mission information in the GUI;
- show validation errors visibly;
- run in development mode on the local machine.

## Out of scope for the first app slice

The first app slice does not include:

- Mission execution;
- operational Nautilus state;
- Participants, Roles or Authority management;
- Delivery, Evidence, Realization or Integration flows;
- persistence beyond reading local fixture data;
- authentication;
- sync;
- packaging, signing or release distribution;
- Mirror database access.

## Validation route for the scope

This scope is valid when a Navigator can read it and agree that it preserves the correction: Harness must become a desktop app body with TypeScript domain code and cross-platform GUI direction.

The next implementation story should convert this scope into a concrete Tauri app skeleton and TypeScript protocol migration plan.
