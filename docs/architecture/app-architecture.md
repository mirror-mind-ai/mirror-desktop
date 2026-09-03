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

Journey creation, canonical mutable metadata edits (name, description and
`project_path`), hierarchy/order changes, focused `project_path` assignment and
guarded empty-leaf deletion cross a single model-free native boundary. React owns explicit Navigator intent and
local interaction state; Tauri invokes the Mirror-owned JSON CLI, validates the
returned registry and atomically publishes it; Mirror alone owns mutation
validation, optimistic concurrency, SQLite transaction and idempotency receipt.
The Harness never mutates Journey SQL and never exposes an optimistic tree as
canonical.

The `0.2.0` registry adds exact `sourceVersion`, native identity evidence,
lossless editable description content and stable sibling position. Every mutation
carries that source version and native Journey IDs. Edit Journey keeps the id and
slug read-only, leaves hierarchy to the directed move operation and updates the
canonical heading, Description section, display metadata and optional project
path in one Mirror transaction. Legacy Journey prose is normalized without being
discarded. A failed form submission remains visible inside that administration
form and does not also leak into the sidebar registry-status surface. A stale or
malformed result leaves the prior desktop registry intact. Creation remains identity-only and cannot provision repositories, files, Pi
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

The same exact-target Journey administration menu is available from Recent,
Pinned and Tree rows through pointer context-menu interaction and keyboard
Context Menu / Shift+F10. It contains Edit, Create, Move and guarded Delete;
project-path editing belongs to Edit Journey rather than a duplicate menu action.
Outside pointer interaction dismisses the menu, while Escape dismisses it and
restores focus to the invoking row. Menu availability follows the existing
aggregate runtime administration guard and never changes Journey selection or
execution authority. Recent rows retain the persisted recent order and Pinned
rows retain explicit pin order; changing the selected Journey affects row state
but never reorders either open view. Successful exact live native admission is
the sole event that marks a Journey newly worked, moves that exact Journey to the
top of bounded persisted Recent order, and asks an already-open Recent viewport
to follow the movement. Rejected submission does none of these. The viewport
scroll is presentation-only, respects reduced motion, does not run in Pinned or
Tree, and never changes keyboard focus, selection, or execution authority.

Journey appearance is deliberately split from canonical Mirror metadata. A
bounded channel-local preference overlay keyed by immutable Journey ID stores
only a curated system-icon ID or a `custom` marker; it never stores an external
file path. Edit Journey exposes those device-local controls and applies them
immediately, independently of canonical metadata submission. Native custom-image
import accepts only decoded PNG, JPEG or WebP sources up to 5 MiB, rejects unsafe
Journey IDs, GIF/SVG/unsupported formats and symbolic-link storage escapes,
center-cover normalizes to a 512px square PNG, and atomically writes the result
under the active channel's app-data `journey-appearance/` directory. Native
read-back returns bounded PNG data rather than filesystem authority. At most 32
custom assets and 256 appearance entries are retained; missing or corrupt assets
fall back to the existing Journey glyph, selecting a system/default icon removes
the custom asset idempotently, and Journey deletion attempts best-effort orphan
cleanup without affecting canonical deletion authority. Runtime phase labels,
semantic accents and exact Journey execution ownership remain independent of
appearance.

The user message avatar is a separate, singleton channel-local presentation asset.
Appearance Settings imports only decoded PNG, JPEG, or WebP sources up to 5 MiB,
normalizes them through the same 512px center-cover PNG boundary, and atomically
stores `user-avatar/avatar.png` beneath the active bundle's app-data root. Native
load revalidates the regular PNG and dimensions; unsafe replacement leaves the
previous valid avatar intact, and removal is idempotent. The frontend accepts only
a bounded PNG data URL, gives transparent pixels a neutral backing surface, renders
the photo only for user-authored message cards, and immediately falls back to the
existing `N` mark when absent or invalid. No original path, Mirror identity,
conversation content, Journey preference, agent avatar, or execution authority is
changed; stable and DEV remain isolated by their existing app-data roots.

## Curated dark and light application themes

The channel-local Appearance preference selects one immutable ID from a curated
catalog grouped as Dark or Light; arbitrary colors and automatic system/time
switching remain outside the contract. Existing dark IDs stay backward-compatible.
Daylight, Mist and Parchment share one semantic light-surface contract while each
supplies its own canvas, raised surface, primary/muted text and accent tokens.
Daylight is deliberately conventional: neutral white/gray surfaces carry the
hierarchy, with an accessible interface blue reserved for links, focus, selection
and actions. It does not inherit the green-teal accents used by Nautilus's dark
channel theme; teal and green Journey chrome are normalized to that Daylight blue.
Mist applies the same normalization to its cool blue-gray accent, and Parchment to
its warm brown accent, so neither inherits stray green/teal selection, runtime, or
mode chrome. Other Journey identity colors and exact runtime authority remain intact.
Recent, Pinned and Tree controls use explicit primary/muted text, bounded hover and
disabled states, plus an accent border and inset selected edge rather than inheriting
the generic light-button foreground.
Those tokens cover shell and sidebar, Journey navigation, conversation and
copy-ready prose, composer controls, Artifacts, menus and Settings/dialogs.
Light-theme speaker avatars use filled accessible surfaces: neutral for the user,
theme accent for the agent and a darker violet for routed personas, each with a
white glyph that meets text contrast requirements. Conversation/Artifacts tabs
use explicit primary/accent foregrounds, bounded surfaces, a three-pixel selected
edge and a visible focus outline instead of inheriting the generic light button
rule. Imported context, Ariad summaries and mode-activation events likewise map
their labels, badges, chevrons, nested body surfaces and disclosure focus states
to semantic light tokens; structural borders and the mode event's inset edge
preserve hierarchy without relying on hue alone. The composer runtime pill also
maps both Working and Completed to explicit light surfaces and primary text;
Completed adds an accent edge and check mark rather than fading the entire label.
The same rule extends through live and settled operation evidence: operation names,
completed/failed/interrupted statuses, reasoning summaries, expanded evidence and
compaction panels use explicit light surfaces and semantic foregrounds, and settled
history is never dimmed as a whole. Historical attachment cards use primary text
for filenames, muted paths, bounded surfaces and focus outlines; their section
label is intentionally black in every curated light theme.
Catalog tests enforce primary, muted and accent contrast against declared light
surfaces and preference round-trips for every new ID. Development channel identity,
runtime semantic colors, reduced motion and the neutral custom-image background
remain independent of theme choice.

## Temporary Journey surface availability

One explicit presentation policy controls which already-implemented Journey
surfaces are currently offered to users. Operational, Conversation and Artifacts
are enabled; Tactical, Strategic and Ariad are temporarily disabled until their
functional readiness is separately validated. Disabled surfaces remain in the
codebase with their projection loading, empty states and rendering seams intact,
but their controls are absent from the DOM, keyboard order and accessibility
tree. Both switchers and App consume the same policy. While Operational is the
only available altitude, the altitude switcher itself is omitted as redundant;
it returns automatically as soon as Tactical or Strategic is enabled in the
policy. Stale in-memory Tactical or Strategic selection normalizes to
Operational, while stale Ariad selection normalizes to Conversation; an
available Artifacts selection is preserved. Each surface returns through one
explicit policy change plus tests, not by rebuilding removed implementation.

## Journey-aware chat file navigation

Verified local paths rendered inside conversation messages cross a Journey-aware
native classification boundary before activation. Relative paths are resolved
against the message owner's registered Journey workspace. Canonically contained,
non-symlink files route to the Operational **Artifacts** surface, which expands
and selects the exact relative path and offers an explicit **Open file** action.
Absolute files outside that canonical root retain immediate opening through the
existing safe native file boundary. Current-user home-relative references beginning
with `~/` preserve that compact text in the conversation but expand only inside the
native boundary. Canonical home-relative files inside the registered Journey route
to Artifacts; files elsewhere under the current home route to native opening. Bare
`~`, named-user forms such as `~other/`, environment variables, shell expansion and
globbing are never interpreted.

Traversal, missing targets, directories, symbolic-link components and canonical
escapes fail visibly. Classification and OS opening both revalidate native
filesystem authority; Pi output and frontend selection never establish path
authority. The async result is owner-scoped so navigation during classification
cannot redirect another Journey. HTTP(S) links and non-chat activity rendering
retain their existing behavior.

The Artifacts split view has a presentation-only preview expansion toggle. In its
expanded state, CSS removes the mounted workspace tree from layout and accessibility
exposure while the component retains its expanded-path and selected-node state; the
viewer consumes the reclaimed width and the same control restores the tree. This
state is local to the Harness surface and cannot change Journey, file, execution, or
filesystem authority. The toggle exposes `aria-pressed` and `aria-controls`, has
explicit keyboard focus in dark and light themes, and the ordinary split view stacks
safely at constrained viewport widths.

Markdown Artifact previews consume the same bounded block and inline grammar used
for safe conversation presentation, but render through an Artifact-owned component
with no conversation actions or automatic links. Headings, emphasis, lists,
blockquotes, inline/fenced code, and canonical or provider-compacted tables become
semantic React elements; raw HTML, scripts, remote assets, and unsupported links
remain escaped inert text. Tables retain the shared limits of 16 columns, 100 rows,
and 2,048 characters per cell, expose header and alignment semantics, and scroll
horizontally inside the viewer. Other preview kinds and the native 1 MiB read bound
remain unchanged.

## Artifact reveal boundary

Every visible Artifact file or folder offers the same exact-target context menu
through pointer and keyboard access. **Reveal file/folder** sends only the
registered Journey ID and canonical relative Artifact path to Tauri. Native code
resolves the current registry-owned Journey root, rejects traversal, omitted
workspace components, missing targets, symbolic-link components and canonical
escapes. The menu names the exact operation as **Reveal File...** or **Reveal
Folder...**, then dispatches the resolved path as a separate process argument to the
platform file manager. Finder and File Explorer select the exact item; on Linux,
folders open directly and files open their containing folder. Reveal never opens
or edits the Artifact itself, and failures remain local to the Artifacts surface.
Frontend selection and arbitrary absolute paths carry no filesystem authority.

## Copy-ready message prose

Assistant Markdown blockquotes are treated as explicit copy-ready prose blocks.
The bounded MessageContent parser removes each leading quote marker, keeps
quote-only lines as paragraph boundaries, recovers the equivalent compact
` > > ` separator when a provider emits the whole quote on one line, and renders
inner text through the same
safe inline renderer used by ordinary messages. Empty or malformed quote-only
input remains inert text. The block-level copy action sends only normalized inner
prose, without supported inline Markdown delimiters, to the existing text-only
clipboard boundary, with exactly one blank line
between paragraphs and draft-specific success/failure announcements. It never
copies surrounding explanation, mutates conversation/composer state, evaluates
HTML, or changes the existing whole-message Markdown copy contract.

## Bounded message tables

MessageContent recognizes canonical Markdown tables and the provider-compacted
single-line equivalent only when a non-empty header, three-or-more-dash delimiter
cells and consistently sized body rows form a complete bounded table. The parser
accepts at most 16 columns, 100 rows and 2,048 characters per cell; malformed,
oversized or ordinary pipe-bearing prose remains inert paragraph text. React owns
the resulting semantic `table`, header and body markup, applies only declared
left/center/right alignment, and sends every cell through the existing safe inline
text/link renderer. A presentation-only wrapper contains wide results with
horizontal scrolling and supplies complete dark/light surfaces. This path never
evaluates HTML, mutates composer/conversation state, or changes whole-message copy,
persistence or turn lifecycle authority.

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

DS-012 introduces one native, channel-specific per-Journey turn journal for new runs. Admission writes immutable exact authority; execution advances through admitted, running, terminal-durable, projected, outbox-enqueued and settled/interrupted frontiers with optimistic revision/phase checks and idempotency receipts. Native terminal adoption captures only minimal exact Pi execution evidence—final assistant output, IDs, counts, timestamps and truncation state—before `done`; raw prompt/protocol/reasoning streams are not journaled. React projects and advances checkpoints but does not own lifecycle truth; the dispatcher remains correlated transport and the registry remains live execution ownership. Cold start and a rehydrated frontend resume terminal projection/outbox work from journal evidence or mark execution without a live exact child durably interrupted. Pi JSONL may corroborate execution but does not decide lifecycle or destination. Journal-derived interruption is projected explicitly in the conversation and shown as an actionable successor-safe UI state.

Frontend occupancy begins `unknown`, fails closed while `reconciling`, and becomes free only from fresh bounded `inspect_pi_invocations` evidence. Even an exact cleanup response must be followed by bounded reinspection; malformed inspection, reinspection failure or a replacement lease remains blocking. Inspection is trigger-driven at mount and terminal/ambiguity boundaries, not polling. Its deterministic allowlist contains correlated identity and lifecycle state only; provider data, prompts, responses, `piSessionFile`, private paths, environment, credentials, secrets and raw output never cross this boundary. Backend reservation remains the final atomic TOCTOU barrier.

Presentation finalization cannot release native occupancy. Initial completion and matching retry share one authority-bound frontier ordered as active projection save, durable outbox enqueue, exact directed cleanup and fresh inspection. Without an existing durable outbox, pre-frontier transcript, projection, save and enqueue revalidate the active generation plus exact current run/turn after every await; rollover stops later effects and cleanup. Save or enqueue failure retains the lease. Durable projection plus enqueue authorize cleanup, and only successful reinspection projects occupancy free. Append, receipt-save and acknowledgement are downstream model-free work and may remain pending while one later serial child runs.

Post-frontier recovery validates the exact generation-scoped projection and durable outbox rather than requiring the original generation active. Receipt-save reloads the latest generation projection and commits only the original turn, preserving any later turn in that file. It cannot release a replacement lease, replace current diagnostics or remove another outbox item. Cancelled or failed turns request cleanup only after an exact journal-derived interrupted-state save. A rejected reservation restores reversible staging durably before inspection can re-enable admission. Any earlier failure or ambiguous inspection/cleanup response retains the lease and blocks operations.

Retained occupancy exposes bounded inspection as live-execution evidence, while the journal alone chooses lifecycle recovery. Recovery matches exact journal authority against persisted correlation, generation/thread, session, Mirror conversation and Harness message evidence; it starts no child and creates no run, turn, message, generation or staging. It resumes only the journal-recorded projection/save, outbox enqueue/append/acknowledgement or interrupted-save phase, then requests matching cleanup. Non-owner, stale and evidence-free recovery fail closed.

Process events carry bounded authority derived from `RunAuthority`: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId` and `mirrorConversationId`. They deliberately exclude the private `piSessionFile` path; only `RunAuthority` and backend settlement code hold it. Dispatch is centralized through one app-level Tauri listener. The architecture avoids one listener per run receiving all events. A live route is registered before `start_pi_invocation` and remains open through `agent_end`, errors and cancellation so context, compaction and Mirror evidence emitted during wrapper post-processing are preserved; only the matching native `done` closes it. Mount/dispose use a lifecycle epoch, and an exact route may be rehydrated from bounded inspection plus persisted evidence without attaching a second listener or duplicating delivery. Reducers reject events that arrive after native `done`, lack authority, target a replaced run or mismatch the owning generation/session. Stale events are discarded or routed to bounded quarantine outside current run diagnostics.

Settlement and persistence use one immutable settlement authority projected exclusively from start-captured `RunAuthority`; selected Journey and visible conversation references never provide a destination. A FIFO coordinator serializes persistence phases per Journey, joins duplicate exact-turn phases, releases bookkeeping in `finally` and leaves provider-child lifetime outside the queue. Different Journey queues remain independent. Remote Mirror append runs outside the global outbox-file lock; that lock protects only bounded local reads/writes, so a pending A append cannot block B's durable enqueue.

Native projection saves use bounded Journey/generation lock stripes and explicit active pre-frontier versus generation-scoped post-frontier modes. Active pre-frontier validation requires the authorized run/turn to be the exact latest reconciliation turn in both the candidate and the persisted projection read under the Journey/generation lock, not merely present in either history. Save modes preserve every persisted reconciliation turn plus committed Mirror receipts and checkpoints monotonically, so an authority-free lifecycle autosave cannot delete a pending replacement or regress acknowledged evidence. Exact rejected-reservation rollback uses its own authority-bound mode to remove only the rejected current turn. Only after that durable rollback and bounded reinspection succeed does the frontend remove the exact rejected runtime entry and staged snapshot; occupied sibling Journeys remain byte-for-byte unchanged. Rollback or inspection failure retains the rejected entry and diagnostic as fail-closed evidence. Authority conflicts fail closed. Saves publish through a unique staged sibling, file `sync_all`, atomic rename and parent-directory `sync_all`; failure preserves the prior projection. Exact enqueue is idempotent, inserted/existing receipts converge without repeated checkpoint increments, and acknowledgement returns `acknowledged` or `already_acknowledged` only from persisted exact proof. Restart recovers only projection/outbox work, never a dead child or generation activation. Tests inject only bounded registry limits 1 and 2. After the DS-012 serial/restart and TS-3 isolation gates passed, US-3 restored production capacity to one private constant exactly equal to 2 with no environment override. The native registry admits at most the configured bounded entries globally and one reserved, running or finalizing entry per Journey. The frontend validates only inspection limits 1 and 2 and derives selected-Journey submission admission separately from the aggregate guard retained for settings, Journey administration, generation restart and selected-global attachment staging. A free B Journey may submit while A owns one slot; C remains navigable and draft-editable but cannot submit while A and B occupy both slots. Native reservation remains the final atomic TOCTOU boundary. App shutdown clones at most two exact running child handles under the registry lock and passes them to bounded outside-lock control; every captured handle is attempted even when an earlier control fails. The capacity-two restoration preserves the journal authority, event, reducer, persistence and command contracts proven at capacity one; shutdown drains at most two exact child handles.

Targeted cancellation captures the selected runtime's immutable live identity before awaiting native control and invokes only its exact `journeyId + runId`; later navigation cannot retarget the request or its settlement. Frontend interruption classification retains the first cancellation or failure terminal signal, while Journey-keyed reducer updates, diagnostics, snapshots and cleanup leave a concurrently running sibling byte-identical. Controlled automated failures use dependency seams only: pre-frontier failures retain the exact owner lease, post-frontier append/receipt/ack failures retain owner-keyed recoverable evidence, and a sibling Journey may continue through its own queue and frontier. Restart recovery remains model-free and resolves each Journey independently from persisted projection/outbox evidence.

DS-009 development validation completed in **Nautilus Harness Dev** only. US-2 proved natural two-Journey overlap, Journey switching, full-capacity rejection without side effects, owner-correct completion, bounded shutdown/restart and rollback compatibility. US-3 added deterministic coverage and accepted real DEV evidence for selective cancellation, exact-child process death, first-terminal precedence, sibling isolation, controlled settlement failure, bounded two-child shutdown and independent model-free recovery. Stable app-data and production Mirror remained unchanged. DS-009 closure does not itself authorize another roadmap item, push, GitHub release or Mirror runtime change; local production promotion remains an explicit guarded repository operation.

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
