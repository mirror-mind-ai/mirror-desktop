[< CV-010](index.md)

# Decision 2026-10-28: Freeze 0.2, Build a 0.3 Line on an Embedded TypeScript Mirror

**Decided by:** the Navigator, 2026-10-28, after a compatibility audit and two independent reviews
**Supersedes:** the rule *"No dependency on Mirror Core changes"* (2026-10-27) and DS-005's additive,
dual-Core plan

## The Premises, Changed

1. **Mirror Core may be changed according to Mirror Desktop's roadmap.** Core work happens in a fresh
   checkout of the TypeScript Core, `/Users/alissonvale/Code/mirror-ts`, and may be carried out from a
   `mirror-desktop` Journey session. What protects Core is its own gates: a development branch, CI,
   release notes and the official release path. The session's Journey is not that protection. The
   machine-local policy (`~/.pi/agent/AGENTS.md`) was updated to match, with the Navigator's explicit
   authorisation. `/Users/alissonvale/Code/mirror-dev` is a stale Python-era checkout and is not used.
2. **Mirror Desktop embeds Mirror.** It stops calling Mirror as a command-line program and hosts the
   TypeScript Core's classes itself. Since Tauri's interface runs in a WebView, "embedded" means a
   pinned Node 24 inside the app and a Desktop-owned, long-lived host process that imports Core.
   Rust talks to that process over a typed contract Desktop defines.
3. **The migration is sequenced, not made compatible.** `v0.2.0-alpha.58` is frozen as the 0.2 line.
   A new 0.3 line **never touches production and never touches Python Mirror**. It starts with its own
   database and its own TypeScript Mirror installation. Reading the production database comes **last**,
   as a migration.

## Why Sequencing Beats the Additive Plan

The additive plan protected production with written invariants, such as a fixture shaped like
production, byte-identical argv, and two Core kinds in one binding. A 0.3 line that contains no Python
path **cannot** break the Python path. Production's safety becomes a fact of structure rather than of
discipline, and the 0.3 line carries no compatibility layer while it is young.

## Four Conditions Attached

### (a) The 0.3 line never shares the 0.2 update channel

Production polls `updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json`
(`src-tauri/tauri.alpha-update.conf.json`). Publication rewrites the manifest for **every** previous
version, 172 URLs at alpha.58. A 0.3 release published to `alpha` would therefore be offered to
production, and production would install it. Before the first 0.3 release:

- 0.3 gets its own channel path, for example `/mirror-desktop/beta/`, and its own updater
  configuration;
- 0.3 gets its own bundle identifier during the greenfield phase, so it cannot share production's app
  data (`ai.mirrormind.desktop`);
- the release route is parameterised per line, and a guard refuses to publish a 0.3 version to the
  `alpha` channel.

### (b) The 0.3 line only opens Mirror homes it created

The 0.3 line runs on this Mac during development. TypeScript Core applies pending migrations the first
time it opens a database. Production sits at migration 016, and 0.37 ships 017 and 018, so one
accidental open would migrate production. The enforceable guard is this: during the greenfield phase,
the embedded host opens a home **only if it carries a marker the 0.3 line wrote when it created that
home**. Anything else is refused before the database is opened. The guard is tested, so it does not
depend on remembering.

The same risk has a side door outside Desktop. Pi's hooks run `mirror-hook` in Node, so a global
`mirror-mind` install would let every terminal Pi session open the production home. The machine policy
now forbids a global install or `npm link` in this account until the migration.

### (c) The last phase is a migration, not an adjustment

Moving the Navigator's production onto the 0.3 line means:

- the production database goes to the new schema, with no way back except a restore, so the backup and
  the restore are named and rehearsed;
- the Python web console, which runs as a LaunchAgent, **ends without a successor**, because 0.37
  removed it;
- the 0.2 app's data under `ai.mirrormind.desktop` (turn journals, outbox, drafts, preferences) is
  imported or explicitly abandoned;
- the rule for two Mirrors on one database is decided. This covers Desktop's embedded Core next to a
  terminal `mirror`, including a database already migrated by a newer Core. It is the open question
  for an Explorer Mode pass, with three options on the table:
  - Desktop requires the installed `mirror` at the same version;
  - Desktop refuses a schema ahead of its own;
  - Desktop loads the installed `mirror-mind` as its library, or a hybrid of these.

### (d) The Refinement Suspension ends when 0.3 is stable

The previous point, after CV-010.DS-004, lost its referent. The Navigator accepted the recommended
replacement with "vai": **CR work resumes when the 0.3 line is stable on its own database and its own
TypeScript Mirror installation.** The Navigator may set another point.

## Branching

- `main` continues as the 0.3 line. History stays linear and fast-forward only.
- `release/0.2` is a maintenance branch cut from `v0.2.0-alpha.58`. It is used **only** under the
  suspension's serious-harm exception. Its releases go to the `alpha` channel, through the current
  route.
- Neither branch is created by this decision. Creating them waits for the Navigator's word, as every
  branch does.

## Consequences

- **The decision of 2026-10-27 to put existing users first is reversed for 0.3.** New users come first;
  the Navigator migrates last. CV-010.DS-001 belongs to the 0.2 line.
- **DS-001's field check in the `mirror` account is retired, not passed.** It tested discovery of a
  Python Mirror that nobody installing today can obtain.
- **DS-005 becomes the spine of the 0.3 line.**
- **Greenfield conversations are invisible to terminal runtimes, and terminal conversations are
  invisible to 0.3**, until 0.3 shares a home. That is accepted for an alpha.
- **What does not change:**
  - Pi stays an external program, which the assistant still installs and still logs into.
  - The 0.3 host must reproduce the Mirror-context injection that 0.37's hooks give terminal Pi;
    otherwise Desktop answers with less context than terminal Pi.
  - Every wait on the host is bounded and supervised, by CR163's lessons.
  - The first embedded step swaps the transport only. Outbox, settlement and recovery keep their
    shape, because they address crash windows, not process boundaries.

## Provenance

- CV-010.DS-005's compatibility audit (2026-10-28) and the earlier exploration
  [Embedded TS Runtime, Full Control](../../explorations/embedded-ts-runtime-full-control/index.md)
  (2026-09-21).
- Two reviews in this Conversation:
  - a second opinion with the model changed (the hooks side door, migrate-on-open, the third
    version-rule option);
  - an evaluation of the Navigator's sequencing (the update-channel collision and the four
    conditions).
