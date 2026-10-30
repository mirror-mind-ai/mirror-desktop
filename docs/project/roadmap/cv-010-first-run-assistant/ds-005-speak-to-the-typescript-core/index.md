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
| 1 · A library seam in Core | 🟠 Implemented | All five slices (CV24.DS1–DS5) are built on `mirror-ts` branch `desktop/library-seam-1a`, with Core CI green on `c7b4bf40`. Owed for Done: merge into Core `main` and a Core release, each at the Navigator's word. |
| 2 · The embedded host | ✅ Done | — (Navigator check of a packaged build passed 2026-10-29) |
| 3 · The first-run assistant on 0.3 | 🟡 Planned | Four slices (3a–3d), planned 2026-10-29; all five decisions accepted, decision 1 revised to `~/Mirror Homes`. 3a and 3a-2 (state per home) built and checked by the Navigator; 3b (install Pi) built and checked by the Navigator. 3c–3d to do. |
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
- ~~**The release preflight needs a Python Mirror.** `private_alpha_preflight.mjs` requires
  `src/memory` and a `pyproject.toml` under `--mirror-root`. A 0.3 release cannot pass it as it is.
  This is recorded for phase 2, not changed here.~~ Replaced in slice 2f-1: the preflight checks
  the pinned host.

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

## Phase 1 Slice 1e Built, and Phase 1 Implemented (2026-10-28)

The Navigator chose the verified, retained backup. Core recorded it as a decision before any code
(`bf6b46b5`). The slice is Core's CV24.DS5 (`0716f81e`), and its full evidence is in
`cv24-ds5-migrate-on-request/index.md` in `mirror-ts`.

### What Desktop gains

`migrateHome(dbPath, { expectedPending })` applies exactly the pending list the person was shown.
It refuses with one of four reasons: `nothing_pending`, `pending_changed`, `not_migratable` or
`backup_failed`. When it does migrate, it returns a receipt with:

- the applied ids;
- the backup's path, SHA-256 and size;
- the reports before and after.

Nothing migrates until the backup is verified. Each backup has its own name, is converted to WAL,
passes `quick_check`, is hashed, and is read by the migration report as the same pending list as the
live home. The core never deletes it.

This is the call phase 5 will run against the Navigator's production home.

### Evidence

- **Tests:** 8 new tests, red first, including a race between two processes that ends in one
  migration and one backup.
- **Mutations:** four, each caught. They were: ignoring `expectedPending`, skipping
  `quick_check`, the fixed backup name, and migrating before the backup is verified.
- **Core gates:**
  - `npm test`: 3,581 passed;
  - package smoke: 92 of 92.
- **Core CI:** green on `c7b4bf40` across all four jobs, first attempt (run `40781170008`).
- **Production:** it stayed at migration 016.

### Phase 1 as a whole

`mirror-mind/desktop` now carries 15 names:

| Area | Calls |
|---|---|
| Migration state | `inspectMigrationState`, `migrateHome` |
| Conversations | `ensureConversation`, `appendConversationMessages`, `renameConversation`, `rebindConversationJourney` |
| Reads | `readJourneyTree`, `listJourneyConversations`, `inspectConversation` |
| Home creation | `createHome` |
| Errors | `DatabaseNotCurrentError`, `ConversationCallRejectedError`, `CreateHomeRejectedError`, `MigrateHomeRejectedError` |
| Version | `DESKTOP_API_VERSION` |

Three Core decisions were taken by the Navigator along the way:

1. Conversation writes go through a narrowed handle.
2. A home is created beside its target and renamed into place, writing nothing outside it.
3. A home is migrated only behind a verified, retained backup.

**Owed for Done:**

- a merge into Core `main`;
- a Core release, at the Navigator's word.

**Left out of phase 1, each needing its own story and decision:**

- restoring from a backup, which phase 5's rehearsal needs;
- Conversation delete;
- re-seeding an existing home;
- recall;
- Journey administration, including writing `sibling_position`.

## Phase 2 Plan — The Embedded Host (2026-10-29)

### Outcome

A Mirror Desktop TS build runs every Mirror operation it carries through the TypeScript core it
ships with. It spawns no `uv` and no `python`, it opens only homes that carry the 0.3 marker, and
it never reaches `/Users/alissonvale/mirror` or `~/.mirror-minds/alisson-vale`.

### Measured before planning

- **Eight Python routes in the Rust code** (`src-tauri/src/main.rs`, outside tests):

  | Route | Today | In 0.3 |
  |---|---|---|
  | `provision_mirror_conversation` (line ~1978) | `uv run python scripts/provision_mirror_conversation.py` | `ensureConversation` |
  | `run_mirror_conversation_catalog`: `catalog`, `inspect` | `uv run python scripts/mirror_conversation_catalog.py` | `listJourneyConversations`, `inspectConversation` |
  | the same script: `rename`, `rebind-journey` | the same | `renameConversation`, `rebindConversationJourney` |
  | the same script: `delete` | the same | **not carried** (no library call, needs a decision) |
  | `run_explicit_mirror_append` (line ~7494, bounded by CR163) | `uv run python -m memory conversations append` | `appendConversationMessages`, same receipts |
  | `refresh_journey_registry` (line ~2306) | `… journey export-registry` | `readJourneyTree`, with a new Rust validator (no `sourceVersion`) |
  | Journey administration (line ~2366) | `… journey mutate` | **not carried** |
  | Canvas and altitude reads (line ~3247) | `… journey-projection inspect` | **not carried** |
  | Terminal recall (line ~1917) | a shell launcher running `… recall` | **not carried** |

- **The binding is Python-shaped.** `RuntimeChannelProfile` holds `mirror_root`, `uv_bin` and
  `db_path`. `runtime_command` allows only `pi` and `uv`, sets `cwd` to `mirror_root`, and exports
  `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH`.
- **The risk this plan must close.** Pi runs with `cwd` set to `mirror_root`. The production
  checkout's `.pi/extensions/mirror-logger.ts` spawns `uv run python` against `MIRROR_HOME`. A 0.3
  build that kept this shape would run the Python core, which is 0.31.14, against a 0.3 home at
  migration 018. Two calls already pass `--no-extensions`: provisioning and title suggestion. The
  turn path must be confirmed in slice 2e.
- **The Node pin.** Core CI ran on Node v24.21.0 (macOS) and v24.22.1 (Linux), and the
  FTS5 shadow-table refusal held on both. This machine's v24.6.0 lets the write through. The pin is
  therefore at least v24.21.0, and slice 2a measures the exact candidate.
- ~~**The release preflight** (`scripts/private_alpha_preflight.mjs`, `validateRuntimeCoordinates`)
  requires `pyproject.toml` under a Mirror root, so a 0.3 release cannot pass it today.~~ Replaced
  in slice 2f-1.

### Slices

**2a · Runtime pin.**

- **Node.** Bundle an official Node 24 build (at least v24.21.0, `darwin-arm64` and
  `darwin-x64`) in the app's resources. Its download is verified against the release's
  `SHASUMS256.txt`.
- **Core.** Bundle the core as an `npm pack` tarball of `mirror-mind` at a recorded commit,
  installed into `resources/mirror-host/node_modules` at build time. The tarball's SHA-256 is
  recorded beside it.
- **The gate.** Core's `diagnose` test and the package smoke must pass on the pinned Node before
  the pin is accepted.
- **Signing (CV-009).** The bundled Node needs the hardened runtime with the JIT entitlement. That
  is named here and taken up when signing lands.

**2b · Host and RPC.**

- **The host.** `resources/mirror-host/host.mjs` imports `mirror-mind/desktop` and serves
  line-delimited JSON requests on stdio: `{id, method, params}` in, and
  `{id, ok, result | error: {name, reason, message}}` out.
  - Its method allowlist is exactly the library's calls.
  - Its first line is a handshake reporting `DESKTOP_API_VERSION`, the core version and the Node
    version. Desktop refuses to proceed on a mismatch.
- **The supervisor.** A new `src-tauri/src/mirror_host.rs` owns the host process:
  - it starts the host with a cleared environment, no `MIRROR_*` variable and `cwd` set to the
    host directory;
  - each request has a deadline (CR163's 30 s for append);
  - a request that times out kills the host's process group and restarts it, using the
    `bounded_child.rs` lessons;
  - restarts back off and are bounded, after which the app shows that the Mirror is unavailable;
  - requests are serialized, because the core is synchronous.

**2c · The home and its marker (condition b).**

- **The binding.** The 0.3 binding becomes `{schemaVersion: "2.0.0", homePath}`. `mirror_root`,
  `uv_bin`, `mirror_user` and `db_path` leave the 0.3 profile.
- **The marker.** A marked home has `<home>/.mirror-desktop/home.json`, holding
  `{line: "0.3", homeId, createdAt}`, written by Desktop after `createHome`.
- **The guard.** Both Rust and the host refuse to open a home without the marker, before any core
  call. The production home has no marker, so it is refused.
- **Development.** A script, `scripts/dev_ts_home.mjs`, creates a scratch home through the bundled
  host and marks it. It refuses any path under `~/.mirror-minds` and any existing path. The first-run
  creation flow itself is phase 3.
- **Discovery.** The Python discovery (DS-001) is disabled in TS builds, and the 0.3 setup screen
  asks for a marked home.

**2d · Transport swap.**

- **What moves.** Each carried route in the table becomes a host request, and the four Python
  scripts and `uv` calls leave the 0.3 build. Outbox, settlement and recovery keep their shape: only
  the call that delivers changes.
- **The registry.** `validate_journey_registry_payload` is replaced by a validator of
  `readJourneyTree`'s shape. Its `findings` are surfaced, never hidden.
- **What is not carried.** Delete, Journey administration, the Canvas and altitude reads, and
  recall each show plainly that they are not available in 0.3. None of them falls back to Python.

**2e · Pi isolation.**

- Pi's turns in 0.3 run with `cwd` set to the Journey or app directory, never a Mirror checkout.
- They carry no `MIRROR_*` variable and load no Mirror extension.
- The turn path is read and pinned by a test, like provisioning's `--no-extensions`.
- Mirror context injection returns in phase 3, through the host.

**2f · Release preflight without Python.**

- On `main` only, `validateRuntimeCoordinates` is replaced. The new check verifies the pinned Node
  version and hash, the core tarball's hash, the host handshake from the built app, and the marker
  guard.
- The `release/0.2` preflight is untouched.

### Acceptance

- **A TS Dev build on a scratch marked home** creates a Conversation, sends turns that settle into
  Mirror through `appendConversationMessages`, lists and inspects the Conversation, renames and
  rebinds it, and renders the Journey tree.
- **No interpreter.** `uv`, `python` and `python3` are shadowed by stubs that fail, as Core's smoke
  does. Nothing calls them, and an interpreter census of the built app's resources finds no Python
  script.
- **Refusals.** An unmarked home is refused, and so is the production home path, by test and by
  hand. Production is verified afterwards by binary hash, migration 016 and an unchanged file
  snapshot.
- **Supervision:**
  - a host killed mid-request restarts, and the request reports a named failure;
  - a hung request is killed at its deadline;
  - a version mismatch at handshake is refused.
- **Mutation controls.** Each of these fails a test:
  - dropping the marker check in Rust;
  - dropping it in the host;
  - letting `MIRROR_HOME` reach the host;
  - a method outside the allowlist;
  - Pi started with `cwd` at a Mirror checkout.
- **Gates.** vitest, tsc, build and cargo pass, the roadmap check reads READY, and the new preflight
  passes on a built app.

### Exclusions

- The first-run assistant and home creation in the UI (phase 3).
- Context injection into Pi (phase 3).
- Delete, Journey administration, Canvas, altitude and recall in 0.3.
- Any change to Core. A change the host needs goes back to CV24 as a story.
- Any release. `0.3.0-alpha.1` is published only at the Navigator's word.
- Production, its app data and `release/0.2`.

### Decisions for the Navigator

> **Answered 2026-10-29: all three recommendations.**
>
> 1. Desktop vendors a Core tarball packed from `desktop/library-seam-1a` at a recorded commit.
> 2. Node ships as an official, pinned binary, not a SEA.
> 3. The routes 0.3 does not carry say so plainly and never fall back to Python.

1. **How Desktop depends on Core during development.** Recommended: vendor a tarball packed from
   `desktop/library-seam-1a` at a recorded commit, now `c7b4bf40`. The contract is exercised by its
   real consumer before Core merges and releases it. The alternative is to merge and release Core
   first and depend on the registry, which freezes the contract before anything has used it.
2. **How Node ships.** Recommended: an official, pinned Node binary in the app's resources. Node SEA
   (a single binary) is not chosen. Its support for the loader hooks the core needs is unproven, and
   it would add a build step to every Core change.
3. **The routes not carried.** Recommended: delete, Journey administration, Canvas and altitude, and
   recall say plainly that they are not available in 0.3. They do not fall back to Python, because a
   fallback would break condition (b).

## Phase 2 Slice 2a Built — Runtime Pin (2026-10-29)

### What exists

- **`mirror-host/pin.json`** records the runtime:
  - **Node v24.22.2**, the newest LTS 24 release. Its macOS archives are pinned by SHA-256, copied
    from that release's `SHASUMS256.txt`:
    - `darwin-arm64`: `aa954934…`;
    - `darwin-x64`: `d5e336d5…`.
  - **The core,** `mirror-mind` 0.37.0, packed from Core commit `c7b4bf406e15…`
    (`desktop/library-seam-1a`). The tarball is vendored at
    `vendor/mirror-host/mirror-mind-0.37.0-c7b4bf40.tgz`, about 1 MB, with SHA-256 `bc9340de…`.
    `npm pack` gave the same hash twice, so the tarball is reproducible.
  - **`yaml` 2.9.0,** the core's only dependency. It is vendored too, checked against the sha512
    integrity in Core's own lockfile.
- **`scripts/mirror_host_pin.mjs`** has two commands.
  - **`verify`** checks the pin.
  - **`materialize`** builds `.mirror-host/runtime/<platform>/`, which is gitignored, all or
    nothing. It works in a staging directory beside the target, in this order:
    1. it verifies the Node archive's hash before extracting anything;
    2. it checks that the archive holds `node-v<version>-<platform>`;
    3. on the host platform, it checks that the binary reports the pinned version;
    4. it verifies the core tarball's hash and yaml's integrity, then lays out `node_modules`;
    5. it writes a `pin-receipt.json`;
    6. it renames the staging directory into place.

    An existing output is refused, unless `--replace` is given.
- **Not yet wired into the Tauri bundle.** That happens with the host, in slice 2b.

### Evidence

- **The pin's gate, on this machine,** with the materialized `darwin-x64` runtime and the same
  isolation as Core's runs:
  - Core's full suite on the pinned Node: **3,582 passed, 0 failed**, 1 skipped. That includes
    the `diagnose` FTS5 shadow-table test.
  - Control: the same test on the system Node, v24.6.0, still fails 1 of 10.
  - Core's package smoke on the pinned Node: 92 of 92.
- **End to end from the materialized runtime.** With an empty environment (`env -i`) and a scratch
  `HOME`, the pinned Node imported `mirror-mind/desktop`. It found API 1 with 15 names, created a
  home (20 entries seeded, state `current`), recorded a Conversation, and read a tree of 1 root with
  no findings. The scratch home was deleted afterwards.
- **`src/tests/cv010HostPin.test.mjs`**, 9 tests, red first on the missing module. It covers:
  - the pin;
  - the vendored hashes;
  - the floor;
  - a missing platform;
  - a malformed hash;
  - materialization from a fake official archive;
  - a hash mismatch, which leaves nothing;
  - an archive missing its directory;
  - a binary that reports another version;
  - an existing output;
  - the gitignore entry.
- **Mutations, each caught and then restored:**
  - skipping the Node hash check;
  - lowering the floor to 24.0.0;
  - accepting a missing platform;
  - skipping the extracted version check;
  - skipping the core tarball hash.

  The version-check mutation was **not caught at first**. The existing test failed earlier, on the
  archive's directory, and never reached the check. A test was added where the directory matches
  and the binary reports v24.6.0.
- **Production** stayed at migration 016 throughout.

### Known gaps

- **Unsigned hashes.** `SHASUMS256.txt` is signed by Node's releasers, but this machine has no
  `gpg`. The recorded hashes were therefore taken over HTTPS, not verified against the signature.
- **`darwin-arm64` is pinned but not exercised.** This machine is Intel, so that archive has never
  been downloaded or run here.
- **The pinned Node prints an ExperimentalWarning** on stderr when the core opens SQLite. The host
  in slice 2b owns its process and filters it.
- **Signing (CV-009).** The bundled Node needs the hardened runtime and the JIT entitlement.

## Phase 2 Slice 2b Built — Host and Supervisor (2026-10-29)

### What exists

- **`mirror-host/host.mjs`**, the host process. It imports `mirror-mind/desktop` from the runtime it
  is laid out in, and serves one JSON object per line on stdio.
  - **Handshake first:** `{type: "ready", hostProtocol: 1, desktopApiVersion, coreVersion, node,
    methods}`.
  - **Requests and responses:** `{id, method, params}` in, and `{id, ok, result}` or
    `{id, ok: false, error: {name, reason, message}}` out, in order.
  - **Methods:** exactly the library's ten calls, checked with `Object.hasOwn`, so `constructor`,
    `__proto__`, the error classes and `DESKTOP_API_VERSION` are all `unknown_method`.
  - **Refusals are named and the host keeps serving.** The four refusal errors keep their name, and
    the reason is the `state` or `reason` the core gives. A malformed line, or one past 1 MiB, is
    answered with `id: null`.
  - **Stdout carries the protocol only.** `console.log` goes to stderr, and the `node:sqlite`
    ExperimentalWarning is dropped.
  - **The host reads no environment variable,** and it exits 0 when stdin closes.
- **`scripts/mirror_host_pin.mjs`** gains `layoutHost`, which places `host.mjs` beside the core and
  `yaml`, with the host's SHA-256 in the receipt. `materialize` now uses it, so a runtime directory
  is `node/`, `host.mjs`, `node_modules/` and `pin-receipt.json`.
- **`src-tauri/src/mirror_host.rs`**, the supervisor (`MirrorHost`):
  - **Start.** It starts the host with an **empty environment**, `cwd` set to the host directory,
    and its own process group, and refuses a handshake whose protocol or Desktop API differs.
  - **Deadlines.** Each request has a deadline by method: 30 s for append (CR163's bound), 300 s
    for migrate, 60 s for create home, and 15 s otherwise.
  - **Failures.** On a timeout, an exit, a response to another id or an oversized line, it kills the
    **whole process group**, and the next request starts a fresh host.
  - **Restarts.** It backs off at 250 ms, 1 s and 3 s, and reports `Unavailable` after 3
    consecutive failures until `reset`. Any answer from a live host, a refusal included, clears
    the count.
  - **Lifetime.** It kills the host on drop.
  - **Not yet wired** into the app's routes. That is slice 2d.

### Evidence

- **Real chain.** The ignored Rust test `real_host_serves_the_library_through_the_supervisor` ran
  against the materialized runtime: the supervisor started pinned Node v24.22.2, which ran the host
  and the core. It created a scratch home, read it as `current`, recorded a Conversation, read the
  tree, and got `DatabaseNotCurrentError/missing` back as a named refusal, with one start.
- **`src/tests/cv010MirrorHost.test.mjs`**, 5 tests, red first. It runs the real host on the vendored
  core with an empty environment and covers:
  - the handshake;
  - all ten methods end to end on a scratch home;
  - the four refusal names;
  - six non-methods, malformed and oversized lines, with the host still serving;
  - the layout.
- **Rust tests:** 12 new, plus the ignored real-host test, using fake hosts in `sh` as CR163 did.
  They cover:
  - an empty environment, with `HOME` as the positive control;
  - `cwd`;
  - a refusal that keeps the host;
  - a hung request whose grandchild dies with the group;
  - a host that dies, with its stderr tail;
  - a wrong id, and a 9 MB line;
  - three bad handshakes, and a silent one;
  - backoff and the restart limit;
  - a missing runtime;
  - drop;
  - the deadlines.
- **Mutations: eight, each caught and then restored.**
  - In Rust:
    - inheriting the environment;
    - killing only the child, not the group;
    - removing the restart limit;
    - accepting any Desktop API;
    - not checking the response id.
  - In the host:
    - dispatching any exported function;
    - `in` instead of `Object.hasOwn`;
    - removing the warning filter.
- **Gates:**
  - vitest: 278 files, 2,325 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 395 passed, 4 ignored. The 4th ignored test is the real-host test, run by hand
    above. The two warnings were already there before this slice;
  - the pin verifies.
- **Production** stayed at migration 016.

### Moved, and why

- **Bundling the runtime into the app moves to 2f.** Tauri copies `resources` during every
  `cargo build`, so naming `.mirror-host/runtime/<platform>` in `tauri.conf.json` would break
  `cargo test` on any checkout that has not materialized the runtime. The bundle belongs to the
  release build, which 2f already changes.
- **Until 2f,** a TS Dev build will resolve the runtime from the repository's `.mirror-host/runtime`.
  That resolution arrives in 2d, together with its first caller.

## Phase 2 Slice 2c Built — The 0.3 Home and Its Marker (2026-10-29)

### What exists

- **The marker,** `<home>/.mirror-desktop/home.json`. It holds exactly
  `{line: "0.3", homeId, createdAt}`, is 0600 in a 0700 directory, and is at most 4 KB.
- **Two checks of it (condition b),** each before anything else happens:
  - **In the host,** `assertMarkedHome` in `mirror-host/host.mjs` runs before every method except
    `createHome`. It requires `dbPath` to be `<home>/memory.db`, absolute, with the home reached
    without any symlink and carrying a valid marker. A failure is answered as `HomeNotMarkedError`
    with the reason `unmarked` or `invalid_home`. This applies to the read-only report as well.
  - **In Rust,** `src-tauri/src/mirror_home.rs`. `MarkedHome::open` accepts only an absolute,
    canonical directory with a valid marker. `MirrorHost::request_for_home` checks the marker again
    on disk before every request, and refuses if the home now carries another home's id. It sets
    `dbPath` to the home's own database, whatever the caller passed. It refuses `createHome`, which
    names no existing home.
- **The 0.3 binding,** `runtime-home.v2.json`. It holds exactly `{schemaVersion: "2.0.0", homePath}`
  and is 0600. `load_home_binding` refuses:
  - a binding whose home lost its marker;
  - any other shape;
  - a binding file that is a symlink.
- **The Python Mirror is switched off on `main`.** `PYTHON_MIRROR_RETIRED` in `runtime_channel.rs`
  makes these refuse before anything else:
  - `RuntimeChannelProfile::active()`, which every Python route goes through;
  - `discover_existing_mirror`;
  - `validate_runtime_binding` and `save_runtime_binding`.

  The refusal reads "unbound", so the TS app opens on its setup screen and shows the reason. **The
  0.3 build no longer reads the production Mirror, even in the discovery preview.** That closes the
  gap phase 0's acceptance named. The Python code stays, unreachable, and leaves in 2d as each route
  moves to the host.
- **`scripts/dev_ts_home.mjs <absolute path> [--user <name>] [--bind]`** creates a home through the
  laid-out host (that is, with the pinned core), marks it, and checks that it is `current`. It
  refuses, before creating anything:
  - anything under `~/.mirror-minds`, checked both on the path as given and on the real path;
  - an existing path;
  - a relative path;
  - a missing parent;
  - a parent reached through a symlink.

  `--bind` writes the 0.3 binding into the TS Dev app data and never overwrites one.

### Moved, and why

**The setup screen that asks for a 0.3 home moves to 2d.** Saving a 0.3 binding now would carry the
app past its setup screen and into routes that still call the Python profile, which this slice
switches off. The binding becomes usable when 2d moves those routes to the host. Until then, the TS
Dev build stays on its setup screen, and that screen states why.

### Evidence

- **By hand, on this machine:**
  - `dev_ts_home.mjs` created a home in `/tmp`, marked it (`current`, core 0.37.0), and the home was
    then deleted.
  - Given `~/.mirror-minds/alisson-vale`, and then `~/.mirror-minds/nova-dev`, it refused both, and
    neither was created.
  - The production home's non-database files had the same hash before and after.
  - Production stayed at migration 016.
  - The TS Dev app data still holds only its three files, with no binding.
- **The real chain.** The ignored Rust test now shows, against the materialized runtime, that the
  real host refuses even the read-only report on an unmarked home. Once the home is marked, the
  report, a Conversation and the tree go through `request_for_home`.
- **Tests:**
  - host: 1 new test, and 3 updated to mark their homes. A macOS `tmpdir()` passes through `/var`, a
    symlink, and the check correctly refuses it;
  - `src/tests/cv010DevTsHome.test.mjs`: 5 new tests;
  - Rust: 7 in `mirror_home`, 3 for `request_for_home`, 1 for the Python switch-off, and 1 for the
    refusal order in the source.

  All of them were red first.
- **Mutations:** eight caught at first, and two that escaped and are now caught.
  - **In the host:**
    - removing the check;
    - accepting a symlink;
    - accepting line `0.2`.
  - **In Rust:**
    - not re-checking the marker;
    - switching the Python Mirror back on;
    - discovery without the refusal.
  - **Escaped, now caught:**
    - **Dropping one of the script's two `~/.mirror-minds` checks** passed, because the other still
      refuses. Dropping both is caught.
    - **Dropping the canonical-path comparison in `MarkedHome::open`** passed, because no test reached
      a home through a **symlinked parent**, the only case that comparison sees. A test was added,
      and the mutation is caught.
- **A 2b test that failed under load.** The oversized-response test gave its fake host 1.5 s to
  write 9 MB. In this slice's larger suite it timed out in 3 of 3 runs: a probe showed `TimedOut`,
  not a logic failure. Its deadline is now 30 s, because it tests the size bound, and 3 of 3 full
  runs pass. One limit remains: the test does not distinguish an oversized line from a line that is
  not JSON, since both are protocol errors.
- **Gates:**
  - vitest: 279 files, 2,331 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 407 passed, 4 ignored, in 3 of 3 runs. The two warnings were already there;
  - the real-host test passes;
  - the pin verifies;
  - the roadmap check reads READY.

## Phase 2 Slice 2d-1 Built — Profile, Setup and Reads Through the Host (2026-10-29)

Slice 2d was split, at the Navigator's word, into two parts:

- **2d-1** (this slice): the profile, the binding, the setup screen and the reads;
- **2d-2:** the writes and the outbox.

### What changed

- **The profile is the 0.3 home** (`runtime_channel.rs`).
  - **Its source.** `RuntimeChannelProfile::active()` reads `runtime-home.v2.json` through
    `load_home_binding`, so the marker is checked, and it resolves Pi from the trusted tool
    locations as before. Nothing names a Mirror source tree, a user or `uv`.
  - **Pi now runs in the 0.3 home.** Its `cwd` is that home, a data folder and never a Mirror
    checkout, so no `.pi/extensions` from the Python Mirror can load.
    - **No Mirror variables.** `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH` are **removed** from its
      environment, and the Python variables were already removed.
    - **This is the first half of 2e.** 2e still owes the test on the turn path itself.
  - **No `uv`.** `runtime_command("uv")` refuses with `UV_RETIRED`, so every remaining Python route
    fails with a plain sentence until 2d-2 moves it.
  - **The diagnostic** names only `mirrorHome` and `dbPath`.
- **`src-tauri/src/mirror_host_bridge.rs`** holds the app's single supervisor (`MirrorHostState`,
  managed by Tauri, started on the first request) and the read adapters.
  - **The runtime.** It is found in the repository's `.mirror-host/runtime/<platform>` by the
    Development channel only. Other channels refuse, naming 2f.
  - **`conversation_catalog`** answers `catalog` and `inspect` through `listJourneyConversations`
    and `inspectConversation`, **in exactly the shape the Python script printed**. The identifier
    rule, uniqueness, the "Untitled conversation" fallback and the Journey check are all kept, so no
    caller changed. `rename` and `rebind-journey` refuse until 2d-2, and `delete` is not carried.
  - **`registry_from_tree`** stamps the envelope Desktop owns: `schemaVersion` `0.1.0`,
    `source: mirror`, `syncedAt`, and no `sourceVersion`. The tree's `findings`, when there are any,
    go into the payload, which is then checked by the existing registry validator.
  - **`describe`** turns host errors into sentences.
- **`main.rs`.**
  - `run_mirror_conversation_catalog` and `refresh_journey_registry` now call the bridge. The
    bundled-catalog-script resolver is gone.
  - **New command, `bind_mirror_home`.** It opens the marked home, has the host read it as
    `current`, and only then saves the binding. A home that is not current is refused, because 0.3
    does not migrate yet.
- **The front end.**
  - **Setup.** `MirrorHomeSetup.tsx` asks for one folder, "Open your Mirror home", and in the
    Development channel it names `node scripts/dev_ts_home.mjs`.
  - **Settings** binds a home through the same chooser.
  - **The diagnostic parser** requires `mirrorHome` and `dbPath` only.
  - **Python discovery** and the Python form are no longer rendered. Their functions
    (`submitRuntimeBinding`, `fillRuntimeBindingFromDiscovery`) remain unreachable, and are
    removed with the Python routes in 2d-2.

### Two existing guards that reacted, as they should

- **CR163's list of unbounded waits.** The third named exclusion, the catalog's wait on a Python
  child, **no longer exists**: the catalog goes through the host, whose every request has a deadline.
  The test now asserts its absence.
- **The command census** went from 92 to 93 with `bind_mirror_home`, which is serialized and off the
  main thread.

### Tests that pinned the Python flow, and now pin the 0.3 one

- `journeyRegistryRefreshBoundary`;
- `runtimeChannelConfiguration`, both the profile and the setup copy;
- two DS-001 wiring tests in `cv010MirrorDiscovery`.

DS-001 itself is unchanged on `release/0.2`.

### Evidence

- **Real chain.** The new ignored test
  `real_host_feeds_the_catalog_and_the_registry_in_the_shapes_the_app_reads` ran against the
  materialized runtime. The supervisor created a home, which was marked. The real tree passed through
  `registry_from_tree` and the registry validator. A Conversation was created, and the real catalog
  and inspection came back through `catalog_entries` in the app's shape. The 2c real-host test
  passes too.
- **New tests, red first:**
  - `mirror_host_bridge`: 7 tests;
  - `runtime_channel`: 5 rewritten;
  - `main.rs`: 1 for the routing and the order of steps in `bind_mirror_home`;
  - `cv010MirrorHomeSetup`: 4 tests;
  - `runtimeChannelStorage`: 2 tests.
- **Mutations, seven, each caught:**
  - `MIRROR_HOME` back in Pi's environment;
  - `uv` allowed again;
  - the registry without its validator;
  - a repeated catalog id;
  - the binding saved before the host check;
  - the bind going through the Python command;
  - a diagnostic without `dbPath`.
- **Gates:**
  - vitest: 280 files, 2,336 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 415 passed, 5 ignored, in 2 of 2 runs;
  - the development-channel `cargo check` shows only the warning that was already there. The
    retired Python binding reader is marked dead until 2d-2;
  - the pin verifies, and the roadmap reads READY.
- **Production:** binary `303ede287de3…`, migration 016, and the TS Dev app data unbound.

### What the Navigator will see, and its limits

- **What works.** With a dev home bound, the TS Dev app should:
  - load the Journey tree from the 0.3 home;
  - show its sidebar;
  - offer the Pi model chooser.
- **What does not work yet.** **Creating a Conversation and sending a turn will fail with the
  `UV_RETIRED` sentence**, because provisioning and the append are 2d-2. Rename and rebind fail the
  same way.

## Phase 2 Slice 2d-2 Built — Writes Through the Host, and the Python Routes Gone (2026-10-29)

The Navigator first ran 2d-1 by hand: a dev home was created with `dev_ts_home.mjs`, bound in the TS
Dev app, and its Journey tree loaded. **The instruction given for that test was wrong.** It omitted
creating the parent folder, and the script refused with "the parent … does not exist". The script now
says how to fix it (`mkdir -p <parent>`).

### What changed

- **The append** (`run_explicit_mirror_append`) goes to the bound home through
  `appendConversationMessages` on the host.
  - **What stays the same.** The request is identical. The receipt check is identical, including
    the named rejection reasons and their safe alphabet. The outbox, settlement, CR093's
    binding-repair retry and CR095's rebind record are unchanged.
  - **CR163's bound** is now the supervisor's append deadline, set from `MIRROR_APPEND_TIMEOUT` (30 s).
    A hung request kills the host's process group.
  - **Failures** are written to the same record, ids only, never message content. The stderr is now
    the host's, cut to its last 4 KB.
  - **A new reason,** `mirror_append_home_unavailable`, names a home the host refuses.
- **Provisioning** (`provision_mirror_conversation`) becomes `ensureConversation`. The interface
  stays `nautilus_harness`, as the Python script wrote it.
- **Rename and rebind** go through `renameConversation` and `rebindConversationJourney`, and answer
  in the shape the catalog script used. CR093's repair therefore runs on the 0.3 line too.
- **Not carried, refused before any state is touched** (decision 3 of phase 2):

  | Route | Refusal |
  |---|---|
  | `delete_desktop_conversation` | "Deleting Conversations is not available in Mirror Desktop TS yet." |
  | `mutate_journey_registry` | "Journey administration is not available in Mirror Desktop TS yet." |
  | `open_mirror_conversation_in_terminal` | "Terminal recall is not available in Mirror Desktop TS yet." |
  | `inspect_published_projection` | "The Canvas is not available in Mirror Desktop TS yet." |

  Each command still takes the serialization guard first, which the command census requires. That
  guard caught two refusals that had lost it.
- **Removed from `main`** (all remain on `release/0.2`):
  - `bounded_child.rs`;
  - `scripts/provision_mirror_conversation.py` and `scripts/mirror_conversation_catalog.py`, and
    their bundle `resources`;
  - the terminal-recall launcher and its handoff cleanup;
  - `mirror_administrative_command`;
  - `journey_registry_contains_id`;
  - the profile's `uv_bin`.

  **No Rust route spawns `uv` or `python`.** The only remaining `"uv"` is the refusal itself.

### What still remains, unreachable

The retired Python *binding* code still sits on `main`, but it never runs Python, because every entry
to it refuses first:

- binding validation in `runtime_binding.rs`, which resolves `uv` and reads `pyproject.toml`;
- DS-001's discovery in `mirror_discovery.rs`;
- the front end's `submitRuntimeBinding` and `fillRuntimeBindingFromDiscovery`.

Removing it is cleanup, not transport, and it fits slice 2f, which replaces the Python release
preflight.

### Tests changed, and why

- **CR163's tests** now drive the append through a real supervisor, with a fake host in `sh`
  standing where `uv run` stood. They require the same as before:
  - a hung append times out within the bound;
  - its stderr is recorded, and the messages are never recorded;
  - the serialization guard is released within the bound;
  - a rejection keeps its reason;
  - the request is identical;
  - an unwritable record does not change the result.

  New tests cover a reason outside the safe alphabet, a receipt in the wrong shape, a home the host
  refuses, an oversized item refused before the host is asked, and the 4 KB stderr cap.
- **CR163's list of unbounded waits** is down to one, Pi session provisioning, because `journey
  mutate` is gone.
- **Seven front-end tests** pinned code of the removed routes: the catalog script, the provisioning
  script, `journey mutate`'s error mapping and the recall `osascript`. They now pin the 0.3 wiring or
  the plain refusal. The Python behaviour stays tested on `release/0.2`.

### Evidence

- **Real chain.** The ignored bridge test, against the materialized runtime:
  1. created a home and a Conversation;
  2. appended through `run_explicit_mirror_append_using`, then replayed it (idempotent);
  3. sent a conflicting append, which was refused as `mirror_append_idempotency_conflict`;
  4. renamed and rebound the Conversation through the response adapters.

  The 2c real-host test passes too.
- **Seven mutations, each caught:**
  - a timeout reported as a process failure;
  - the rejection reason unfiltered;
  - the delete refusing only after validating;
  - the stderr uncut;
  - the receipt unchecked;
  - rename without its Journey check;
  - provisioning calling `uv`.
- **Gates:**
  - vitest: 280 files, 2,335 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 411 passed, 5 ignored, in 2 of 2 runs. The two warnings were already there;
  - the development-channel check shows only the old warning;
  - the pin verifies, and the roadmap reads READY.
- **Production:** binary `303ede287de3…`, migration 016.

## Phase 2 Slice 2e Built — Pi Isolated on the Turn Path (2026-10-29)

### A defect found by reading the turn path

The turn found by reading would have failed **every** Mirror-mediated turn on the 0.3 line, and
`mirror` is the default invocation mode. 2d-2's record said turns would now work; for this reason,
they would not have.

- **Why it fails.** Before spawning Pi, the turn called a function that loaded Mirror's Pi skills
  from `<mirror_root>/.pi/skills`. On the 0.3 line, `mirror_root` is the home itself. A 0.3 home has
  no `.pi` folder: `~/mirror-ts-homes/ana` holds only `.mirror-desktop`, `identity` and the database.
  So the turn would have ended with "Mirror core skills are unavailable." before Pi started.
- **Why nobody saw it.** No turn had been sent yet: the TS Dev app data holds no `turn-journal`.
- **Why the skills cannot simply be found elsewhere.** Those skills are the Python Mirror's, and
  they drive `uv run python -m memory` against `MIRROR_HOME`.

**The fix.** Mediated turns on the 0.3 line load no Mirror skills. Mirror's context reaches Pi again
in phase 3, through the host.

### A second gap: the raw mode

The raw (non-mediated) invocation mode, and the raw compaction, built Pi's command **without the
profile**. They inherited the environment of whatever launched the app. The Navigator's shell exports
production's `MIRROR_HOME` and `MIRROR_USER`, so a raw turn would have run with production's
coordinates.

### What changed

- **One constructor for every Pi turn and compaction.** `pi_turn_command` builds them, through
  `isolate_pi_command`, in every mode.
  - **Isolation.** `cwd` is the bound 0.3 home. `MIRROR_HOME`, `MIRROR_USER`, `DB_PATH` and the
    Python variables are removed, and `PATH` is the trusted one.
  - **Raw mode needs a home too.** Raw mode now needs a bound home, as mediated mode already did.
- **`mediated_turn_flags`.** It adds `--approve`, `--no-extensions`, and the global extensions,
  named explicitly.
- **The global extension resolver** now refuses the `mirror-mind` package whole. Its only declared
  extension is the conversation writer, which was already refused, but it also declares skills.
- **Removed.** The Python skill loader, and its reading of the home's external-skill catalog.

### What the other Pi spawns already did

Provisioning, title suggestion and the model catalog already go through `runtime_command("pi")`,
which uses the same isolation since 2d-1. Provisioning and title suggestion also pass
`--no-extensions`.

### Evidence

- **A real spawn.** A `/bin/sh` child was built through `isolate_pi_command` from a base command
  that carried `MIRROR_HOME` and `DB_PATH`, as an inherited environment would. Its `pwd` printed the
  0.3 home, and its `env` held no Mirror or Python variable.
- **New tests:** 3 in Rust (the isolation and source census, the mediated flags, the Mirror package
  refusal). `mirrorMediatedInvocation.test.ts` was updated.
- **Six mutations, each caught:**
  - the constructor not isolating;
  - raw mode bypassing it;
  - a skill flag back;
  - no `--no-extensions`;
  - the Mirror package accepted;
  - `MIRROR_HOME` not removed.

  **Raw mode bypassing the constructor is caught only by the source census, not by behaviour.**
  The turn body is not callable from a test without a running app.
- **Gates:**
  - vitest: 280 files, 2,335 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 414 passed, 5 ignored, in 5 of 5 runs after the stall below;
  - the real-host tests pass;
  - the roadmap reads READY.
- **One gate run stalled.** It exceeded 50 minutes inside the compiler. The log shows "Compiling"
  and nothing after it, so no test ran. Five later runs finished in about 22 s each. The cause is
  not known.
- **Production:** binary `303ede287de3…`, migration 016.

### Still owed by the Navigator's check

The real turn in the TS Dev app, after this fix:

1. send a turn;
2. see it answered;
3. see it recorded in the 0.3 home.

## Navigator Check of 2d and 2e Passed (2026-10-29)

The Navigator ran the TS Dev app on the bound development home `~/mirror-ts-homes/ana`, created
Conversations and sent turns, and reported that everything worked.

Read afterwards, read-only, from that home's database (never production's):

- migration `018_drop_hook_injected`, as the pinned core creates it;
- two Conversations in Journey `personal-growth`, interface `nautilus_harness`: the Journey's
  generation-1 thread and "New Conversation #1", each with 2 messages;
- 2 user and 2 assistant messages, the latest carrying the `mirrorAppend` metadata the append
  contract writes;
- no `mirror-append-failures.jsonl` in the TS Dev app data.

Production afterwards: binary `303ede287de3…`, migration 016.

This is the first end-to-end 0.3 turn: Pi answered in the 0.3 home, and the outbox delivered the
turn to Mirror through the pinned host and core, with no Python anywhere on the path.

## Phase 2 Slice 2f-1 Built — the Runtime Ships in the App, and the Preflight Checks It (2026-10-29)

2f is split in two. **2f-1** makes a packaged 0.3 build self-contained and releasable. **2f-2**
removes the Python binding and discovery code that no route reaches any more.

### What a packaged build carries

`node scripts/mirror_host_pin.mjs stage` copies, from the materialized runtime, only what the app
needs into `.mirror-host/bundle/<platform>/` (gitignored):

- `node/bin/node` and `node/LICENSE` (npm, corepack, Node's headers and docs stay behind);
- `host.mjs` and `pin-receipt.json`;
- `node_modules` (the core and `yaml`).

It first runs `checkRuntime`, which refuses a runtime that:

- is for another platform;
- has another Node, core or `yaml` than the pin;
- carries a `host.mjs` other than its receipt's;
- or was materialized before the current `mirror-host/host.mjs` changed.

It also refuses any symlink inside the runtime, and replaces the old stage all or nothing.

Every packaged build (`tauri:build:dev`, `build-user`, `build-eval`, `install-eval`, and
`alpha:build`) stages first. It then merges `bundleConfig(platform)` through one more `--config`,
so the folder ships as `Contents/Resources/mirror-host/`. No `tauri*.conf.json` names it, so
`cargo test` and `tauri dev` never copy 126 MB.

### How the app finds it

`runtime_dir` looks first in the app's resources. A bundled runtime must match its receipt:

- this Mac's platform, otherwise "carries a Mirror host runtime for another Mac";
- the `host.mjs` hash it records;
- a `node` binary present.

A damaged bundle is refused ("missing its Mirror host runtime. Reinstall the app."). It is never
replaced by another runtime. Only the Development channel without a bundled runtime (`tauri dev`)
falls back to the repository's `.mirror-host/runtime/<platform>`.

### The preflight

`private_alpha_preflight.mjs` no longer asks for `uv` or `--mirror-root/--mirror-home/--mirror-user`,
and now refuses them. In their place, `checkMirrorHost`:

1. verifies the pin;
2. runs `checkRuntime` on the materialized runtime;
3. starts its host with an empty environment, and compares the handshake's Node, core version and
   Desktop API with the pin;
4. asks it about a canonical temporary home with no marker, and requires `HomeNotMarkedError` /
   `unmarked`.

**Found while wiring it.** `release:deploy prepare` required the three `--mirror-*` arguments and
passed them to the preflight. A 0.3 release would therefore have stopped at its first stage. It now
calls the preflight bare and refuses those arguments. `docs/alpha/private-macos-alpha.md` and
`docs/update/alpha-channel-governance.md` were updated, with the 0.2 forms struck through.

### Evidence

- **A real packaged build** (`npm run tauri:build:dev -- --bundles app`, 2 min 8 s):
  - the app is 145 MB, of which `Resources/mirror-host` is 126 MB, and 48 MB as a `tar.gz` (the
    updater artifact's form);
  - the bundled host, started from inside the `.app` with `env -i`, gave the handshake Node
    `v24.22.2`, core `0.37.0`, Desktop API 1, and refused an unmarked canonical home with
    `HomeNotMarkedError` / `unmarked`;
  - the built app, opened for 12 s on the TS Dev data (bound to `~/mirror-ts-homes/ana`), started
    its host as its own child from `…/Mirror Desktop TS Dev.app/Contents/Resources/mirror-host/node/bin/node`,
    and on quit left no process.
- **The real preflight** reads `READY`, with "Mirror host: Node 24.22.2, core 0.37.0 (c7b4bf40),
  Desktop API 1, refuses unmarked homes". `release_deploy.mjs plan` runs without coordinates.
- **New tests:**
  - 5 in `cv010HostPin.test.mjs`: stage contents, stale and foreign refusal, a current-host
    mismatch, symlink refusal, and build wiring;
  - 3 Rust tests, replacing the one that said "until 2f";
  - `privateAlphaPreflight.test.ts` rewritten: 2 tests against the real runtime, which skip where
    none is materialized, and injected negative controls.
- **Twelve mutations, each caught in the end:**
  - the whole `node/` folder staged;
  - stage without checking;
  - a symlink accepted;
  - the current host not compared, which **escaped at first** and is caught by a new test;
  - a build without the runtime;
  - the preflight not checking the refusal, the Node, or the runtime;
  - the bundle trusted without its receipt;
  - a non-Development channel falling back to the repository;
  - the host hash not compared;
  - the repository preferred over the bundle.
- **Gates:**
  - vitest: 280 files, 2,341 tests;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 416 passed, 5 ignored, twice;
  - the real-host tests pass;
  - the roadmap reads READY;
  - `mirror_host_pin.mjs verify` reads READY.
- **Production:** binary `303ede287de3…`, migration 016.

### Known gaps, for the release that first ships it

- **Signing.** The app is unsigned, as every local build is until CV-009. The bundled `node` keeps
  the Node.js Foundation's signature (team `HX7739G8FX`). When CV-009 signs and notarizes the app,
  `node` must be re-signed under the app's identity, with hardened runtime and the JIT entitlements
  V8 needs. This is not done or tested.
- **One architecture per build.** A build carries its own machine's platform only. An Intel build
  refuses on Apple silicon unless it runs under Rosetta, where the x64 `node` also runs. No
  universal build exists, and the arm64 runtime has not been run on an arm64 Mac.
- **Size.** The updater artifact grows by about 45 MB.

## Phase 2 Slice 2f-2 Built — the Python Binding Removed (2026-10-29)

Since 2c these routes refused first, and since 2d-1 no screen offered them. 2f-2 deletes them, so
nothing that names a Mirror source tree, a Mirror user or a Python Mirror remains on a route the
0.3 app or its launch scripts can take.

### Found while mapping

`inspect_runtime_binding_candidate` was still **called on every launch** (`App.tsx`), whenever the
channel was unbound. On the User channel it read `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH` from the
app's environment and put them into React state as a Python binding draft. When the app is
launched from the Navigator's shell, those are production's coordinates.

The function built paths only, opened no file, and no screen showed the draft, so no harm followed.
But production's coordinates were entering the 0.3 app. That is now gone.

### Removed

- **Rust.** Removed `mirror_discovery.rs` (DS-001) and, from `runtime_binding.rs`, the Python
  binding: `RuntimeBinding`, its validation and persistence of `runtime-binding.v1.json`, the
  environment candidate, the Core version range read from `pyproject.toml`, and `uv` resolution.
  Also removed:
  - the commands `inspect_runtime_binding_candidate`, `discover_existing_mirror`,
    `validate_runtime_binding` and `save_runtime_binding` (census 93 → 89);
  - `validate_runtime_binding_request`;
  - `RuntimeChannel::binding_channel`;
  - `RuntimeChannelProfile::from_validated`;
  - `python_mirror_retired`, which has nothing left to refuse;
  - `resolve_executable`.
- **What stays, moved.** The Pi toolchain resolution moved to `pi_toolchain.rs`
  (`resolve_pi_toolchain`, `executable_at`), with two new tests.
- **The folder picker** accepts `mirrorHome` only.
- **Front.** Removed `MirrorDiscoveryCard.tsx`, `domain/mirrorDiscovery.ts`, the binding draft state
  and the launch-time candidate effect, `fillRuntimeBindingFromDiscovery`, `submitRuntimeBinding`,
  and the candidate, discovery, validate and save calls in `runtimeChannelStorage.ts`.
- **Scripts.** Removed:
  - `runtime_binding_file.mjs`;
  - `export_mirror_bootstrap.py`, the `import:mirror` / `import:mirror:dev` scripts and the
    launcher's `import-user` / `import-dev` modes. `validate:desktop:launch` now opens both built
    apps without a Python import first;
  - `log_mirror_conversation.py`;
  - `scripts/tests/`. Its `test_mirror_conversation_catalog_rebind.py` tested a script 2d-2
    had already removed, and nothing ran it.
- **Config.** `config/runtime-compatibility.json` loses its Python `mirrorCore` range. The update
  manifest's `mirrorCore` field is a separate model, filled with `>=0.0.0` by the front, and is
  untouched.

**DS-001 lives on the 0.2 line only.** On 0.3, a person reaches Mirror through a marked home, which
`dev_ts_home.mjs` creates by hand today. In phase 3, the first-run assistant creates it.

### Evidence

- **New tests:**
  - `cv010PythonBindingRemoved.test.mjs`, a census of 4 tests: files gone; commands neither defined
    nor called; no binding state in the app; launch scripts without Python; the config without
    `mirrorCore`;
  - a Rust test that the binding is gone and the picker refuses `mirrorRoot`;
  - 2 `pi_toolchain` tests;
  - `runtimeChannelStorage.test.ts`'s binding tests replaced by one for the home-only picker.
- **Seven mutations, each caught:**
  - a binding command back, caught both by Rust and by the JS census;
  - the front invoking discovery;
  - the picker accepting `mirrorRoot`;
  - the launcher running `python3`;
  - the `mirrorCore` range back;
  - Pi resolved without the `node` beside it.
- **Gates:**
  - vitest: 280 files, 2,324 tests. The count fell with the deleted discovery suite;
  - tsc: clean;
  - build: passes;
  - cargo `--locked`: 382 passed, 5 ignored, twice. The count fell with the deleted
    `runtime_binding` and `mirror_discovery` suites;
  - the production `cargo build` gives no new warning;
  - the real-host tests pass;
  - the preflight reads READY;
  - the roadmap reads READY.
- **Production:** binary `303ede287de3…`, migration 016.

### Phase 2 is Implemented

All six slices are built. **For Done, the Navigator's check of a packaged build is still owed:**

1. build the TS Dev app;
2. open it on the bound home;
3. send a turn, which now uses the runtime inside the app;
4. see that the launch screen still binds a home.

## Phase 2 Done — Navigator Check of a Packaged Build (2026-10-29)

The Navigator built the TS Dev app (`npm run tauri:build:dev -- --bundles app`, 14:35 local), opened it
on `~/mirror-ts-homes/ana`, and reported that the test worked.

Read afterwards, read-only, from that home's database:

- "New Conversation #1" went from 2 to 4 messages; the new exchange was written at 17:36:32 UTC
  (14:36 local), a minute after the build. The home holds 3 user and 3 assistant messages.
- No `mirror-append-failures.jsonl` in the TS Dev app data.
- **The rename is not visible in the database.** Both Conversations keep their earlier titles, so
  either no rename was saved or it was renamed back. Rename goes through the same host and runtime
  as the append, which is evidenced; it is recorded here as not evidenced, not as failed.

Production afterwards: binary `303ede287de3…`, migration 016.

## Phase 3 Plan — The First-Run Assistant on 0.3 (2026-10-29)

**Outcome.** On a macOS account with no Mirror and no Pi, a person opens Mirror Desktop TS and,
without a terminal, reaches a first answered turn in a Journey, with Mirror's context before the
model: a home is created and marked, Pi is installed, a model provider is connected, and the
OpenRouter key Mirror's context needs is taken.

### Measured before planning

- **Home creation already exists in Core.** `createHome` (CV24.DS4) copies the identity templates
  with the person's name, migrates to current and seeds identity, personas and Journeys, all or
  nothing, writing nothing outside the target. What Desktop adds is the 0.3 marker. Today
  `dev_ts_home.mjs` writes it **after** `createHome` renames the home into place, so a failure in
  between leaves an unmarked home: safe (the host refuses it), but a stuck state the assistant must
  name and recover.
- **Pi.** The installed package is `@earendil-works/pi-coding-agent` 1.4.0 (not
  `@mariozechner/…`, whose last version is 0.73.1). It is about 149 MB installed, 123 MB of it
  dependencies, and needs Node `>=22.19.0`; the pinned Node 24.22.2 satisfies it. Today Desktop
  finds Pi in the trusted tool directories, paired with a `node` beside it.
- **Provider readiness.** `pi auth check --provider <id> --json --no-refresh` answers
  `{"status":"ready","provider":"openai-codex","authType":"oauth"}` without the credential.
- **Login without a terminal.** Pi's CLI has no login command; `/login` is interactive. Pi's SDK has
  `ModelRuntime.login(providerId, type, interaction, options)`, with callbacks for the browser step
  and a prompt (`AuthInteraction`), storing the credential in Pi's own `auth.json`. A small Node
  process using the installed Pi's SDK can drive it, the way the Mirror host drives Core.
- **Mirror's context.** On the terminal, Mirror's Pi extension calls `mirror doorman --prompt …
  --session-id …` before every turn and adds the printed block as a hidden user-role message
  (`customType: "mirror-context"`); it also appends Mirror's operating instructions (`AGENTS.md`)
  when Pi did not load them. The doorman decides on a read-only handle and, for a `full` or `delta`
  turn, needs providers: an LLM for reception and embeddings for search, both through
  `OPENROUTER_API_KEY`. **The doorman is not in `mirror-mind/desktop`**, so this needs a Core slice.
- **Where Core reads the key.** `OPENROUTER_API_KEY` from the environment, falling back to
  `~/.config/mirror/env`, which every `mirror` and `mirror-hook` process on the machine reads. The
  host runs with an empty environment and must never write that file (decision `f172a534`).

### Slices

**3a · Create a home in the app (DS-003 on 0.3).**

- The unbound screen offers **Create your Mirror** (a name, a place) and **Open an existing Mirror
  home** (today's picker).
- The host gains `createMarkedHome`: it calls `createHome` into a staging name beside the target,
  writes the marker inside it, and renames it into place, so a home appears marked or not at all.
  This removes the window `dev_ts_home.mjs` has; that script then calls the same method.
- Refusals in plain words: an existing target, a path under `~/.mirror-minds`, an invalid name,
  templates or seed failing. Then the app binds the home and loads its Journeys, as 2d-1 does.

**3b · Install Pi (DS-002 on 0.3).**

- A pinned Pi: version, and a lockfile with integrity for every dependency, vendored like the core
  tarball and checked by `mirror_host_pin.mjs verify`.
- Installed per decision 2 into an app-owned folder, with visible progress, resumable, all or nothing
  (staging and rename), and a log without secrets.
- `pi_toolchain.rs` prefers the app-owned Pi, run with the bundled Node. The trusted search path
  stays only if decision 2 keeps an existing Pi.

**3c · Connect the providers (DS-004 on 0.3).**

- Model provider: the assistant shows each provider's readiness from `pi auth check --json
  --no-refresh` and offers Pi's own login through a small auth process on Pi's SDK. OAuth opens the
  browser; API keys are typed once and handed to Pi (decision 3). Desktop never reads a credential
  back.
- OpenRouter for Mirror's context: taken once, stored per decision 4, and given to the host only on
  calls that need a provider.
- Then the existing "Choose your model" step, fed by the model catalog.

**3d · Mirror's context before the model.**

- **Core:** a CV24 slice, DS6, on the same branch. `deliverMirrorContext({dbPath, prompt,
  sessionId}, {apiKey})` returns the doorman's block, or nothing, and records the delivery as the
  CLI does. It reads no environment, and refuses plainly without a key when a provider is needed.
  `mirror-mind/desktop` exports it, and the pin moves to the new commit.
- **Desktop:** before each mediated turn, the app asks the host for the block and gives it to Pi as
  the hidden `mirror-context` message the terminal gives. It also adds Mirror's operating
  instructions. Which Pi mechanism carries the block (an RPC message before the prompt, or a small
  Desktop-owned Pi extension) is measured at the start of 3d.
- **Bounds:** the context call has its own deadline. A timeout or a refusal sends the turn without
  context and says so; it never blocks the turn.

### Files (expected)

- `mirror-host/host.mjs` (`createMarkedHome`, `deliverMirrorContext`), `mirror-host/pin.json`, the
  vendored tarballs.
- `scripts/mirror_host_pin.mjs` (Pi pin), `scripts/dev_ts_home.mjs` (calls the host method).
- `src-tauri/src/mirror_host_bridge.rs`, `mirror_home.rs`, `pi_toolchain.rs`, a new `pi_install.rs`
  and a Pi auth process beside the host, `main.rs` (turn path).
- `src/app/MirrorHomeSetup.tsx` and new first-run steps, `App.tsx` (onboarding sequence).
- Core (`mirror-ts`, branch `desktop/library-seam-1a`): the doorman as a library function, its
  tests, and `lib/desktop.js`.

### Acceptance

1. On the clean `mirror` macOS account, a locally built TS app (opened through Finder's Open, no
   terminal) goes from launch to a first answered turn in a Journey of a new home.
2. That turn carried Mirror's context: the home's database records the doorman delivery, and the
   answer was given with it.
3. Nothing was written outside the new home, the app's data folder, the app-owned Pi folder and
   Pi's own `~/.pi/agent` credentials. In particular, nothing in `~/.config/mirror`, `~/.mirror-minds`
   or the production checkout.
4. Each failure on the way (no network, a refused key, a cancelled login, a killed install, an
   interrupted home creation) leaves a state the assistant names and can resume.
5. The Navigator's own account is unchanged: production binary and migration, the 0.2 Dev data.

### Validation

- Tests per slice, with mutation controls, as in phases 1 and 2. Core's CI must be green on the new
  pin.
- Real-host tests for `createMarkedHome` and `deliverMirrorContext`, the latter against a provider
  fixture, never a real key in tests.
- The Navigator's check on the clean `mirror` account (acceptance 1–4) and on his own (5).

### Exclusions

- Signing and notarization (CV-009). Without it, the clean account opens the app through Finder's
  Open.
- Memory extraction and the rest of the terminal extension's session lifecycle (welcome card,
  extraction at session start). Phase 4 decides which return.
- Journey administration, Canvas and terminal recall: still "not available".
- Migration of any existing home, Python or TypeScript (phase 5).
- A universal (arm64 + x64) build.

### Decisions for the Navigator

1. **Where a created home goes by default.** Recommendation: `~/Mirror/<name>`, visible in Finder,
   with "Choose another place". Not `~/.mirror-minds`, which belongs to the Python homes.
2. **How Pi arrives.** Recommendation: installed at first run, pinned and integrity-checked, into the
   app's own folder, and always that one on 0.3. This keeps the app about 48 MB to download, against
   about 100 MB if Pi is bundled. An existing Pi on the machine is not used; its credentials in
   `~/.pi/agent` are, since that is where Pi keeps them.
3. **API keys typed in the app.** Recommendation: typed once and handed straight to Pi's own login,
   which stores them. Desktop keeps no copy and never shows one back. This refines the CV-010 rule
   "Desktop reads readiness, never secret values".
4. **Where the OpenRouter key for Mirror's context lives.** Recommendation: the macOS Keychain,
   under the app's identity, given to the host only per call. The alternative is a 0600 file inside
   the home's `.mirror-desktop/`. Never `~/.config/mirror/env`.
5. **The doorman in Core.** Recommendation: a CV24.DS6 slice on the same unmerged branch, with the
   pin moving to its commit. The phase-1 merge and Core release then carry six slices, not five.

### Navigator answers (2026-10-29)

- **2 · How Pi arrives:** accepted. Installed at first run, pinned and integrity-checked, into the
  app's own folder; credentials stay in `~/.pi/agent`.
- **3 · API keys typed in the app:** accepted. Handed straight to Pi's login; Desktop keeps no copy.
- **5 · The doorman in Core:** accepted. CV24.DS6 on `desktop/library-seam-1a`, pin moved to it.
- **1 · Where a created home goes:** the Navigator asked what `<name>` is. Measured:
  `createHome({homePath, userName})` requires `userName` to be a kebab-case slug (lowercase letters,
  digits, single hyphens, up to 80 characters); it is the identity key the templates are written
  with. The doorman also takes the user and identity from the home folder's own name
  (`basename(mirrorHome)`). So the folder name must be that same slug. Proposed: the assistant asks
  "What should your Mirror call you?", derives the slug ("Ana Souza" → `ana-souza`), shows it
  editable, and creates `~/Mirror/<slug>`. Awaiting the Navigator's word.
- **4 · The OpenRouter key:** the Navigator asked whether the person can manage the connection in
  the app. Proposed: yes, in Settings, a "Mirror's context · OpenRouter" section that shows whether a
  key is configured and when it last worked, and offers test, replace and remove. The key is never
  shown back. Removing it leaves turns working without Mirror's context, said plainly. Awaiting the
  Navigator's word.
- **1 and 4, confirmed** ("vai", 2026-10-29): both proposals above are accepted as written. The
  Settings section for the OpenRouter key belongs to slice 3c.

## Slice 3a Built — Create a Home in the App (2026-10-29)

Commit `6f27847`.

- **The host never makes an unmarked home.** Its raw `createHome` method is replaced by
  `createMarkedHome`. The core builds the home under a hidden name beside the target
  (`.<name>.marking-<random>`), the host writes the 0.3 marker inside it (`writeMarker`, moved from
  `dev_ts_home.mjs`), and renames it into place. Any failure removes the hidden folder. This closes
  the window `dev_ts_home.mjs` had, where the marker was written after the home was in place.
- **Refusals, before anything is made:** a path with a `.mirror-minds` component
  (`reserved_location`), a relative or non-normalized path, a missing parent or one reached through a
  symlink (`invalid_home_path`), an existing target (`home_exists`), all as
  `HomeCreationRefusedError`; the core's own (`invalid_user_name`, `seed_failed`, …) pass through.
- **App.** `create_mirror_home(userName, folder?)` validates the user name with the core's rule,
  places the home at `<folder>/<userName>` or `~/Mirror/<userName>` (making `~/Mirror` itself, never
  a chain of folders), has the host create it, and binds it through `bind_marked_home`, the same
  function a chosen home goes through (marker, then `current`, then persist). Refusals become
  sentences that say what to do (`describe_home_creation`). `choose_runtime_directory` accepts
  `homeFolder`. Command census 89 → 90.
- **Screen.** "Create your Mirror": "What should your Mirror call you?", the derived user name
  (editable, `userNameFrom` follows the core's `kebabSlug`), the folder it will be, "Create my
  Mirror", "Choose another place…", and "Open an existing Mirror home…". The development hint
  naming `dev_ts_home.mjs` is gone; the script still works and now calls the host's method.

**Gates.** vitest 280 files / 2,331 tests; cargo 385 passed / 5 ignored; real-host tests 2 pass on
the rematerialized runtime; roadmap READY. One full vitest run failed 3 timing tests (host pin
staging, launcher) under a system load average of 220 (WindowServer, Spotlight, WebKit); the two
files pass alone and the full suite passed on the two runs before and after.

**Mutations.** 18 tried, 18 caught after one fix. M6 (dropping the normalized-path check) escaped
at first: `..` is still refused by the symlink check, but a trailing slash was not; the test now
covers `<parent>/zed/`. Caught: the `.mirror-minds` refusal, the marker, the staging cleanup, the
last check before the rename, the symlinked parent, the raw core call, accent stripping, the
80-character bound, the screen's guard, the binding state reset, the default folder, the Rust name
rule, a relative folder, a raw refusal shown, binding before creating, `create_dir_all`, and a home
request that may create.

~~**Navigator check (pending).** On your own account, with the TS Dev app:~~ Withdrawn; see the correction below.

1. Move the binding aside: `mv ~/Library/Application\ Support/ai.mirrormind.desktop.ts.dev/runtime-home.v2.json{,.ana}`.
2. `npm run tauri:build:dev -- --bundles app`, then open the app: it shows "Create your Mirror".
3. Type a name, create, and reach the model step and a first turn in one of its Journeys.
4. Check `~/Mirror/<name>` exists and nothing appeared in `~/.mirror-minds`.
5. To return to `ana`: quit, `mv …/runtime-home.v2.json.ana …/runtime-home.v2.json`.

### Correction — the default folder is the production checkout (2026-10-29)

Read before the Navigator's check: `~/Mirror` exists on his account and is a Mirror Mind git checkout,
because APFS folds case and `~/Mirror` is `~/mirror`, the production checkout. With decision 1 as
accepted, "Create my Mirror" would have created the home **inside the production checkout**. No one
had run it; nothing was created.

Fixed in the host, commit `1b245ab`, whatever the default becomes:

- any folder inside a git repository is refused (`inside_repository`): the host walks from the parent
  to the root looking for `.git`. Every Mirror checkout is a repository, wherever it lives;
- the `.mirror-minds` component is compared without case.

Three mutations (no walk, parent only, case-sensitive comparison) were caught. Gates: vitest 280
files / 2,331 tests; cargo 385 passed / 5 ignored; real-host 2 pass. Production afterwards: binary
`303ede287de3…`, migration 016.

**Decision 1 reopened.** The Python Mirror's getting-started guide (`docs/getting-started.md`, lines
70–71) clones the repository as `mirror` and enters it, so run from the home folder it makes
`~/mirror`. The default would collide for the people most likely to try the app. Proposed default:
`~/Mirror Homes/<user-name>`, which collides with no Mirror path and reads plainly in Finder.

**Decision 1, revised and accepted** ("vai", 2026-10-29): new homes go to `~/Mirror Homes/<user-name>`
by default. Commit `e92da25`. A Rust test pins that the default is never `mirror` in any case, and a
front test that the screen shows the folder the app creates in; restoring `"Mirror"` fails both.
Gates: vitest 280 files / 2,331 tests; cargo 385 passed / 5 ignored.

**Navigator check (3a).** On your own account, with the TS Dev app:

1. Quit the TS Dev app and move its binding aside:
   `mv ~/Library/Application\ Support/ai.mirrormind.desktop.ts.dev/runtime-home.v2.json{,.ana}`.
2. `npm run tauri:build:dev -- --bundles app`, then open
   `src-tauri/target/release/bundle/macos/Mirror Desktop TS Dev.app`: it shows "Create your Mirror".
3. Type a name, create, choose a model and send a first turn in one of the new home's Journeys.
4. Check `~/Mirror Homes/<name>` exists, and that `~/mirror` and `~/.mirror-minds` gained nothing.
5. To return to `ana`: quit, then
   `mv ~/Library/Application\ Support/ai.mirrormind.desktop.ts.dev/runtime-home.v2.json{.ana,}`
   (first moving the new home's binding aside the same way if you want to keep it).

### Navigator check of 3a — Desktop state is shared across homes (2026-10-29)

The Navigator created `joao-silva`. Creation, marking and binding worked: `~/Mirror Homes/joao-silva`
holds a current database and a marker, `runtime-home.v2.json` names it, and `~/mirror` and
`~/.mirror-minds` gained nothing. But the app then showed **`ana`'s Personal Growth Conversation**
("Olá!" / "Olá! Como posso ajudar?", 1 hour old), with the Conversation list saying the app is
unbound.

Read afterwards: `joao-silva`'s database has 0 messages and 0 Conversations, so nothing was mixed in
Mirror. The defect is on Desktop's side:

1. **Desktop's own state is keyed by Journey id, not by home.** Journey threads, Pi sessions,
   segments, the dedicated Conversation, the catalog cache, the outbox and the turn journal live in the
   app data folder under `personal-growth/…`. Every home seeded from the templates has a
   `personal-growth`, so a second home inherits the first home's threads. A turn sent there would
   continue `ana`'s Pi session (her transcript as context) and append to `joao-silva`'s database. The
   same holds for "Open an existing Mirror home" since slice 2d-1, unseen until now because one home
   was ever bound.
2. **The Conversation list kept the "unbound" refusal** it got before the home was created; binding
   does not reload it.

**Proposed 3a-2.** Home-derived state moves under `<app data>/homes/<homeId>/` (the marker's id), so
each home has its own threads, sessions, catalog, registry, outbox and journal; app-wide settings
(model, window, voice, What's New) stay where they are. On first launch `ana`'s existing state moves
into her home's folder, all or nothing. Binding a home reloads the Journey list and its Conversations.
About 52 call sites read `app_data_dir()` today; each is classified as home or app state, and a census
test refuses an unclassified one.

## Slice 3a-2 Built — Desktop's State per Home (2026-10-29)

Commit `2a77286`, on the Navigator's "vai".

- **One resolver.** `home_state::home_state_dir` returns `<app data>/homes/<homeId>/` for the bound
  home (0700, refusing a link or a file in its place); unbound, there is none. 35 readers moved to it
  (32 in `main.rs`, 3 Journey-image commands). The 16 readers of app state are named: the binding,
  agent settings, model intents, voice, window geometry, What's New, the user avatar, native traces
  and the 0.2 parity cleanup. A census test reads every module and refuses any other reader of the
  app data folder. `HOME_STATE_ENTRIES` lists the 17 names a home's folder holds, and a test checks
  each constant `main.rs` keeps them under is listed.
- **Changed from the proposal.** Journey preferences went with the home: they hold pinned, active and
  hidden Journeys and Conversations, and also the theme and voice language, so a new home starts on
  the default theme.
- **Reload on bind.** Creating or opening a home reloads the window, so nothing from the previous home
  stays in memory, including the Conversation list's unbound refusal. A home with no registry imports
  its Journeys on the way in, through the existing start-up path.
- **The bound home changes only when idle.** `bind_marked_home` and `create_mirror_home` refuse to
  switch homes while a run is reserved, a compaction or a Journey thread is in flight
  (`desktop_is_busy_with`).
- **Changed from the proposal: no migration in the app.** Records keep absolute Pi session paths
  (`piSessionFile`), and no 0.3 build was published, so only a development folder holds unscoped
  state. `scripts/dev_adopt_unscoped_state.mjs <home>` moves it once, all or nothing, rewriting those
  paths, and refuses unless the home's database holds every Conversation the state names.

**Run on the Navigator's TS Dev data**, with the app closed, after a backup
(`/tmp/ts-dev-backup/ts-dev-app-data-before-3a2.tgz`): 12 entries moved into
`homes/home-dafb7eb5-…` (ana's marker id), 6 files' paths rewritten, Conversations `8bfc5f21` and
`a14439c8` found in ana's database, no old path left. `joao-silva` (`home-b7421a1e-…`) starts with no
state. The binding still names `joao-silva`.

**Gates.** vitest 281 files / 2,335 tests; cargo 391 passed / 5 ignored; real-host 2 pass; roadmap
READY. **Mutations:** 15, all caught after two findings: H4 (the explicit link check) was equivalent,
since `symlink_metadata` never reports a link as a folder, and was removed; H6 (never busy) escaped a
source-only test, so the busy rule became `desktop_is_busy_with` and is tested against each of the
three states (H6, H8–H10 caught). An ownership-free stale-path check in the script was dead logic
(the same pattern as the rewrite) and was removed. Production afterwards: binary `303ede287de3…`,
migration 016.

**Navigator check (3a + 3a-2).**

1. `npm run tauri:build:dev -- --bundles app` and open the TS Dev app. It opens on `joao-silva`
   with its own Journeys and no Conversation of ana's.
2. Send a turn there.
3. Quit, then switch to ana:
   `cd ~/Library/Application\ Support/ai.mirrormind.desktop.ts.dev && mv runtime-home.v2.json runtime-home.v2.json.joao && mv runtime-home.v2.json.ana runtime-home.v2.json`.
4. Open the app: ana's two Conversations are there, and continuing one works.

## Navigator Check of 3a + 3a-2: Passed (2026-10-29)

The Navigator reported "Deu certo". Read afterwards, read-only:

- `joao-silva` (`home-b7421a1e-…`) has its own state folder (11 entries) and its database holds
  2 messages, the latest at 20:50:14Z: a turn sent in the new home was recorded there.
- ana's folder (`home-dafb7eb5-…`, 12 entries) is intact, and the binding is back on ana. Her database
  still holds 6 messages, the latest at 17:36:32Z, so a continued turn in her Conversation is **not
  evidenced** in the database; that her Conversations reappeared rests on the Navigator's word.
- Production unchanged: binary `303ede287de3…`, migration 016.

Defects 1 and 2 of the 3a check are closed. Phase 3 stays 🟡 until 3b–3d and the acceptance on the
clean `mirror` account.

## Slice 3b Built — Install the App's Own Pi (2026-10-29)

Commit `6ea6bca`, on the Navigator's "vai".

- **Measured first.** `npm install --package-lock-only --ignore-scripts` for
  `@earendil-works/pi-coding-agent` 1.4.0: 121 packages, all from `registry.npmjs.org` with sha512
  integrity, none platform-specific or optional. Two declare an install script, and both were read:
  `@google/genai`'s `preinstall` echoes "no-op" (its `prepare` runs only in its own repository) and
  `protobufjs`'s `postinstall` prints a version-scheme warning. Pi needs neither, so **no package
  script ever runs**. `pi --version` prints `1.4.0` and writes nothing to its HOME.
- **Pin.** `pin.json` gains `pi` (package, version, `mirror-host/pi/package-lock.json`, its SHA-256,
  the package count, `scriptsNotRun`). `mirror_host_pin.mjs verify` checks the lockfile's hash, that
  it asks for and holds the pinned version with its `pi` command, the pinned Node meets Pi's engine
  (`>=22.19.0`), every entry is a registry sha512 package, and the packages with install scripts are
  exactly the ones read: a new pin that adds one fails until it is read. The runtime carries the
  lockfile and `pi-install.mjs`; the receipt records both hashes, and `check` and `stage` compare
  them. `BUNDLE_ENTRIES` gains both.
- **Installer** (`mirror-host/pi-install.mjs`, run with the carried Node, no npm). Downloads the
  lockfile's tarballs from the registry only, six at a time, three attempts each, 60 s per attempt;
  each is checked against its integrity before it is cached and again before it is unpacked. A
  tarball must be one folder with no absolute or `..` path and no symbolic link, and is unpacked
  at its lockfile path inside `.installing-<random>`. Then `pi`'s command is made executable,
  `--version` must print the pinned version under a throwaway HOME inside that folder, a receipt is
  written, and the folder is renamed to `<app data>/pi/pi-<version>-<lockfile hash 12>/`. Earlier
  pins' folders and the cache are removed only after that. A stopped install leaves verified
  downloads in `cache/` and resumes from them; `install.lock` keeps one install at a time and is
  taken over from a dead process. `install.log` holds counts, paths and refusal reasons.
- **App.** `pi_toolchain::resolve_app_pi` accepts only that folder, when its install receipt names
  the runtime's package, version and lockfile hash, with `pi` a plain executable file inside it; Pi
  runs with the carried Node, whose folder leads `PATH`. Nothing on the machine's tool paths is
  used for Pi any more; those paths remain only the `PATH` Pi's own commands run with.
  `pi_turn_command` maps the provider command `pi` to that Pi, so turns and compaction use it too
  (found while checking: `Command::new("pi")` with the new `PATH` would have reached
  `/usr/local/bin/pi`). `install_pi` (async, census 90 → 91, classified as app state) checks the
  installer's and lockfile's hashes against the receipt, runs the installer, turns its progress
  lines into `pi-install-progress` events, and maps each refusal to a sentence.
- **Setup.** A bound home whose app has no Pi is still `validated`, with `piInstalled: false`; binding
  and creating a home report it the same way. The setup screen then shows **Install Pi** (about
  24 MB, an existing Pi left alone, Pi's sign-ins used as they are), a progress bar per phase
  (download, unpack, check), and on failure the sentence and **Try again**. On success the window
  reloads, as after binding.
- **Changed from the plan:** no development fallback to a Pi on the machine; decision 2 says the app's
  Pi always, and the development channel installs it the same way, from the repository's runtime.

**Measured on this Mac** (Intel, network at home): 24.4 MB downloaded, 149 MB installed, about 20 s;
the installed Pi prints its help and `--list-models` with the carried Node. A second run downloads
nothing. The Rust real test (`real_pi_install`, ignored) installs the same way in a scratch folder.

**Gates.** vitest 283 files / 2,353 tests; cargo 399 passed / 6 ignored; real-host 2 and real Pi
install 1 pass; `verify` and `check` READY; roadmap READY. **Mutations:** 24, all caught after six
escapes got tests: the download-time and unpack-time integrity checks each hid the other (now: a
refused download never reaches the cache, and a damaged cache file is downloaded again); a two-folder
tarball; a link inside the install and a linked folder on the way, which the link and containment
checks each hid; an `installed` line with a failed exit, now tested with a complete install in place.

**Navigator check.**

1. `node scripts/mirror_host_pin.mjs check` (READY), then `npm run tauri:build:dev -- --bundles app`.
2. Open the TS Dev app on ana: it shows **Install Pi**. Install, watch the progress, and the app
   reloads into ana's Conversations.
3. Send a turn; it runs the app's Pi with your existing Pi sign-ins.
4. Optional: quit, delete `~/Library/Application Support/ai.mirrormind.desktop.ts.dev/pi`, reopen, and
   install again; or turn the network off during the install and see the sentence and Try again.

## Navigator Check of 3b: Install Failed, Fixed (2026-10-30)

The packaged TS Dev app showed "Pi could not be installed (it stopped without an outcome)", and no
`install.log` existed. Reproduced by running the bundled installer as the app does: it exited 0
and printed nothing. Its entry-point guard compared `argv[1]` with the module URL's pathname, which
percent-encodes the spaces in `Mirror Desktop TS Dev.app`, so `main` never ran. The tests and the
real Rust install ran from paths without spaces. A link on the way (`/tmp`) breaks the same
comparison. Fixed in `8568985`: both sides are real paths; a test runs the installer from a folder with
spaces reached through a link, and fails without the fix. Installed for real from such a folder.
The app's sentence was right; it pointed at a log the installer never got to write.

Gates: vitest 283 files / 2,354 tests; cargo 399 passed; real Pi install passes.

## Navigator Check of 3b: Passed (2026-10-30)

The Navigator rebuilt the TS Dev app after `8568985` and reported that everything worked. Read
afterwards, read-only:

- `install.log`: 121 packages, 24,407,102 bytes downloaded, none reused, installed at
  `pi/pi-1.4.0-d36b5fc72875` in about 12 s (11:55:27–11:55:39Z). Its install receipt names the
  pinned package, version and lockfile hash. Only `install.log` and that folder remain in `pi/`.
- ana's database went from 6 to 8 messages, the latest at 11:56:06Z, 26 s after the install: a turn
  ran with the app's own Pi and the Navigator's existing Pi sign-ins, and was recorded. No append
  failure file in her state folder.
- Production unchanged: binary `303ede287de3…`, migration 016.

The optional checks (reinstall after deleting `pi/`, network off during the install) were not
reported, so they are not evidenced.
