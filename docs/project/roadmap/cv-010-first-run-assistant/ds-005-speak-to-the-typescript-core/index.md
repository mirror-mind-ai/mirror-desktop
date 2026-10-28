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
