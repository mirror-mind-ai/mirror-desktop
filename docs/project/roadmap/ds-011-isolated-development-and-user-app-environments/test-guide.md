[< Story](index.md)

# Test Guide — DS-011

## Purpose

Validate two structurally isolated Nautilus desktop channels. Visual distinction is necessary but not sufficient: the development channel must use a distinct Tauri identity and Harness data root, and every Pi/Mirror operation must use the code checkout associated with Journey `mirror-dev` plus its isolated home, user and database.

## Required Channel Matrix

| Coordinate | Stable user | Development |
|---|---|---|
| Product | `Nautilus Harness` | `Nautilus Harness Dev` |
| Bundle identifier | `com.nautilus.harness` | `com.nautilus.harness.dev` |
| Mirror code | `$HOME/mirror` | `$HOME/.mirror-journeys/mirror-mind/mirror-dev` |
| Mirror home | `$HOME/.mirror-minds/alisson-vale` | `$HOME/.mirror-minds/mirror-dev` |
| Mirror user | `alisson-vale` | `mirror-dev` |
| Mirror DB | `$HOME/.mirror-minds/alisson-vale/memory.db` | `$HOME/.mirror-minds/mirror-dev/memory.db` |
| Harness app data | stable bundle root | development bundle root |
| Visible identity | stable existing appearance | distinct icon, palette and `DEV` text |
| Source modification | released runtime, no Harness-authored commits | Mirror development workspace and non-`stable` branch |
| Promotion authority | official Mirror runtime updater only | Mirror CI, release notes and release flow before update |

## Automated Validation

### Native runtime-channel contract

- user and development profiles are closed typed variants;
- `$HOME` expansion produces absolute bounded paths;
- expected product, identifier, app-data identity and Mirror coordinates are exact;
- missing roots, missing database, symlink/alias escape and cross-channel values fail closed;
- development never falls back to `$HOME/mirror`, stable Mirror home or Harness root;
- stable never adopts Mirror Dev implicitly;
- diagnostics expose only the allowlisted channel fields;
- app setup rejects a merged Tauri identifier that disagrees with the compiled channel.

### Process projection

Characterize and then assert every Mirror-sensitive process receives:

```text
current_dir
MIRROR_HOME
MIRROR_USER
DB_PATH
```

Cover:

- Journey registry export/refresh;
- Journey mutation;
- projection inspection;
- Mirror conversation provisioning;
- Mirror logger/reconciliation;
- Pi session provisioning;
- live Mirror-mediated Pi invocation;
- Pi session commit/context lookup.

Assert no command builder retains `/Users/alissonvale/mirror`, production-only Python defaults or fallback to the Harness root.

For Journey administration specifically, test the complete process boundary rather than individual environment fields:

- an explicit `DB_PATH` remains authoritative even when the Mirror checkout `.env` declares a different `MEMORY_ENV`;
- administrative commands do not pass partial path arguments that cause Mirror to derive a competing database name;
- bootstrap, refresh and mutation resolve the same Mirror root, home, user and database;
- bootstrap delegates to Mirror's canonical `journey export-registry` command, publishes schema `0.2.0`, and contains no direct SQLite Journey exporter;
- bootstrap rejects legacy or malformed exporter output and atomically preserves the previous registry when canonical export fails;
- `npm run import:mirror` uses the same explicit stable-channel launcher rather than implicit environment defaults;
- global registry administration does not inherit `NAUTILUS_TURN_CORRELATION_V1` from an agent turn;
- an unavailable prior selection reconciles to canonical refreshed data, while an empty registry still fails closed;
- native mutation rejection codes remain visible and actionable;
- Journeys with missing recorded parents use the same effective root grouping in registry projection and append-position validation;
- successful reload feedback dismisses automatically, while failures remain visible.

### Harness persistence and dedicated authority

- Tauri app-data resolution differs by bundle identifier;
- settings, registry, preferences, threads, operation records, generation projections and Pi session directories remain channel-local;
- new thread/activation records include runtime channel;
- stable legacy records without channel metadata remain readable only in the stable root and are upgraded model-free;
- development rejects legacy unmarked stable records;
- send, restart, recovery and Mirror commit preflight reject channel mismatch.

### Frontend channel projection

- strict parsing rejects unknown or malformed diagnostic fields;
- stable shell keeps its existing appearance and has no `DEV` label;
- development shell carries a channel class/data attribute, distinct icon and visible `DEV` text;
- development recognition does not depend on color alone;
- diagnostic rendering matches the native profile and contains no arbitrary environment data.

### Tauri and build configuration

- stable and development bundle identifiers differ;
- development config overrides product, identifier, title and icon;
- development commands always pair the config overlay with the Cargo development feature;
- user build omits that feature and overlay;
- normal development cannot launch the stable channel accidentally;
- icon files exist, are bounded and have required dimensions/formats;
- both configurations compile.

### Python bridges

- Mirror root/home/database are explicit or derived from the validated channel environment;
- no script prepends `$HOME/mirror/src` while development is active;
- bootstrap output resolves to the selected bundle's app-data root;
- production defaults cannot leak into a development invocation;
- malformed or missing channel coordinates fail before database mutation.

### Authorship and promotion isolation

- record the production Mirror branch, HEAD, upstream relation and clean-worktree evidence before Harness development;
- Harness implementation and troubleshooting create no source diff or commit in `$HOME/mirror`;
- commands that require a Mirror source change stop and hand off to `$HOME/.mirror-journeys/mirror-mind/mirror-dev` rather than patching production;
- Mirror Dev changes use a non-`stable` branch and pass Mirror-owned tests, formatting, CI and release-note gates;
- stable Mirror consumes the capability only after official release and runtime update;
- a Harness production-promotion request authorizes only the Harness promotion command and cannot authorize a Mirror commit, push or release;
- final evidence proves `$HOME/mirror` equals its published stable ref with no local ahead commits.

### Documentation

- root `README.md` and `AGENTS.md` link to one canonical setup guide;
- commands are not duplicated across entry documents;
- every documented command exists in `package.json` or a committed script;
- all referenced files and directories are explained;
- reset instructions warn before destructive action and are channel-confined.

## Standard Automated Commands

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

The implementation plan must add explicit stable/development build checks using the delivered scripts. A bundled macOS app build is required before Navigator validation because browser/unit rendering cannot prove Dock identity, bundle metadata or app-data separation.

## Real Desktop Validation

### 1. Establish stable evidence

Before launching development:

- open the installed stable Nautilus app;
- record its bundle identifier and app-data root;
- select a stable Journey with existing conversation history;
- record bounded file metadata or checksums for stable settings/thread/generation files;
- record bounded production Mirror conversation/message counts for the chosen Journey.

Do not copy database contents into story evidence.

### 2. Launch development side by side

Use only the documented development command. Confirm:

- both apps remain open simultaneously;
- Finder/Dock/app switcher show different names and icons;
- development window title and `DEV` indicator are unmistakable;
- development palette differs while remaining readable;
- stable appearance remains unchanged.

### 3. Inspect runtime identity

Open the runtime diagnostic and verify every development coordinate:

```text
channel       development
bundle id     com.nautilus.harness.dev
Mirror code   $HOME/.mirror-journeys/mirror-mind/mirror-dev
Mirror home   $HOME/.mirror-minds/mirror-dev
Mirror user   mirror-dev
Mirror DB     $HOME/.mirror-minds/mirror-dev/memory.db
```

Verify development app data is outside the stable bundle root.

### 4. Exercise development state

Within Nautilus Dev:

- refresh the Journey registry from Mirror Dev;
- start or resume a development Journey;
- provision its dedicated generation;
- send one explicit bounded validation turn;
- restart the development app and resume the same development state;
- optionally reset only a disposable development Journey/state fixture.

Confirm Pi session cwd and Mirror conversation evidence resolve to Mirror Dev.

### 5. Prove stable non-mutation

After the development exercise:

- compare stable Harness file evidence with the baseline;
- compare production Mirror counts/evidence with the baseline;
- confirm no development conversation ID appeared in production Mirror;
- return to the still-open stable app and verify its selected Journey/history remains usable.

Only expected development app-data and Mirror Dev database changes may be observed.

### 6. Negative fail-closed probes

Using safe test configuration, attempt each mismatch without invoking a provider:

- development feature plus stable bundle identifier;
- development channel plus stable app-data coordinate;
- development channel plus `$HOME/mirror`;
- development channel plus production `MIRROR_HOME`;
- development channel plus `MIRROR_USER=alisson-vale`;
- development channel plus production `DB_PATH`;
- missing Mirror Dev checkout or database.

Each attempt must stop before Journey mutation, conversation provisioning or Pi invocation and report a bounded actionable mismatch.

### 7. Verify production checkout non-mutation

After the complete development and stable-app exercise:

- compare `$HOME/mirror` branch, HEAD, upstream relation and worktree with the baseline;
- confirm there are no Harness-authored local commits or source modifications;
- if Mirror capability work was required, show its separate Mirror Dev branch, green gates, release evidence and runtime-update receipt;
- fail validation if the stable checkout was used as an implementation workspace, even when the resulting app behavior appears correct.

### 8. Documentation walkthrough

- One human follows the canonical guide from prerequisites to verified launch.
- One coding agent, given only repository instructions, locates the same guide and explains or executes the non-destructive verification route.
- Record ambiguities as documentation defects and correct them before acceptance.

## Pass Condition

Navigator accepts DS-011 only when stable and development applications operate side by side with unmistakable identities; all Harness and Mirror state is demonstrably channel-confined; the Journey-associated Mirror Dev coordinates are visible; negative mismatches fail before mutation/provider activity; existing stable history remains intact; and the canonical guide works for both a human and an agent.

## Failure Condition

DS-011 fails validation if any of the following occurs:

- development replaces or shares the stable bundle/app-data identity;
- visual identity is the only isolation mechanism;
- any development process uses stable Mirror code, home, user or database;
- production Harness files or Mirror rows change during the bounded development exercise;
- Harness work edits or commits to the production Mirror checkout, or bypasses Mirror Dev, CI, release notes and runtime promotion;
- an unmarked stable thread is adopted by development;
- startup silently falls back after a missing development prerequisite;
- diagnostics expose secrets/arbitrary environment values;
- setup still depends on chat history or undocumented manual exports.

## Validation Evidence

Accepted by the Navigator on 2026-08-29:

- stable and development applications ran simultaneously with distinct Dock identities, development icon, palette and `DEV LAB` label;
- development diagnostics reported `com.nautilus.harness.dev`, its channel-local app-data root, the Journey-associated Mirror Dev checkout, `mirror-dev` home/user and `memory.db`;
- a real bounded turn in disposable Journey `sandbox-pet-store` returned `DEV CHANNEL ISOLATED`;
- the same generation survived a full development-app restart and restored both messages with the composer available;
- a desktop-discovered hard-coded stable Pi-session root was corrected to use the active Tauri app-data root, with native regression coverage;
- valid dedicated authority is no longer mislabeled `invalid_record` when a later runtime read fails;
- bounded database checks found the development conversation plus two messages in Mirror Dev and no matching conversation or messages in production;
- the installed stable app retained its normal appearance, Journeys and conversation history;
- production Mirror remained clean on `stable` at released commit `fdd760f8f3532dbeb0841826107d1672f6bbb881`;
- 63 Vitest files / 329 tests, production TypeScript/Vite build, 32 Rust tests in both stable and development feature configurations, and development `cargo check` passed.

The restart also reproduced the non-blocking legacy reconciliation warning because released Mirror no longer returns structured evidence for Harness's old `conversation-logger commit-status` call. The messages were already present in Mirror Dev. `CV-002.DS-005` owns replacement with the released explicit append boundary; no retry or automatic repair was used during DS-011 acceptance.
