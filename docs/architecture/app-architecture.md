# Nautilus Harness App Architecture

**Status:** proposed
**Roadmap source:** DS-003.TS-1

## Architecture decision

The first Nautilus Harness app should be built as a Tauri 2 desktop app with a Vite, React and TypeScript frontend.

The architecture should keep the native shell thin and place Nautilus domain logic in TypeScript.

## Initial stack

- Tauri 2 for desktop shell and cross-platform packaging path.
- Vite for frontend development and build.
- React for the GUI.
- TypeScript for application, domain, view model and validation code.
- Zod for protocol fixture validation.
- Vitest for unit tests.

## Platform target

The app must be shaped for desktop compatibility with:

- Linux;
- macOS;
- Windows.

The first implementation story should validate development startup on the current machine and preserve the cross-platform structure. Full installer validation can wait for a packaging story.

## Proposed directory shape

```text
harness/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
    app/
      App.tsx
      main.tsx
    domain/
      nautilusIdentity.ts
      nautilusMission.ts
    protocol/
      schema.ts
      loadFixture.ts
    fixtures/
      nautilus.mission.yaml
    styles/
      app.css
    tests/
      protocol.test.ts
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs
```

This shape is a starting point, not a permanent architecture.

## TypeScript protocol migration

The Python protocol validator created in DS-001 and DS-002 should become a characterization reference. The TypeScript implementation should provide equivalent validation for:

- Nautilus identity fields;
- Mission id;
- Mission title;
- Mission purpose;
- Mission status as `formulated`.

Zod should define the schema and return typed data for the UI.

## App state boundary

The first app should support only:

- loading a local or bundled fixture;
- validating the fixture;
- deriving a view model;
- rendering identity, Mission and validation state;
- displaying validation errors.

It should not persist operational Nautilus state yet.

## Tauri boundary

Rust should remain shell infrastructure. The first implementation should avoid moving Nautilus domain concepts into Rust.

Allowed Rust responsibilities:

- app bootstrap;
- basic Tauri configuration;
- later filesystem command bridge if needed.

Not allowed in the first implementation:

- Nautilus ontology;
- protocol validation;
- Mission semantics;
- business rules.

## Initial screens

The first app can be one window with one main screen containing:

- app title and Nautilus identity;
- version fields;
- compatibility status;
- formulated Mission card;
- validation state;
- clear indication that Mission execution is not available.

## Test strategy

Vitest should cover protocol parsing and validation. React component tests can wait until the UI has interaction beyond rendering validated data.

Minimum test cases for the first implementation story:

- valid identity plus Mission fixture parses successfully;
- missing required identity field fails validation;
- missing Mission field fails validation;
- Mission status other than `formulated` fails in the current slice;
- view model exposes identity and Mission values for the GUI.

## Canonical Journey administration boundary

Journey creation, hierarchy/order changes, `project_path` assignment and guarded
empty-leaf deletion cross a single model-free native boundary. React owns explicit Navigator intent and
local interaction state; Tauri invokes the Mirror-owned JSON CLI, validates the
returned registry and atomically publishes it; Mirror alone owns mutation
validation, optimistic concurrency, SQLite transaction and idempotency receipt.
The Harness never mutates Journey SQL and never exposes an optimistic tree as
canonical.

The `0.2.0` registry adds exact `sourceVersion`, native identity evidence and
stable sibling position. Every mutation carries that source version and native
Journey IDs. A stale or malformed result leaves the prior desktop registry
intact. Creation remains identity-only and cannot provision repositories, files, Pi
sessions, Mirror conversations or dedicated Nautilus threads. The desktop does
not expose zero-based sibling position during creation: it derives append
placement from the selected parent's direct child count and recalculates it when
the parent changes. Deletion is the
inverse only for a canonical leaf with no protected association: parents are
disabled in the desktop, Tauri blocks native dedicated-thread evidence, and
Mirror re-checks every database-backed association transactionally without
cascade. When the empty leaf is active, Harness binds publication and selection
to its parent or the first remaining canonical Journey before accepting the
replacement registry. Project files and repositories are never deletion targets.

## Persistent agent-profile boundary

Harness owns a versioned, non-secret `agent-settings.json` record under Tauri's
application-data directory. It stores one global provider/model, thinking level
and invocation mode plus optional overrides keyed by exact native Journey ID.
Mirror Journey metadata is not changed. The pure TypeScript resolver applies
precedence independently:

```text
effective model = Journey model override ?? global model
effective thinking = Journey thinking override ?? global thinking
```

The native `agent_settings` module validates the same allowlisted shape, rejects
unknown fields and unsafe file types, and publishes through a staged sibling plus
rename. API keys, tokens, headers, environment variables, command arguments,
prompts, conversations and paths cannot enter this schema. Malformed persisted
state blocks live send until the Navigator restores a valid profile.

Global Settings and the active-Journey selector obtain selectable models from
`PI_OFFLINE=1 pi --list-models`. The Journey selector opens from the effective
provider/model link beside Send, keeping local override choice at its point of
use. Catalog inspection is local, not a provider invocation or remote refresh. React
projects the resolved profile into the current-session provider configuration
immediately before explicit send, removing existing `--provider`, `--model` and
`--thinking` values and appending one effective selection. `pi-default` omits
`--thinking`; Pi remains final authority for model-specific thinking-level
clamping. Profile changes never provision or restart a thread, generation, Pi
session or Mirror conversation.

## Next implementation story

The next implementation story should create the Tauri app skeleton and migrate DS-001/DS-002 protocol validation into TypeScript while preserving the Python scripts as temporary references until parity is validated.
