[< CV-010](../index.md)

# CV-010.DS-005 - The 0.3 Line: Mirror Desktop on an Embedded TypeScript Mirror

**Status:** 🟡 Planned — re-scoped by the Navigator on 2026-10-28 ([decision](../decision-2026-10-28-the-0-3-line.md)); nothing built

## Outcome

A Mirror Desktop **0.3** line hosts the TypeScript Mirror Core inside the app, as a pinned Node 24 and a
Desktop-owned host process, on its own database and its own Mirror installation. It never touches the
Navigator's production or Python Mirror. The frozen 0.2 line (`v0.2.0-alpha.58`) keeps serving
production until a final, explicit migration.

> **Superseded 2026-10-28.** Everything from *Why* through *Step 1* below records the first, additive
> plan: one app speaking to both Cores, under no Core change. It is kept as history. The audit result
> still stands as evidence. The plan that governs is **The 0.3 Line Plan** at the end of this file.

## Why

Field, 2026-10-28: following mirrormind.sh in the clean `mirror` account, `uv sync` failed because
published Mirror is TypeScript 0.37.0. Every Desktop release supports only `>=0.31.14,<0.32.0`, so a
person installing Mirror today cannot use Mirror Desktop, and DS-001 cannot find their Mirror.

## The Constraint That Shapes Everything

> The current Mirror Desktop installation must not stop working: it holds this session and several
> others. — Navigator, 2026-10-28

What production depends on, measured:

- `runtime-binding.v1.json`: `alisson-vale`, `/Users/alissonvale/mirror`, Python **0.31.14** on `stable`
  at `b2d710e`. Upstream `stable` has moved to 0.37.0.
- Nothing updates that checkout automatically: no LaunchAgent runs a Mirror update. The one Mirror
  LaunchAgent (`mirror-web-console`) itself runs `uv run python -m memory web`, so it also depends on
  the Python Core staying.
- What changes production is a Desktop release the Navigator chooses to install.

### Invariants for every release of this story

1. **Additive, never replacing.** The Python path is not removed or rewritten. A binding written by an
   earlier release is read exactly as before, with no migration and no rewrite of the file.
2. **The Core kind is decided by what is installed, never by a guess.** It is a checkout with
   `src/memory` (Python) or a `mirror` front door (TypeScript), and an existing binding keeps its kind.
3. **A production-shaped regression guard.** A fixture with the shape of the production binding
   (Python checkout, 0.31.14, `uv`) must validate, connect and produce the same argv for all six Core
   calls as today. Any diff is a failed gate.
4. **Built and proven away from production.** Development uses the Development channel, which has its
   own bundle identifier and app data, and the clean `mirror` account. Production is upgraded only
   after both pass, and only by the Navigator.
5. **A rollback the Navigator holds.** Before the production upgrade, a copy of the running alpha.58
   app is kept outside `/Applications`. Going back is then putting it back, and the binding file it
   reads is untouched by design.
6. **The Navigator's own Mirror is not migrated by this story.** Moving production to TypeScript Core
   is a separate, later and explicit decision, and the web console depends on Python as well.

## What Desktop Calls Today (to map onto 0.37)

| Today (Python) | Where | 0.37 equivalent |
|---|---|---|
| `uv run python -m memory conversations append --mirror-home … --format json` | outbox delivery (CR163 bounded) | `mirror conversations append`, **documented** |
| `… -m memory journey mutate` | Journey admin | to confirm |
| `… -m memory journey-projection inspect` | Canvas/Tactical | to confirm |
| `… -m memory recall` | terminal recall launcher | `/mm-recall` documented; CLI form to confirm |
| `scripts/mirror_conversation_catalog.py` (**imports `memory.MemoryClient`**) | catalog, rebind-journey | **no Python API in 0.37**: needs a CLI equivalent, or the operation stays Python-only |
| `scripts/provision_mirror_conversation.py` (**imports `memory.MemoryClient`**) | conversation provisioning | same |

The two scripts that import Core's Python API are the real risk. If 0.37 offers no command for
provisioning and catalogue operations, Desktop cannot provision a Conversation on TypeScript Core
without changing Core, and that conflicts with the Navigator's rule. **This must be answered before
any code is written.**

## Step 1 — Compatibility Audit (read-only)

- Install `mirror-mind@0.37.0` in a scratch prefix in the `mirror` account, or read the published
  package. Do not touch the production checkout.
- For each row above, find the 0.37 command, its arguments and JSON shape, and record it next to
  today's.
- Confirm where 0.37 resolves the home: a clone's `.env`, then `~/.config/mirror/env`, per its
  Getting Started. Also confirm the database file name.
- **Deliverable:** this table filled in, with every gap named and a recommendation. Each gap gets one
  of three answers: a 0.37 command exists, the operation degrades on TypeScript Core, or it needs Core
  (which would go back to the Navigator).

Scope, files, acceptance and validation are written after the audit, because they depend on its gaps.

## Exclusions

- Migrating the Navigator's Mirror to TypeScript Core, or updating `/Users/alissonvale/mirror`.
- Removing Python Core support.
- Changing Mirror Core, or the site's install page, which belongs to another Journey.

## Step 1 Result — Compatibility Audit (2026-10-28)

**Method.** I read the published `mirror-mind@0.37.0` npm tarball (registry integrity
`sha512-r8vLhYJY…XtoA==`), extracted it into an isolated scratch directory and executed none of it:
its front-door routing (`ts/src/frontDoor/routing.ts`, `usage.ts`), the conversation module, the MCP
tool list, the migrations and `docs/releases/pending-cutoffs.md`. The scratch copy was then deleted.
Nothing was installed and no account was touched. The production database was opened **read-only**
once, to read its migration table.

### The headline: upstream already decided Desktop stays on Python

`pending-cutoffs.md` names Mirror Desktop in three cutoffs, in the same words each time: *"Pin to the
last Python-bearing release. Its integration with the TypeScript core is a separate effort, and that
effort defines whatever read model it needs."* The last Python tree is the tag
`cv22-last-python-bearing`. It also says: *"If you had code that imported the Python core, there is no
programmatic API to move it to: use the command line or the MCP server."*

### The table, filled in

| Desktop today (Python) | 0.37 | Verdict |
|---|---|---|
| `conversations append --mirror-home … --format json` | `mirror conversations append`, same contract and the same named rejections (`conversation_not_found`, `journey_mismatch`, …) | ✅ **exists** |
| `recall <id> --limit N` | `mirror recall` | ✅ **exists**, output shape to confirm |
| `journey mutate` (Journey admin) | **removed** in CV22 (`journey-admin-verbs`); *"there is no replacement for … a batch mutation endpoint"* | ❌ **gap** |
| `journey-projection inspect` (Canvas / Tactical / Strategic) | **removed** with the whole projection subsystem; `.mirror/projections` is no longer written | ❌ **gap** |
| `provision_mirror_conversation.py` (`MemoryClient`: `get_or_create_conversation`, `upsert_runtime_session`, `update_conversation`) | **no Python API**. The CLI has no create-a-Conversation verb outside a runtime session. `append` refuses an unknown Conversation (`conversation_not_found`) | ❌ **gap, and it is the critical one**: without it no new Desktop Conversation can be recorded in Mirror |
| `mirror_conversation_catalog.py` (`catalog`, `inspect`, `rename`, `rebind-journey`, `delete`) | `conversations list`, `conversations delete` and MCP `list_conversations` exist. No rename and no rebind | ⚠️ **partial**: list and delete could map; rename and rebind are gaps |

**Outcome:** two of six map today. The four gaps include **Conversation creation**, without which
Desktop's core loop — every turn recorded in Mirror — cannot work on TypeScript Core.

### A risk to production the plan did not yet name

The production database is at migration **016** (`016_builder_workbench_display_codes`). 0.37 ships
**017** (`journey_parent_column`) and **018** (`drop_hook_injected`) and **applies pending migrations
the first time it opens a database**, backup first. **If any 0.37 `mirror` command ever runs against
`~/.mirror-minds/alisson-vale`, that database moves to 018**, and whether Python 0.31.14 and the web
console still work on it is unknown. This invariant is added: **no TypeScript `mirror` process may
open the production home.** That covers Desktop discovery (which stays read-only and spawns nothing,
as built), development builds and any audit. TypeScript work uses only the `mirror` account or a
throwaway home.

### Also stale: the exploration's "decisive finding"

The Windows installer and Frame, which the exploration described as the proven sequence to port, are
**retired** in 0.32 (`pending-cutoffs.md`, *The Windows Frame and installer*). There is no working
guided installer upstream on any platform.

### What this means

Following the Navigator's rule (no change to Mirror Core), Desktop **cannot** fully run on TypeScript
Core: Conversation creation has no public surface. There are three honest paths, and the choice is the
Navigator's:

1. **Pin Desktop to the last Python-bearing Core, as upstream itself says.** The first-run assistant
   installs `cv22-last-python-bearing` (Python, `uv`) for new users. That works today, but it builds
   onboarding on a Core upstream no longer maintains, beside a site that tells people to install the
   other one.
2. **Relax the rule for a small, named Core contract.** Mirror's own cutoffs invite this ("that effort
   defines whatever read model it needs"). The minimum is a non-runtime "create or ensure a
   Conversation" verb. Rename and rebind would also be needed for parity, and Journey projections for
   Canvas / Tactical / Strategic. The work is done in `mirror-dev` and released by Mirror. Production
   is untouched until the Navigator chooses to migrate.
3. **Desktop writes Mirror's database itself.** Ruled out: it would make Desktop a second writer of
   another product's schema, and it is exactly the coupling upstream removed.

**Recommendation: path 2, scoped to the minimum.** Ship Conversation creation first, so new users get
the core loop. Rename and rebind degrade to read-only on TypeScript Core, and the Canvas and the
altitudes show an honest "not available on this Mirror" until a read model exists. The Navigator's
production stays on Python throughout, under the invariants above.

## The 0.3 Line Plan (2026-10-28)

Governed by the [decision](../decision-2026-10-28-the-0-3-line.md) and its four conditions: (a) a separate update channel and bundle
identity, (b) open only homes 0.3 created, (c) a last phase that is a migration, and (d) CR work resumes
when 0.3 is stable. Each phase is planned in full, with scope, files, acceptance, validation and
exclusions, before it is built.

| Phase | Where | Outcome |
|---|---|---|
| **0 · Freeze and separate** | Desktop | `release/0.2` is cut from `v0.2.0-alpha.58`. 0.3 gets its own updater channel and bundle identifier, and the release route refuses to put a 0.3 version on `alpha`. `main` becomes 0.3. |
| **1 · A library seam in Core** | Core, in `mirror-ts` | Core declares a stable importable API (`exports`) for what Desktop needs. **Its first piece is to open a home without migrating and report pending migrations**, so Desktop asks before anything changes. After that come creating or ensuring a Conversation, the explicit append that already exists, rename, Journey rebind, Journey reads, and `init`/`seed` as functions. Each ships through Mirror's own release. |
| **2 · The embedded host** | Desktop 0.3 | A pinned Node 24 is bundled; Node SEA is evaluated against a loose runtime. The host process speaks a typed RPC contract. Every wait is bounded and the host is supervised and restarted (CR163). The guard is (b): homes with a 0.3 marker only. The first step swaps **transport only**, and outbox, settlement and recovery keep their shape. |
| **3 · The first-run assistant on 0.3** | Desktop 0.3 | DS-002 shrinks to installing Pi. DS-003 creates a home with the marker. DS-004 connects providers, now including `pi auth check` readiness. The host reproduces the Mirror-context injection that terminal Pi receives through 0.37's hooks. |
| **4 · Stable** | Desktop 0.3 | 0.3 is in daily use on its own database and its own installation. **CR work resumes here (d).** |
| **5 · Migration** | Desktop 0.3 + Navigator | Production moves: rehearsed backup and restore, the schema move, the web console's end recorded, the 0.2 app data imported or abandoned, and the two-Mirrors version rule decided in an Explorer Mode pass beforehand. Only at the Navigator's word. |

### Phase Status

This table is the source for the Canvas's 0.3 line. Its vocabulary is the roadmap's: 🟡 Candidate (not
yet planned in full), 🟡 Planned, 🟠 Implemented and ✅ Done. A phase is Done only when its acceptance,
including any Navigator check, is met.

| Phase | Status | What is owed |
|---|---|---|
| 0 · Freeze and separate | ✅ Done | — (Navigator check passed 2026-10-28) |
| 1 · A library seam in Core | 🟡 Planned | Slices 1a to 1d (CV24.DS1–DS4) are built on `desktop/library-seam-1a`, with Core CI green. Slice 1e (DS5, migrate on request) is planned; its backup custody awaits the Navigator. Merge and Core release need their own word. |
| 2 · The embedded host | 🟡 Candidate | A full plan |
| 3 · The first-run assistant on 0.3 | 🟡 Candidate | A full plan |
| 4 · Stable | 🟡 Candidate | A full plan |
| 5 · Migration | 🟡 Candidate | An Explorer pass on the two-Mirrors version rule, then a full plan |

**Not carried into 0.3 at first:** Journey administration (`journey mutate` was removed upstream) and the
Canvas and altitude read models (projections were removed). Each returns when a Core contract for it is
planned in phase 1 or later. Until then, 0.3 says plainly that it is not available.

## Phase 0 Done in Part: Branch and Checkout (2026-10-28)

- **`release/0.2`** was created at `fd9e406` (`v0.2.0-alpha.58^{commit}`) and pushed. It carries version
  `0.2.0-alpha.58` and the `alpha` channel. `main` stays checked out and continues as the 0.3 line.
- **`/Users/alissonvale/Code/mirror-ts`** was cloned from `origin/main` at `dd5bed9b` (`mirror-mind`
  0.37.0, `engines.node >=24`, no `exports`). It holds the tags `v0.37.0` and
  `cv22-last-python-bearing`. No `npm install`, `npm ci` or `npm link` was run, nothing from it was
  executed, and no `mirror` is on `PATH`.
- **Production was checked afterwards, read-only.** The database is still at
  `016_builder_workbench_display_codes`, and the production checkout's only differences are four
  untracked files that predate this work.

## Phase 0 Plan — Freeze and Separate

> **Names, 2026-10-28.** The Navigator chose *Mirror Desktop TS*. Read every `.next` below as `.ts`,
> *Mirror Desktop Next* as *Mirror Desktop TS*, and `/next/` as `/ts/`. What was built is recorded in
> **Phase 0 Built** at the end of this file.

**Outcome.** The 0.3 line has its own identity, data and update channel, and the release route cannot
deliver a 0.3 build to an app on the 0.2 line. No 0.3 feature is built and nothing is published.

### Measured before planning

- **Every previous version gets a manifest.** `deriveRetainedVersions` writes one for every tag below
  the released version, which is 172 URLs at alpha.58, under the base URL taken from the line's
  updater configuration (`deriveBaseUrlFromUpdaterConfig`). So:
  - a 0.3 release under the `alpha` base would be offered to production;
  - under its own base, the 0.2 apps, which poll `/alpha/`, never see it;
  - a future `release/0.2` alpha.59 retains only lower versions, so it never covers 0.3.
- **Identity is enforced at launch.** `RuntimeChannel::validate_app_identity` requires the bundle
  identifier and the app-data folder name to match the channel's identifier.
  - Today the User and Evaluation channels are `ai.mirrormind.desktop`, which is production's data
    folder, and Development is `ai.mirrormind.desktop.dev`.
  - A 0.3 build under either identifier would run on 0.2 data.
- **The release preflight needs a Python Mirror.** `private_alpha_preflight.mjs` requires
  `src/memory` and a `pyproject.toml` under `--mirror-root`. A 0.3 release cannot pass it as it is.
  This is recorded for phase 2, not changed here.

### Scope

1. **A 0.3 identity, used only on `main`:**
   - user: `ai.mirrormind.desktop.next`, product name *Mirror Desktop Next*;
   - development: `ai.mirrormind.desktop.next.dev`, product name *Mirror Desktop Next Dev*.

   `RuntimeChannel` maps each channel to the new identifiers, so 0.3 never opens
   `ai.mirrormind.desktop` or `ai.mirrormind.desktop.dev`, and the existing launch-time identity check
   becomes the enforcement.
2. **A 0.3 update channel:** `https://updates.mirrormind.sh/mirror-desktop/next/{{target}}/{{current_version}}/latest.json`,
   in a new updater configuration that replaces `tauri.alpha-update.conf.json` on `main`. `release/0.2`
   keeps the current file unchanged.
3. **A version line:** `main` moves to `0.3.0-alpha.0`, which is never published, and its first
   release will be `0.3.0-alpha.1`.
4. **A line guard in the release route.** `release:deploy` refuses with a named error if:
   - a `0.3.*` version targets a base URL ending in `/alpha`;
   - a `0.2.*` version targets any other base URL;
   - the bundle identifier and the version line disagree.

   It runs at **prepare** and again at **publish**.
5. **A guard against `release/0.2` drift.** A test on `main` asserts that the 0.2 identifiers and the
   `/alpha` endpoint appear nowhere in 0.3 configuration or channel code, outside the guard's own
   refusal table. The census size is asserted.

### Files

- `src-tauri/tauri.conf.json` and `src-tauri/tauri.dev.conf.json`: identifiers and product names.
- `src-tauri/tauri.eval.conf.json`: the identifier, or retire the file. See open question 2.
- `src-tauri/tauri.next-update.conf.json`, which is new, and `src-tauri/tauri.alpha-update.conf.json`,
  which is removed on `main` only.
- `src-tauri/src/runtime_channel.rs`: the identifier mapping and its tests.
- `scripts/release_deploy.mjs`, `scripts/alpha_build.mjs` and `scripts/self_update_preflight.mjs`:
  the updater file name and the line guard.
- The version files, using the usual five-file, six-occurrence bump.
- Tests: Rust in `runtime_channel.rs`, and a new `src/tests/cv010LineSeparation.test.ts` for the route
  guard and the census.

### Acceptance

- A `main` build launches as *Mirror Desktop Next* with app data in `ai.mirrormind.desktop.next`, and
  refuses to start against the 0.2 data folders. The Development build does the same.
- `release:deploy prepare` on `main` refuses to target `/alpha`. Run as a dry check against
  `release/0.2`'s configuration, it refuses a 0.3 version, and the reverse holds too. Each refusal
  names the line and the channel.
- `release/0.2` is byte-identical to `v0.2.0-alpha.58`. Nothing in phase 0 commits to it.
- Production and its data are untouched. Verify by hash and by the migration table afterwards.

### Validation

TDD: the route guard and the identifier mapping go red first. All gates must pass: vitest, tsc, build,
cargo and roadmap. Navigator check: launch the 0.3 Development build and confirm it opens to an
unbound first screen with its own data. The 0.2 Development data the Navigator used for the DS-001
validation must still be there, untouched.

### Exclusions

- Publishing anything. The first `0.3.0-alpha.1` comes after phase 2, when it has something to run.
- Configuring the server for the `/next/` path. That is a release-time act and needs the Navigator's
  word.
- Removing the Python Core path from `main`. That is phase 2's first slice, and it is deliberately not
  mixed into the identity change.
- Any Mirror Core change.

### Open questions for the Navigator

1. ~~**Names.**~~ **Answered:** *Mirror Desktop TS*. ~~*Mirror Desktop Next* and `.next` are a proposal. *Mirror Desktop 0.3* reads like a
   version. The product name is shown in the Dock and in Finder.~~
2. ~~**The Evaluation channel.**~~ **Answered:** moves to the 0.3 identity. ~~It shares `ai.mirrormind.desktop` today. Should it move to the 0.3
   identity or be retired on `main`?~~
3. ~~**Signing.**~~ **Answered: yes**, the 0.3 line is signed first. ~~When CV-009 lands, should the 0.3 line be the first one signed? That would make sense,
   since new users reach it first.~~

## Phase 0 Built (2026-10-28)

Built on `main` with TDD. Nothing was published, the update server was not touched, and `release/0.2`
is still `fd9e406`, the alpha.58 commit.

### What changed

- **Identity.**
  - User and Evaluation channels: `ai.mirrormind.desktop.ts`, named *Mirror Desktop TS* and
    *Mirror Desktop TS Eval*.
  - Development: `ai.mirrormind.desktop.ts.dev`, named *Mirror Desktop TS Dev*.
  - These live in `RuntimeChannel`, the three Tauri configurations, the channel launcher and the
    frontend's diagnostic parser. The sidebar brand reads *Mirror Desktop TS*.
- **Channel.** `src-tauri/tauri.ts-update.conf.json` polls `/mirror-desktop/ts/`.
  `tauri.alpha-update.conf.json` is gone from `main`; it remains on `release/0.2`. The signing key is
  shared: the key proves authorship, and the channel path keeps the lines apart.
- **One table of lines.** `scripts/release_line.mjs` names both lines: version prefix, product name,
  identifier and base URL. It is the only file on `main` allowed to name the 0.2 line.
  `assertReleaseLine` runs inside `deployContext`, which both `prepare` and `publish` call, and refuses:
  - a version on the other line's channel;
  - a bundle identifier or product name of the other line;
  - a version of no line.
- **The route itself.**
  - `deriveRetainedVersions` keeps only the released version's own line. Without this, a 0.3 release
    would have written 172 manifests for 0.2 versions under `/ts/`.
  - `evidenceSlug` keeps `alpha-N` for 0.2 only, so `0.3.0-alpha.1` cannot overwrite
    `docs/update/alpha-1-*`.
  - `alpha_build`, `private_update_publish`, `self_update_preflight` and `promote_production` read the
    line instead of literals. **Promotion from `main` now installs `/Applications/Mirror Desktop TS.app`.**
    It previously targeted the 0.2 app's path, so promoting from `main` would have replaced
    production's app.
- **Version.** `0.3.0-alpha.0`, never to be published.

### Evidence

- **Gates.**
  - vitest: 275 files, 2,306 tests (baseline 274 / 2,288, plus 18 new);
  - tsc: clean;
  - frontend build: passes;
  - cargo `--locked`: 383 passed, 3 ignored (baseline 382, plus 1 new);
  - roadmap: READY;
  - `alpha:channel:check`: READY as *Mirror Desktop TS* / `ai.mirrormind.desktop.ts` / `0.3.0-alpha.0`.
- **Six mutations, each caught.** Removing the channel check, removing the identifier check,
  retaining other lines, removing the guard call from the route, letting the frontend accept the 0.2
  identifier, and giving Evaluation the 0.2 identifier in Rust each failed at least one test. Every file
  was restored and re-run green.
- **Census.** `src/tests/cv010LineSeparation.test.mjs` scans 14 files: configurations, channel code,
  and release scripts, with Rust test modules excluded. It finds no 0.2 identifier, no `/alpha`
  endpoint, and no 0.2 bundle name. A negative control proves the patterns would match planted 0.2
  strings and would leave the TS ones alone. The census found one hit of my own during the build, a
  comment naming the 0.2 app's path, and it was reworded.
- **Production, read afterwards:**
  - binary `303ede287de3…` unchanged;
  - database at `016_builder_workbench_display_codes`;
  - `ai.mirrormind.desktop`: 567 files, tree hash `80d147223232`;
  - `ai.mirrormind.desktop.dev`: 141 files, tree hash `5e4b4298cf60`;
  - `ai.mirrormind.desktop.ts` and `.ts.dev`: not yet created.

  The tree hash is SHA-256 over sorted `path size mtime`. The 0.2 Development folder is the baseline
  for the Navigator check.
- **One unrelated flaky test** surfaced during the gates and was captured as
  [CR164](../../../refinement/rs025-legible-endings-for-a-turn-that-ends-badly/cr164-the-hung-append-test-races-its-own-stderr.md).

### Commits, and a boundary error

The intended split was the code in one commit and the record in another. A failed `git add` (a
pathspec for the already-renamed overlay) left only the staged rename for the first commit, so:

- **`89d721d`** carries the phase 0 *code* message but contains **only** the rename
  `tauri.alpha-update.conf.json → tauri.ts-update.conf.json`. On its own that commit does not build,
  because `package.json` still names the old file. Do not bisect onto it.
- **`3577a21`** carries the *record* message but contains **everything else**: the code, the tests and
  the documents.

Both were pushed before the error was seen. History was not rewritten, because that needs the
Navigator's word. The tree at `3577a21` is the one every gate above verified.

### Found at the Navigator check: a fresh install opened to a black window

The first launch of *Mirror Desktop TS Dev* showed a black window. The cause predates phase 0:

- With no selected Journey, the effect that restores the visible Composer draft called
  `conversationDraftKey("")`.
- That call throws, and React unmounted the whole tree.
- The line has been in `App.tsx` since alpha.8. No install ever reached it before, because every
  existing install has a selected Journey. The retired DS-001 fixture, a fresh macOS account, is the
  test that would have found it.

**How it was established.** The black screen was reproduced in a browser with a simulated Tauri bridge,
and the stack trace pointed at `conversationDraftKey`. A guarded probe rendered the first-run screen.

**The fix.**

- `visibleComposerDraftKey` returns no key when no Journey is selected, and still throws for a
  malformed one.
- The effect uses it.
- The first-run screens now say *Mirror Desktop TS*.
- `src/tests/cv010FreshInstallLaunch.test.ts` has 5 tests. They were red first, then green, and a
  mutation that restores the old call is caught.

**After the fix.** The same simulation renders the first-run screen. Gates: vitest 276 files and 2,311
tests, tsc clean, build passing.

0.2 very probably carries the same defect, and the public download is 0.2. It is candidate B1 in
[the backport candidates](../release-0-2-backport-candidates.md).

### Still owed, and known gaps

- **Navigator check.** Launch `npm run tauri:dev`. It should open as *Mirror Desktop TS Dev*, unbound,
  creating `ai.mirrormind.desktop.ts.dev`. The 0.2 folders' file counts and tree hashes above must not
  change. **Do not use *Find my Mirror* in the TS build**: it would bind the 0.3 app to the production
  Python Mirror through the 0.2 binding flow. The guard that forbids that is condition (b), in phase 2.
- **The site's download alias** (`/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg`) is
  the 0.2 line's. New users reach 0.3 only once the site points at a `/ts/` alias. That belongs to the
  site's Journey, and it is due before the first 0.3 release is offered.
- **Icons.** *Mirror Desktop TS* uses the production icon, and *Mirror Desktop TS Dev* uses the same DEV
  icon as the 0.2 Development app. Only the names tell them apart in the Dock.
- **The release preflight still requires a Python Mirror**, so `release:deploy` cannot prepare a 0.3
  release yet. That is phase 2's first slice.
- **The server path `/mirror-desktop/ts/`** does not exist yet. Creating it is a release-time act, done
  only with the Navigator's word.

## Phase 0 Accepted (2026-10-28)

The Navigator launched `npm run tauri:dev` after the black-window fix. The window opened as *Mirror
Desktop TS Dev* on the first-run screen, labelled *Mirror Desktop TS*. It showed the discovery preview,
which in a Development build never connects a discovered Mirror.

Read afterwards:

- **0.2 Development app data:** `ai.mirrormind.desktop.dev`, 141 files, tree hash `5e4b4298cf60`.
  This is the same as the baseline.
- **0.3 Development app data:** `ai.mirrormind.desktop.ts.dev` holds 3 files
  (`journey-preferences.json`, `whats-new-state.v1.json`, `window-geometry.json`) and no binding.
- **Production:** binary `303ede287de3…`, database at `016_builder_workbench_display_codes`.
- **Production app data:** `ai.mirrormind.desktop` changed, but only in files of this conversation:
  the `mirror-desktop` Journey's journal, drafts and Pi session, written by the production app itself.

**The preview read the production Mirror.** The discovery is read-only and the Development build
cannot connect from it, but the TS build still looks at the Python Mirror. Phase 2's condition (b)
guard will replace this flow.

## Phase 1 Plan — Slice 1a: Inspect a Home Without Migrating (2026-10-28)

### Measured before planning

All measurements were run in `/Users/alissonvale/Code/mirror-ts` at `dd5bed9b` (0.37.0). `npm ci
--ignore-scripts` was run locally, without `-g` and without `link`. Every command ran with
`MIRROR_HOME`, `MIRROR_USER`, `DB_PATH`, `MEMORY_DIR`, `MEMORY_PROD_DIR` and `MEMORY_ENV` unset, and
with `HOME` and `TMPDIR` in `/tmp/mirror-ts-sandbox`.

That isolation matters because **the Navigator's shell exports `MIRROR_HOME` and `MIRROR_USER` for
production**. Any Core process started from that shell without isolation would resolve to production
and migrate it.

- **Core baseline:**
  - typecheck is clean;
  - `npm test` has 3,527 tests: 3,525 pass, 1 is skipped and 1 fails;
  - production stayed at migration 016 throughout.
- **The one failure** is `ts/test/runtime/diagnose.test.ts`, "the two cores describe a broken index".
  It pins that `node:sqlite` refuses to write an FTS5 shadow table, and this machine's Node v24.6.0
  allows it. This is driver behaviour, not Core logic, and it is not this slice's to fix. **It is an
  input to phase 2:** the pinned Node that Desktop bundles must be one where that refusal holds,
  because the refusal is a safety property.
- **Migration machinery.** `ts/src/db/migrateOnOpen.ts` already computes everything a report needs:
  `appliedMigrationIds`, `pendingMigrations` and `unknownMigrations`, against `KNOWN_MIGRATION_IDS`.
  It has three verdicts: `applied`, `nothing_pending` and `declined`. All of it is private, and the
  only public path, `ensureMigratedOnOpen`, applies what is pending.
- **How the package runs.** Core is TypeScript run directly by Node. Node refuses to strip types under
  `node_modules`, so every bin goes through `bin/loader.js`, which registers a load hook for `.ts` files
  under the package root. **A library entry needs the same hook, registered before any `.ts` module
  loads.** A static `export * from "./x.ts"` is resolved before the entry's body runs. The entry has to
  register the hook and then use a dynamic `import()`, with explicit named re-exports.
- **No package-name imports.** Nothing in Core imports `mirror-mind/...`, so adding `exports` does not
  break an internal path. `./package.json` should still be exported, for tools that read it.
- **A read-only open is not free of files.** On a WAL database, `new DatabaseSync(path, { readOnly:
  true })` leaves the `memory.db` bytes unchanged. It does, though, create `memory.db-shm` and an empty
  `memory.db-wal`, and it leaves them there. Any SQLite reader does the same, Python included.
- **An isolated packaging smoke already exists.** `scripts/smoke_npm_package.sh` packs, installs into a
  scratch prefix with a scratch `HOME`, and stubs Python. The library import check can follow it.

### Scope

1. **A report that never migrates.** Add `inspectMigrationState(dbPath)` in Core. It takes an explicit
   path and reads no environment variable. It returns one of five states, with the lists behind it:
   - `missing`: no file;
   - `not_mirror`: no `_migrations` table;
   - `current`;
   - `pending`: known migrations not applied, in order;
   - `ahead`: the database has migrations this Core does not know.

   It also returns `applied`, `pending`, `unknown` and the Core version.
2. **One source of truth.** `ensureMigratedOnOpen` and the report share the same private functions, so
   the report can never disagree with what an open would do.
3. **A library entry.** `lib/desktop.js` registers the type-stripping hook, shared with
   `bin/loader.js` and registered once, and then re-exports `inspectMigrationState` and
   `DESKTOP_API_VERSION = 1` by name. `package.json` gains:
   - `"exports": { "./desktop": "./lib/desktop.js", "./package.json": "./package.json" }`;
   - `lib` in `files`.

### Files (Core)

- `ts/src/db/migrateOnOpen.ts`: share the functions, no behaviour change.
- `ts/src/db/migrationReport.ts` (new): the report.
- `bin/loader.js`: export the hook registration.
- `lib/desktop.js` (new), `package.json`.
- `ts/test/db/migrationReport.test.ts` (new).
- A library-import smoke beside `scripts/smoke_npm_package.sh`.
- A Core roadmap entry and release note, in Core's own form.

### Acceptance

- **Each state is reported correctly**, on fixtures for all five. `pending` uses a Python-era database
  at 016, which must report `017` and `018` pending, in order.
- **The report writes nothing:**
  - the database file's hash and the `_migrations` rows are unchanged;
  - no `backups/` directory, pre-migration snapshot or bootstrap lock appears.

  `-wal` and `-shm` files may appear on a WAL database, as measured. The test asserts exactly that
  and nothing more.
- **The report ignores the environment.** With `MIRROR_HOME` pointing at a canary home, the canary is
  untouched.
- **`ensureMigratedOnOpen` is unchanged.** Every existing test stays green.
- **The import works from an installed package.** A tarball installed into a scratch project's
  `node_modules` imports `inspectMigrationState` from `mirror-mind/desktop` on Node 24, with no flags.
- **Mutation controls.** Each of these makes a test fail:
  - making the report call `ensureMigratedOnOpen`;
  - dropping the hook registration from `lib/desktop.js`;
  - reading `MIRROR_HOME`.

### Validation

These are Core's own gates, run under the isolation above:

- typecheck;
- `npm test`, against the baseline 3,525 / 1 / 1;
- `npm run lint`;
- the new smoke.

Production's `_migrations` is read before and after, and must stay at 016.

### Exclusions

- No Desktop change. Phase 2 consumes this.
- No Core release. Publishing goes through Mirror's own release path, at the Navigator's word.
- No other library functions. Creating a Conversation, append, rename, rebind, Journey reads, and
  `init`/`seed` are later slices, each planned in full.
- No fix for the diagnose test.
- **Never run against `~/.mirror-minds/alisson-vale`.**

### Boundaries needing the Navigator's word

1. **A branch in `mirror-ts`.** Proposed: `desktop/library-seam-1a`, from `main` at `dd5bed9b`.
2. **A home in Core's roadmap.** Core plans work as CVs and Delivery Stories, governed by Ariad on the
   `mirror` Journey. This slice needs a place there: either a new Core CV, *Embeddable Core for Mirror
   Desktop*, or a Delivery Story under an existing one. Writing to Core's roadmap is a mutation of
   another Journey's planning, so it waits for the Navigator to name the target.

## Phase 1 Slice 1a Built (2026-10-28)

The Navigator authorized both boundaries: the branch `desktop/library-seam-1a` in `mirror-ts`, and
a new Core Capability Value, **CV24 · Embeddable Core for Mirror Desktop**. This slice is Core's
CV24.DS1. Core's own record is
`docs/project/roadmap/cv24-embeddable-core-for-mirror-desktop/cv24-ds1-inspect-a-home-without-migrating/index.md`
in `mirror-ts`.

### What exists now

- **`inspectMigrationState(dbPath)`** returns `missing`, `not_mirror`, `current`, `pending` or
  `ahead`, with the applied, pending and unknown ids and the core's version.
  - It never migrates, backs up or locks.
  - It never reads `MIRROR_HOME`.
  - Its readers are the same ones `ensureMigratedOnOpen` uses.
- **`mirror-mind/desktop`** is importable by package name from `node_modules`, with no Node flags.
  - It exposes exactly `inspectMigrationState` and `DESKTOP_API_VERSION = 1`.
  - Deep imports are closed by `exports`.
  - The host's warning listeners are left alone.

### Evidence

- **New tests.** 13 in all, 10 for the report and 3 for the entry. The report's tests were red
  first.
- **Four mutations, each caught:**
  - the report migrating;
  - the entry skipping the hook;
  - the report following `MIRROR_HOME`;
  - the warning filter running at import.
- **Core gates:**
  - typecheck: clean;
  - lint: clean, apart from 1 warning that was already in the baseline;
  - `npm test`: 3,538 passed, 1 skipped and 1 failing, the same diagnose failure as the baseline.
- **Package smoke.** Step 7, new, imports the entry from the installed tarball. All 81 checks
  passed. The smoke also fails, as it should, when the hook registration is removed.
- **Production.** Every run was isolated, and the production ledger stayed at
  `016_builder_workbench_display_codes` throughout.

### Commits in `mirror-ts`

- `6f427603`: the code.
- `16ff6f2e`: CV24 and DS1 in Core's roadmap.

Both are local only. The branch has not been pushed to `mirror-mind-ai/mirror`.

### For phase 2

- **The Node pin.** The Node that Desktop bundles must refuse writes to FTS5 shadow tables. Node
  v24.6.0 does not refuse them, which is the cause of the baseline diagnose failure.
- **Leftover files.** A read-only report on a WAL database leaves `-wal` and `-shm` files. Desktop
  must not read their appearance as a change to the home.

## Phase 1 Slice 1b Planned (2026-10-28)

The branch `desktop/library-seam-1a` was pushed to `mirror-mind-ai/mirror`. Core's `Tests` workflow
runs on push only for `main`, `claude/**` and `mirror-ts-core`, so it was dispatched by hand on the
branch (run `40763456322`). No pull request was opened.

**CI result:** success on `16ff6f2e`, DS1's code commit, across four jobs: `ts` on macOS and on
Ubuntu, `smoke`, and `windows-install-kind`. The `diagnose` test that fails locally passed in CI. That
confirms it is a property of this machine's Node v24.6.0, which matters for phase 2's Node pin. The
plan commit `5e81b81f`, which changes docs only, came after the run.

Slice 1b is Core's **CV24.DS2 · Conversations as Calls**, planned in full in `mirror-ts` at
`docs/project/roadmap/cv24-embeddable-core-for-mirror-desktop/cv24-ds2-conversations-as-calls/index.md`.
It covers four calls: ensure a Conversation, append, rename and rebind its Journey. They replace
`provision_mirror_conversation.py`, the `conversations append` CLI, and the rename and rebind
operations of `mirror_conversation_catalog.py`. Their logic is already ported in Core.

**One decision is open: write custody.** Core snapshots the whole database before every live CLI
write.

- **Measured:** on a copy of the production home (108 MB), the snapshot took **920, 900 and 913 ms**.
  The copy was made read-only through SQLite's backup API and deleted afterwards.
- **What that means:** Desktop writes on every turn, so a per-write snapshot would add about 0.9 s,
  plus a 108 MB disk write, to each one.
- **Recommendation:** the narrowed handle that Core already uses for its other long-lived writer, the
  MCP server. It is a handle that can form only the statements these four calls need, so destructive
  writes are unreachable rather than undone.

## Phase 1 Slice 1b Built (2026-10-28)

The Navigator chose **option B**, a narrowed handle, for write custody. Core recorded it as the
decision "A host's Conversation writes are narrowed, not snapshotted" (`d1a3104f`) before any code
was written. The slice is Core's CV24.DS2 (`0362d215`). Core's own record, with the full evidence,
is `cv24-ds2-conversations-as-calls/index.md` in `mirror-ts`.

### What Desktop gains

`mirror-mind/desktop` now exports four calls, which replace Desktop's Python and CLI routes for
Conversations:

| Call | Replaces |
|---|---|
| `ensureConversation` | `provision_mirror_conversation.py` |
| `appendConversationMessages` | the `conversations append` CLI. Its receipts are the CLI's, byte for byte. |
| `renameConversation` | the catalog script's rename |
| `rebindConversationJourney` | the catalog script's `rebind-journey` |

It also exports `DatabaseNotCurrentError` and `ConversationCallRejectedError`.

Each call refuses a home that is not `current`, never migrates and never snapshots. Each writes
through a handle that cannot delete, alter the schema, or touch any table other than
`conversations`, `messages` and `runtime_sessions`.

### Evidence

- **Tests:** 14 new tests in Core, each file red first.
- **Mutations:** four, each caught. They were: skipping the `current` check, allowing `DELETE`,
  routing through the per-write snapshot, and accepting an id prefix.
- **Core gates:**
  - typecheck: clean;
  - lint: clean, apart from the baseline warning;
  - `npm test`: 3,552 tests pass;
  - package smoke: 85 of 85, including the four calls run from the installed tarball.
- **Core CI:** green on `0362d215` across all four jobs (run `40767136231`).
- **Production:** it stayed at migration 016 throughout.

### Gaps phase 2 inherits

- **Catalog listing, inspection and delete** are not yet calls.
  - Listing and inspection are reads, which belong to DS3.
  - Delete is destructive, so it needs its own story and decision.
- **Recall** is still a CLI route.

## Phase 1 Slice 1c Planned (2026-10-28)

Slice 1c is Core's **CV24.DS3 · Journey Reads**, planned in `mirror-ts` (`4cc68dd7`) at
`docs/project/roadmap/cv24-embeddable-core-for-mirror-desktop/cv24-ds3-journey-reads/index.md`. It
has three read-only calls:

- `readJourneyTree`, which replaces `journey export-registry`;
- `listJourneyConversations`, which replaces the catalog script's `catalog`;
- `inspectConversation`, which replaces its `inspect`.

**The tree is a new contract, not a revival.** Core retired `journey export-registry`, and its cutoff
says that a new consumer gets "a new contract with a named consumer". So it returns no
`sourceVersion`, which existed only for the retired `journey mutate`. The Rust registry validator in
0.3 will therefore need to change in phase 2.

**The finding that shaped it: the sidebar order.** The TS core does not read `sibling_position`
anywhere. In production, read-only, **65 of 81 Journeys carry it**, written by Desktop's Journey
ordering. A tree in the core's existing order (active first, then by name) would have reordered the
Navigator's sidebar at migration. The plan has the read honour the stored order, as the removed
export did.

Unlike the export, malformed data does not fail the whole read. Each fallback is reported as a
named `finding`, because an empty sidebar would be worse than a named fallback.

**Parity check, planned.** The installed Python 0.31.14 and `readJourneyTree` both read a **scratch
copy** of the production home, and their trees must be equal. Only counts and a hash are recorded,
and no production data enters Core's repository.

**A gap this leaves for 0.3:** nothing can write `sibling_position` any more. Reordering Journeys in
0.3 waits for Journey administration, which 0.3 does not carry at first.

## Phase 1 Slice 1c Built (2026-10-28)

Slice 1c is Core's CV24.DS3, built in `84fd5eff` and `036de549`. Core's record, with the full
evidence, is `cv24-ds3-journey-reads/index.md` in `mirror-ts`.

### What Desktop gains

`mirror-mind/desktop` now exports three read-only calls. Each refuses a home that is not `current`:

| Call | Replaces |
|---|---|
| `readJourneyTree` | `journey export-registry`, which Core retired |
| `listJourneyConversations` | the catalog script's `catalog` |
| `inspectConversation`, by exact id | the catalog script's `inspect` |

The entry now exposes 11 names.

### The sidebar keeps its order

The tree reads `sibling_position`, which the TS core had never read. It was checked against the
installed Python export on scratch copies of the production home:

- 81 Journeys in 13 roots;
- the two trees are equal;
- no findings.

A name-ordered tree fails that comparison. During the check, the production home's file snapshot
was unchanged around the Python run. The copies were deleted afterwards.

### Evidence

- **Tests:** 15 new tests, each file red first.
- **Mutations:** four, each caught. They were: name order, throwing on a malformed order, a prefix in
  `inspectConversation`, and no `current` check.
- **Core gates:**
  - `npm test`: 3,567 tests pass;
  - package smoke: 87 of 87.
- **A CI miss, caught by CI.** The first Core CI run failed. My comments named the retired verb,
  which Core's sweep forbids, and the local run could not see this because the sweep reads only
  committed files. The comments were reworded, and no exemption was added. The rerun passed on all
  four jobs, after one macOS runner-allocation retry.
- **Production:** it stayed at migration 016.

### For phase 2

The 0.3 Rust registry validator expects `schemaVersion`, `source`, `syncedAt` and `sourceVersion`.
The new tree has none of them, so phase 2 replaces that validator rather than feeding it.

## Phase 1 Slice 1d Planned (2026-10-28)

Slice 1d is Core's **CV24.DS4 · Create a Home**, planned in `mirror-ts` (`8c123330`) at
`docs/project/roadmap/cv24-embeddable-core-for-mirror-desktop/cv24-ds4-create-a-home/index.md`.

`createHome({ homePath, userName })` does three things in one call: it copies the identity
templates, creates the database at the current schema, and seeds it. The home appears complete or
not at all. Phase 3's first-run assistant (DS-003) is its consumer.

**What planning found:**

- **The CLI's `init` rewires the whole machine.** When no user is configured, it writes
  `MIRROR_USER` into `~/.config/mirror/env`. Every `mirror` and `mirror-hook` process reads that
  file, including Pi's hooks. If Desktop created its home this way, it could silently redirect the
  Navigator's terminal Mirror to the new home.
- **The CLI's `seed` snapshots before writing.** On a database created a moment earlier, that
  snapshot protects nothing. And none of Core's sanctioned host handles may write the `identity`
  table.

**Two decisions are the Navigator's:**

1. **Seed custody.** The recommendation is to build the home in a staging directory beside the
   target, seed it there, check that it is `current`, and rename it into place. A failure leaves
   nothing behind.
2. **No global configuration.** The recommendation is that `createHome` writes nothing outside the
   home. Desktop keeps the home's path itself.

**Left to Desktop.** The 0.3 home marker (condition b) stays Desktop's to write after `createHome`
returns, because the core does not know Desktop.

## Phase 1 Slice 1d Built (2026-10-28)

The Navigator chose both recommendations. Core recorded them as one decision before any code
(`f172a534`): a host creates a home beside its target and renames it into place, writing nothing
outside it. The slice is Core's CV24.DS4 (`d6af9ba6`). Its record, with full evidence, is
`cv24-ds4-create-a-home/index.md` in `mirror-ts`.

### What Desktop gains

`createHome({ homePath, userName })` creates a complete, seeded home in one call. It also exports
`CreateHomeRejectedError`, whose reasons are `invalid_user_name`, `invalid_home_path`,
`home_exists`, `templates_unavailable` and `seed_failed`.

- **All or nothing.** The home is built in a 0700 staging directory beside the target. It is
  renamed into place only once the seed is clean and the database is `current`. A failure leaves
  nothing behind.
- **Nothing outside the home.** It never writes `~/.config/mirror/env`, so the Navigator's
  terminal Mirror and Pi hooks are never redirected. Phase 3 keeps the path in Desktop's own
  configuration and writes the 0.3 marker after `createHome` returns.
- **No existing home.** It refuses anything at the target, even an empty directory.

The entry now exposes 13 names.

### Evidence

- **Tests:** 6 new tests, red first.
- **CLI parity:** on a scratch `HOME`, `mirror init` plus `mirror seed` seed the same identity
  rows as `createHome`.
- **Four mutations, each caught.** They were: writing the global config, renaming before the seed
  check, accepting an empty directory, and skipping the name check.
- **The danger, shown.** The global-config mutation did write `MIRROR_USER=ana` into the scratch
  `HOME` of the isolated test run, which is exactly what the decision forbids. The real `HOME` has
  no `~/.config/mirror`. The file was removed, and the restored code writes nothing.
- **Core gates:**
  - `npm test`: 3,573 passed;
  - package smoke: 90 of 90, including the machine-wide config staying byte-identical.
- **Core CI:** green on `9bfa202d` across all four jobs, first attempt (run `40778091305`).
- **Production:** it stayed at migration 016.

## Phase 1 Slice 1e Planned (2026-10-28)

Slice 1e is Core's **CV24.DS5 · Migrate on Request**, planned in `mirror-ts` (`3d21249c`) at
`docs/project/roadmap/cv24-embeddable-core-for-mirror-desktop/cv24-ds5-migrate-on-request/index.md`.
It is the last piece of phase 1.

The call is `migrateHome(dbPath, { expectedPending })`. It applies exactly the pending migrations the
person was shown, and refuses if that list has changed since they were shown it. **Phase 5 will run
this call against the Navigator's production home.**

**What planning found in Core's existing migration backup:**

- **One fixed name, overwritten.** Each migration replaces `backups/frontdoor-pre-migration-backup.db`,
  so the next migration destroys the previous pre-image.
- **Never verified.** It has no `quick_check`, no hash and no WAL preparation, even though Core has
  `prepareArchiveSnapshot` for exactly this, which the backup path does not call.

**Awaiting the Navigator: backup custody.** The recommendation is a backup that is:

- uniquely named and never overwritten;
- verified (WAL, `quick_check`, SHA-256, and confirmed to read the same pending list as the live
  home);
- retained by the core.

Nothing migrates unless that backup is verified. Restoring from a backup is excluded: it is
destructive, so it gets its own story and decision before phase 5's rehearsal.
