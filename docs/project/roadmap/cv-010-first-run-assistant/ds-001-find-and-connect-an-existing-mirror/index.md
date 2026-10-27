[< CV-010](../index.md)

# CV-010.DS-001 - Find and Connect an Existing Mirror

**Status:** 🟡 Planned

## Outcome

A person who already uses Mirror opens Mirror Desktop and, instead of a form asking for three absolute paths and a slug, sees their Mirror found, each requirement checked in plain language, and connects with one confirmation. When something is missing, the screen says what and how to get it. The manual form stays as the fallback.

## Why Today's First Screen Fails Them

Measured on 2026-10-27:

- **The only automatic discovery reads environment variables** (`inspect_runtime_binding_candidate`, `MIRROR_HOME`/`MIRROR_USER`/`DB_PATH`). An app opened from Finder or the Dock does not inherit a shell's exports, so for the ordinary launch it proposes nothing.
- **Core already knows the answer.** Run inside a checkout, `memory runtime status` reports version, Mirror home, database and its existence, resolved from the checkout's own `.env` (`MIRROR_USER`). It has no machine-readable output yet.
- **Several homes can coexist.** This Mac holds seven under `~/.mirror-minds/`, six with a `memory.db`. Picking one by guess would bind the wrong identity; the home must come from Core's resolution, confirmed by the person.
- **Pi reports provider readiness without secrets.** `pi auth check --provider <p> --json --no-refresh` returns `status`, `provider`, and `authType` or `reason` (for example `ready`/`oauth`, or `not_ready`/`credentials_not_configured`). No credential is emitted unless `--credentials` is passed.

## Scope

1. **Core prerequisite — `memory runtime status --format json`.** It is built in `mirror-dev` and released as a Mirror patch inside the supported range (`>=0.31.14,<0.32.0`). It returns version, repository, Mirror home, user, database path and existence, and migration state, and never a secret. Desktop consumes it only after the release is published.
2. **Find the checkout.** Desktop looks in a bounded list of conventional locations — `~/mirror`, `~/Code/mirror`, `~/code/mirror`, `~/src/mirror`, `~/dev/mirror`, `~/Projects/mirror` — plus *Choose…*. A candidate qualifies only with `src/memory` and a `pyproject.toml` that names Mirror's package. Symlinks are rejected, as the binding already requires.
3. **Ask Core, through the bounded runner.** Desktop runs the JSON status in the chosen checkout with fixed argv, under the CR163 bounded child runner and with a timeout. Core's answer proposes the binding, and the existing `validate` remains the authority.
4. **Readiness checklist.** One row per requirement, each found or missing, with one plain sentence on what to do:
   - Mirror Core found, and its version inside the supported range;
   - Mirror home and database;
   - `uv`;
   - Pi and Node in the same directory;
   - at least one provider `ready` according to `pi auth check` (`--no-refresh`, names and statuses only);
   - at least one model in the catalog;
   - at least one Journey.
5. **One confirmation.** The screen shows the Mirror user and home that Core resolved, and **Connect** saves the binding through the existing `save_runtime_binding`. *Use a different Mirror…* opens today's manual form, which is kept unchanged.

## Acceptance

- A Finder-launched app on a Mac with a conventional checkout reaches the checklist with no typing. When all rows are found, one click lands in the Journey workspace.
- With several homes under `~/.mirror-minds/`, the proposed home is exactly the one Core resolves, and nothing is selected without the confirmation.
- A Core that predates the JSON status degrades to today's form with one explanatory line, and never fails closed.
- Each missing requirement names itself and its remedy; an out-of-range Core names both versions.
- No credential value is read, logged, displayed or persisted. A guard asserts that `--credentials` never appears in the argv and that only `status`, `provider`, `authType` and `reason` are kept.
- Discovery never writes. Only **Connect** persists, and it goes through the existing validation.

## Validation

- TDD over the discovery, the checklist derivation and the argv guards, using fixture checkouts and homes.
- Two field fixtures:
  - **this Mac**, with seven homes, a conventional checkout and two OAuth providers;
  - **the clean `mirror` macOS account the Navigator created on 2026-10-27**, after Mirror is installed there by its own guide, which is the "existing Mirror user" case on an otherwise empty machine.

## Exclusions

- Installing anything (DS-002), creating a Mirror (DS-003), and entering keys or performing a login (DS-004).
- Refreshing OAuth: the check uses `--no-refresh`, so Pi's state is never written.
- Changing the binding's validation rules, the compatibility range or the channel isolation.
- Signing (CV-009).

## Resumption Point

Shipping this Delivery Story ends the Refinement Suspension, unless the Navigator sets another point.
