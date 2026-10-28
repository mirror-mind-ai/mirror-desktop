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
