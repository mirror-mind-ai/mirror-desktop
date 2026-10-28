[< CV-010](../index.md)

# CV-010.DS-001 - Find and Connect an Existing Mirror

**Status:** 🟠 Implemented — on branch `cv-010-ds-001-find-and-connect-an-existing-mirror`, not integrated or released

## Outcome

A person who already uses Mirror opens Mirror Desktop and, instead of a form asking for three absolute paths and a slug, sees their Mirror found, each requirement checked in plain language, and connects with one confirmation. When something is missing, the screen says what and how to get it. The manual form stays as the fallback.

## Why Today's First Screen Fails Them

Measured on 2026-10-27:

- **The only automatic discovery reads environment variables** (`inspect_runtime_binding_candidate`, `MIRROR_HOME`/`MIRROR_USER`/`DB_PATH`). An app opened from Finder or the Dock does not inherit a shell's exports, so for the ordinary launch it proposes nothing.
- **Core's resolution rule is small and readable.** `src/memory/config.py` (Core 0.31.14) loads the first `.env` found walking up from the package, without overriding variables already set. It then resolves the home as `MIRROR_HOME` if set, otherwise `~/.mirror-minds/<MIRROR_USER>`, falling back to legacy `~/.mirror/<MIRROR_USER>` only when the new location is absent. It refuses a `MIRROR_HOME` whose last component differs from `MIRROR_USER`. `memory runtime status` prints the result, but only as text.
- **Several homes can coexist.** This Mac holds seven under `~/.mirror-minds/`, six with a `memory.db`. Picking one by guess would bind the wrong identity; the home must come from Core's resolution, confirmed by the person.
- **Pi reports provider readiness without secrets.** `pi auth check --provider <p> --json --no-refresh` returns `status`, `provider`, and `authType` or `reason` (for example `ready`/`oauth`, or `not_ready`/`credentials_not_configured`). No credential is emitted unless `--credentials` is passed.

## Scope

**No Mirror Core change.** This Delivery Story was first planned with a JSON form of `memory runtime
status` as a Core prerequisite. The Navigator removed that dependency on 2026-10-27, so Desktop
reproduces Core's resolution itself and keeps Core's own validation as the authority.

1. **Find the checkout.** Desktop looks in a bounded list of conventional locations — `~/mirror`,
   `~/Code/mirror`, `~/code/mirror`, `~/src/mirror`, `~/dev/mirror`, `~/Projects/mirror` — plus
   *Choose…*. A candidate qualifies only if it has `src/memory/config.py` and a `pyproject.toml`
   declaring Mirror's package and a version. Symlinks are rejected, as the binding already requires.
2. **Read only the identity keys of its `.env`.** This uses the same file Core uses: the first `.env`
   found walking up from `src/memory`. Desktop parses the lines the way Core does, and **retains only**
   `MIRROR_HOME`, `MIRROR_USER`, `MEMORY_ENV`, `DB_PATH`, `MEMORY_DIR` and `MEMORY_PROD_DIR`. Every
   other key is dropped as it is read, its value included. That covers `OPENROUTER_API_KEY` and
   anything else secret: it is never held, logged or returned to the frontend. A guard pins that
   allowlist and its size. Whether a non-empty `OPENROUTER_API_KEY` *exists* is kept as a single
   boolean, for the checklist.
3. **Resolve the home with Core's rule** — `MIRROR_HOME`, else `~/.mirror-minds/<user>`, else legacy
   `~/.mirror/<user>`, and a conflict between the two is an error. The rule is tested against fixtures
   that copy Core 0.31.14's cases. The database is `memory.db` beneath that home, which is what the
   binding already requires.
4. **Refuse to guess what the binding cannot express.** `MEMORY_ENV` other than `production`, or any of
   `DB_PATH`, `MEMORY_DIR` or `MEMORY_PROD_DIR`, means Core would use a database the binding does not
   model. Discovery then says so in one line and opens today's form. It never fails closed and never
   points at a different database.
5. **Readiness checklist.** One row per requirement, each found or missing, with one plain sentence on
   what to do:
   - Mirror Core found, and its version inside the supported range;
   - Mirror home and `memory.db`;
   - OpenRouter key present (presence only);
   - `uv`;
   - Pi and Node in the same directory;
   - at least one provider `ready` according to `pi auth check --json --no-refresh`, keeping only
     names and statuses;
   - at least one model in the catalog;
   - at least one Journey.
6. **One confirmation.** The screen shows the Mirror user and home that were resolved, and **Connect**
   saves through the existing `save_runtime_binding`. Its `validate` stays the authority, and the
   Journey import that follows exercises Core itself. *Use a different Mirror…* opens today's manual
   form, which is kept unchanged.

### The risk this accepts, and how it is bounded

Copying Core's rule means a future Core could resolve differently from Desktop. That risk is bounded
in three ways:

- the rule is pinned to the Core range this Desktop already declares (`>=0.31.14,<0.32.0`), so a Core
  outside the range is refused anyway;
- a wrong resolution cannot bind silently, because it must still pass `validate` (a real `memory.db`
  beneath a real home) and then a real Journey import through Core;
- the person confirms the user and home on screen.

**Recorded as Core debt, not as a prerequisite:** a machine-readable `memory runtime status` would
retire this copy.

## Acceptance

- A Finder-launched app on a Mac with a conventional checkout reaches the checklist with no typing. When all rows are found, one click lands in the Journey workspace.
- With several homes under `~/.mirror-minds/`, the proposed home is exactly the one Core resolves, and nothing is selected without the confirmation.
- A `.env` that sets `MEMORY_ENV` other than `production`, `DB_PATH`, `MEMORY_DIR` or `MEMORY_PROD_DIR`, or a missing or conflicting `MIRROR_USER`/`MIRROR_HOME`, degrades to today's form with one explanatory line. It never fails closed and never binds another database.
- Resolution matches Core 0.31.14 on every fixture copied from `resolve_mirror_home`: explicit home, derived home, legacy fallback and conflict.
- No value of any `.env` key outside the six-key allowlist leaves the parser, and `OPENROUTER_API_KEY` is reduced to presence. A guard asserts both.
- Each missing requirement names itself and its remedy; an out-of-range Core names both versions.
- No credential value is read, logged, displayed or persisted. A guard asserts that `--credentials` never appears in the argv and that only `status`, `provider`, `authType` and `reason` are kept.
- Discovery never writes. Only **Connect** persists, and it goes through the existing validation.

## Validation

- TDD over discovery, `.env` parsing (Core's own quirks: comments, `=` inside values, surrounding whitespace, a variable already set wins), home resolution, the checklist derivation and the argv and allowlist guards, using fixture checkouts and homes.
- Two field fixtures:
  - **this Mac**, with seven homes, a conventional checkout and two OAuth providers;
  - **the clean `mirror` macOS account the Navigator created on 2026-10-27**, after Mirror is installed there by its own guide, which is the "existing Mirror user" case on an otherwise empty machine.

## Exclusions

- Installing anything (DS-002), creating a Mirror (DS-003), and entering keys or performing a login (DS-004).
- Refreshing OAuth: the check uses `--no-refresh`, so Pi's state is never written.
- **Any change to Mirror Core**, including the JSON status this story first depended on.
- Changing the binding's validation rules, the compatibility range or the channel isolation.
- Writing to `.env`, which belongs to DS-003 and DS-004.
- Signing (CV-009).

## Resumption Point

~~Shipping this Delivery Story ends the Refinement Suspension.~~ Moved by the Navigator on 2026-10-27:
the suspension now ends after **CV-010.DS-004** ships.

## Implemented 2026-10-27

The Navigator authorised the build ("vai"). It was built red-first on `cv-010-ds-001-find-and-connect-an-existing-mirror`. Nothing is integrated
or released, and Mirror Core was not touched.

### What was built

- **`src-tauri/src/mirror_discovery.rs`** (new). It holds the conventional checkout list, Core's
  `.env` parser and Core 0.31.14's `resolve_mirror_home`. It refuses any setting that would move the
  database, builds the readiness checks, and proposes a binding that it then runs through the existing
  `RuntimeBinding::validate`.
- **`discover_existing_mirror(chosenRoot?)`**, a native command. It acquires the CR149 guard like
  every command (census 91 → 92). Only the User channel may connect what it finds; the Development
  and Evaluation channels get a **preview**.
- **`src/domain/mirrorDiscovery.ts`** parses the contract strictly and turns it into one plain
  sentence per row, plus a headline and a summary.
- **`src/app/MirrorDiscoveryCard.tsx`** renders the first screen. It has **Connect**, **Check again**,
  **Choose Mirror folder…** and **Use a different Mirror…**.
- **`App.tsx`**:
  - an unbound channel opens on discovery;
  - **Connect** goes through the existing `submitRuntimeBinding(true, proposed)`, now with an
    optional binding argument, so there is no new write path;
  - the manual form gains **Find my Mirror automatically**;
  - **Settings → Runtime channel** gains **Find my Mirror**, which fills the three fields and saves
    nothing. This is how the Development build exercises discovery.

### Evidence

- **28 Rust tests** cover parsing quirks, each Core parity case copied from Mirror's
  `test_config.py`, the database-override refusals, checkout qualification, the end-to-end proposal,
  several homes, the preview, each missing requirement, and the validator's refusal.
- **Two guards:**
  - the module never writes and never spawns a process;
  - no `.env` value outside the allowlist reaches the serialised result.
- **19 TypeScript tests** cover the contract, the sentences, the card and the wiring. Two of them are
  censuses: they assert that the check ids and the reason codes are identical on both sides of the
  bridge.
- **Four mutations, each caught by exactly its own test:**

  | Mutation | Caught by |
  |---|---|
  | the parser keeps every key | the allowlist test |
  | the `DB_PATH` refusal is dropped | the override test |
  | the home/user conflict check is dropped | the conflict test |
  | the raw `.env` is copied into a check's detail | the no-secret test |

  The no-secret test passed against the empty stubs, so on its own it proved nothing. The mutation
  is what shows it bites.
- **Gates:** vitest **274 files / 2,269 → 2,288 tests**; cargo **354 → 382 passed / 3 ignored**; tsc,
  build and roadmap clean.
- **Field fixture 1, this Mac, measured** with a throwaway read-only probe that was removed
  afterwards. Discovery checked the six locations, found `~/mirror`, and proposed `alisson-vale`
  among seven homes. All seven checks were found and the binding was connectable. The proposed
  binding is **byte-identical to production's `runtime-binding.v1.json`**, the one the Navigator
  configured by hand.

### Scope changes, stated rather than smoothed over

- **Three planned checklist rows were not built: provider readiness, a model and a Journey.**
  - `pi auth check` requires `--provider`, and Pi offers no command that lists providers, so the row
    would have had to guess provider names.
  - Each check costs about 0.7 s, measured, and it would run under the guard that every native
    command shares.
  - The model and Journey rows only exist after connection, and the screens that follow Connect
    already cover them: *Choose your model*, and *no Journeys were found*.

  Provider readiness moves to **DS-004 · Connect the Providers**, where the provider is known
  because the person is choosing it.
- **A missing OpenRouter key is shown, not blocking.** Mirror's guide calls the key always required,
  but turns run without it on this Mac, so blocking Connect on it would refuse a working Mirror.
- **Row details show canonical paths.** Pi appears as its resolved `cli.js` and uv as its Cellar path,
  because the binding resolves executables that way. The text is accurate, if less friendly than
  `/usr/local/bin/pi`.

### Owed before Done

1. ~~**Navigator check on the Development build.**~~ **Passed 2026-10-27.** The Navigator ran
   `npm run tauri:dev`, used Settings → Runtime channel → **Find my Mirror**, and reported "Funcionou,
   validado": the three fields filled with their Mirror and nothing was saved.
2. ~~**Field fixture 2, after release.**~~ **Retired 2026-10-28, not passed.** It tested discovery of a Python Mirror that no one installing today can obtain, and the [0.3 decision](../decision-2026-10-28-the-0-3-line.md) moves new users to an embedded TypeScript Mirror. DS-001 stays on the 0.2 line as built, validated on the Development build, and shipped in alpha.58.
   Originally: **Field fixture 2, after release.** Install Mirror in the clean `mirror` account by its own guide,
   then install this release and connect with one click. Do it at a moment with no turn in flight in
   the Navigator's session.

## Shipped in v0.2.0-alpha.58 (2026-10-27)

Fast-forwarded into `main` with zero merges, gates re-run there, branch deleted (never pushed), and
published as alpha.58. The served binary is byte-identical to the local bundle and carries the new
command and reason codes; the frontend carries the new screen's strings; both against positive and
negative controls. Evidence: `docs/update/alpha-58-release-publication-2026-10-27.md`. Remaining before
Done: field fixture 2, the clean `mirror` account.
