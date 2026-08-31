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

## Concurrent Journey runtime architecture

DS-009 moves live execution from selected-Journey global state to Journey-owned runtime state. React remains responsible for explicit Navigator intent and view projection, while Tauri owns bounded local process execution. The architecture is intentionally phased so correlation, keyed frontend state, navigation and persistence land before increased concurrency:

```text
TS-1 correlated serial runtime
  -> TS-3 Journey-keyed frontend state while still serial
  -> US-1 navigation during execution while still serial
  -> TS-2 backend process registry with global limit 1
  -> TS-4 captured-authority settlement with global limit 1
  -> US-2 backend process registry with global limit 2
  -> US-3 selective cancellation, failure and settlement under real concurrency
```

Concurrency must not be enabled before TS-4. The frontend runtime model is keyed by native `journeyId`. Conversation state, run status, stream state, runtime projection, warnings, diagnostics, context usage, Mirror append state and finalization state belong to the Journey that started the run. The selected Journey is only a view selector. It must never become settlement authority for a background run.

At the TS-2 checkpoint, execution remains globally serial at production capacity 1. Journey and read-only altitude selection stay available while one owner streams or finalizes, but Send, Enter, attachments, restart, generic repair, settings/profile mutation and Journey administration are governed by aggregate presentation plus native lease occupancy. Text drafts remain editable. The owner row still projects compact presentation state from its Journey-keyed runtime entry; native occupancy never fabricates Working or Recording after presentation ends.

The focused Tauri registry is keyed by `journeyId`. Each entry owns exactly one immutable `RunAuthority`, one exact `runId`, an optional child, cancellation and first-terminal state, a separate Journey lease, and a private provider snapshot. `RunAuthority` remains based on persisted `TurnCorrelation` schema `0.2.0` plus validated active-generation `piSessionFile`; neither schema nor process-event authority changed. `start_pi_invocation(prompt, config, runAuthority)` is the single start boundary. `cancel_pi_invocation`, `release_pi_invocation_lease` and every registry mutation require captured `journeyId + runId` and reject stale replacement targets.

Reservation, duplicate-Journey checking, production-limit checking and insertion occur under one mutex before worker or child spawn. Each entry stores a cloneable child handle: directed control clones it after exact target validation and releases the registry mutex before `kill` or nonblocking `try_wait`; joins, event emission, filesystem access and post-processing also remain outside that mutex. Process capacity transitions independently from the Journey lease: the first terminal signal releases child capacity and moves the lease to `finalizing`, but the still-present lease occupies the only admitted production slot. First-terminal-wins prevents duplicate completion and capacity release. Spawn failure, process death, early cancel, cancel/done race, repeated terminalization and late A1 callbacks after A2 replacement are explicit deterministic paths.

Frontend occupancy begins `unknown`, fails closed while `reconciling`, and becomes free only from fresh bounded `inspect_pi_invocations` evidence. Even an exact cleanup response must be followed by bounded reinspection; malformed inspection, reinspection failure or a replacement lease remains blocking. Inspection is trigger-driven at mount and terminal/ambiguity boundaries, not polling. Its deterministic allowlist contains correlated identity and lifecycle state only; provider data, prompts, responses, `piSessionFile`, private paths, environment, credentials, secrets and raw output never cross this boundary. Backend reservation remains the final atomic TOCTOU barrier.

Presentation finalization cannot release native occupancy. Initial completion and matching retry share one authority-bound frontier ordered as active projection save, durable outbox enqueue, exact directed cleanup and fresh inspection. Without an existing durable outbox, pre-frontier transcript, projection, save and enqueue revalidate the active generation plus exact current run/turn after every await; rollover stops later effects and cleanup. Save or enqueue failure retains the lease. Durable projection plus enqueue authorize cleanup, and only successful reinspection projects occupancy free. Append, receipt-save and acknowledgement are downstream model-free work and may remain pending while one later serial child runs.

Post-frontier recovery validates the exact generation-scoped projection and durable outbox rather than requiring the original generation active. Receipt-save reloads the latest generation projection and commits only the original turn, preserving any later turn in that file. It cannot release a replacement lease, replace current diagnostics or remove another outbox item. Cancelled or failed turns request cleanup only after an active authority-bound interrupted-state save. A rejected reservation restores reversible staging durably before inspection can re-enable admission. Any earlier failure or ambiguous inspection/cleanup response retains the lease and blocks operations.

Retained occupancy exposes only bounded inspection and exact selected-owner settlement recovery in addition to textual drafting. Recovery matches inspected authority against persisted correlation, generation/thread, session, Mirror conversation and Harness message evidence; it starts no child and creates no run, turn, message, generation or staging. It resumes only the recorded projection/save, outbox enqueue/append/acknowledgement or interrupted-save phase, then requests matching cleanup. Non-owner, stale and evidence-free recovery fail closed.

Process events carry bounded authority derived from `RunAuthority`: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId` and `mirrorConversationId`. They deliberately exclude the private `piSessionFile` path; only `RunAuthority` and backend settlement code hold it. Dispatch is centralized through one app-level Tauri listener. The architecture avoids one listener per run receiving all events. A live route is registered before `start_pi_invocation` and remains open through `agent_end`, errors and cancellation so context, compaction and Mirror evidence emitted during wrapper post-processing are preserved; only the matching native `done` closes it. Mount/dispose use a lifecycle epoch, and an exact route may be rehydrated from bounded inspection plus persisted evidence without attaching a second listener or duplicating delivery. Reducers reject events that arrive after native `done`, lack authority, target a replaced run or mismatch the owning generation/session. Stale events are discarded or routed to bounded quarantine outside current run diagnostics.

Settlement and persistence use one immutable settlement authority projected exclusively from start-captured `RunAuthority`; selected Journey and visible conversation references never provide a destination. A FIFO coordinator serializes persistence phases per Journey, joins duplicate exact-turn phases, releases bookkeeping in `finally` and leaves provider-child lifetime outside the queue. Different Journey queues remain independent. Remote Mirror append runs outside the global outbox-file lock; that lock protects only bounded local reads/writes, so a pending A append cannot block B's durable enqueue.

Native projection saves use bounded Journey/generation lock stripes and explicit active pre-frontier versus generation-scoped post-frontier modes. Both validate authority inside the native boundary and publish through a unique staged sibling, file `sync_all`, atomic rename and parent-directory `sync_all`; failure preserves the prior projection. Exact enqueue is idempotent, inserted/existing receipts converge without repeated checkpoint increments, and acknowledgement returns `acknowledged` or `already_acknowledged` only from persisted exact proof. Restart recovers only projection/outbox work, never a dead child or generation activation. Tests inject only bounded registry limits; production capacity is one private constant exactly equal to 1 with no environment override. Capacity 2 remains future US-2 work.

Development validation happens in **Nautilus Harness Dev** only. Stable promotion is outside DS-009 until DEV proves interleaving, targeted cancellation, isolated failure, Journey switching, Mirror append behavior, generation rollover, app close with multiple children and rollback to global limit 1.

## Stable and development desktop channels

DS-011 defines two Tauri application identities over the same source tree:

```text
Nautilus Harness      com.nautilus.harness
Nautilus Harness Dev  com.nautilus.harness.dev
```

The stable `tauri.conf.json` remains the user baseline. A committed Tauri overlay plus the Rust `development-channel` feature selects development. Tauri bundle identity separates application data; a closed native runtime profile additionally binds Mirror code/home/user/database and applies those coordinates to all Mirror-sensitive subprocesses. React consumes only a sanitized native diagnostic to project the DEV icon, badge, palette and Settings details. Visual state never establishes authority.

The canonical setup and verification route is [Development Environment](../development/environment-setup.md).

## Next implementation story

The next implementation story should create the Tauri app skeleton and migrate DS-001/DS-002 protocol validation into TypeScript while preserving the Python scripts as temporary references until parity is validated.
