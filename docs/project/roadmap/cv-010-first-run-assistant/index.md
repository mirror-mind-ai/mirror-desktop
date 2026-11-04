[< Roadmap](../index.md)

# CV-010 - First-Run Assistant

**Status:** ✅ Done — closed by the Navigator on 2026-11-03

## Outcome

A person opening Mirror Desktop for the first time is guided, without a terminal, from launch to a first answered turn: an existing Mirror is found and connected, and what is missing is installed and configured with them, including provider API keys and OAuth.

## Why This Matters

Mirror Desktop's first screen asks for three absolute paths and a user slug, and assumes a complete, credentialed Mirror already exists. Mirror's own guide reaches that state in ten manual steps, four of them in a terminal. The Windows installer and Frame already prove the guided sequence; macOS has none of it. Exploration: [First-Run Assistant](../../explorations/first-run-assistant/index.md).

## Operating Premise

Decided by the Navigator on 2026-10-27:

- ~~**Existing Mirror users come first.**~~ *Reversed for the 0.3 line on 2026-10-28: new users first, the Navigator migrates last ([decision](decision-2026-10-28-the-0-3-line.md)).*  DS-001 serves a person who already has Mirror and only lacks the Desktop; installing from nothing follows.
- **CR work resumes after DS-004** (Navigator, 2026-10-27, moved from DS-001), so the four Delivery Stories run back to back.
- **Signing is in flight outside this CV.** Software Zen's Apple enrollment was submitted and awaits Apple's contact (CV-009). Nothing in CV-010 waits on it, but no new user can reach the assistant until a signed build ships.
- ~~**No dependency on Mirror Core changes** (Navigator, 2026-10-27).~~ *Superseded 2026-10-28: Core may change according to this roadmap, and Desktop embeds the TypeScript Core ([decision](decision-2026-10-28-the-0-3-line.md)).*  CV-010 works with the Core releases that already exist: it reads what Core already writes, calls only commands Core already ships, and reproduces Core's documented resolution rules where it needs an answer Core gives only as text. Needs that would require a Core change are recorded as debt, not prerequisites. The production Mirror checkout is never modified.
- **Credentials stay with their owners.** Pi owns OAuth tokens in `~/.pi/agent/auth.json`; Mirror owns its `.env`. Desktop reads readiness, never secret values.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-010.DS-001](ds-001-find-and-connect-an-existing-mirror/index.md) | Find and Connect an Existing Mirror | A person with Mirror already installed opens the Desktop and sees their Mirror found, every requirement checked in plain language, and connects with one confirmation instead of typing paths | Superseded (0.3: DS-005 phase 5a) |
| [CV-010.DS-005](ds-005-speak-to-the-typescript-core/index.md) | The 0.3 Line: Mirror Desktop on an Embedded TypeScript Mirror | A 0.3 line hosts the TypeScript Core in-app on its own database and installation, never touching production or Python Mirror; production migrates last; **the spine of CV-010 from 2026-10-28** | ✅ Done |
| CV-010.DS-002 | Install the Toolchain | The assistant installs pinned uv, Node + Pi and Mirror Core into app-owned locations with visible, resumable progress and a log without secrets | Absorbed into DS-005 phase 3 |
| CV-010.DS-003 | Create the Mirror | The assistant takes a name, writes the Mirror configuration, runs `init` and `seed` through a fixed-argv allowlist and opens a first Journey | Absorbed into DS-005 phase 3 |
| CV-010.DS-004 | Connect the Providers | The assistant takes the OpenRouter key and connects a subscription through Pi's own login or a provider API key, verified by `pi auth check` and the model catalog | Absorbed into DS-005 phase 3 |

Changes that could be carried to the frozen 0.2 line before 0.3 is promoted are listed in
[Release 0.2 Backport Candidates](release-0-2-backport-candidates.md).

## Done Condition

On a clean macOS user account, a person can install the signed Mirror Desktop, follow the assistant, and receive a first answered turn in a Journey without opening a terminal; and a person who already has Mirror connects without typing a path.

## Boundary

This capability does not sign or notarize the application (CV-009), modify the production Mirror checkout, read or display credential values, bypass Pi's own login, choose among several Mirror homes without the person's confirmation, support Windows or Linux, or retire the Windows Frame.

## Field Finding: Published Mirror Is No Longer the Core This Desktop Supports (2026-10-28)

The Navigator followed `https://mirrormind.sh/en/install/macos/` in the clean `mirror` account, and
`uv sync` failed with *No pyproject.toml found*. The install was done correctly. The cause is upstream:

- **Mirror Core became a TypeScript package in v0.32.0** and is at **v0.37.0** on both `main` and
  `stable` (`package.json` `mirror-mind` 0.37.0, `engines.node >=24`). There is no `pyproject.toml`
  and no `src/`. It installs with `npm install -g mirror-mind` and `mirror init <name>`, and its CLI is
  `mirror …`. The clone in `/Users/mirror/mirror` is at `dd5bed9`, `main`'s head, and is clean.
- **The site's macOS page still gives the Python steps** (`uv sync`, `uv run python -m memory …`). It
  is stale against the repository it points to. It belongs to another Journey and was not modified.
- **Every Mirror Desktop release, alpha.58 included, supports only `>=0.31.14,<0.32.0`.** It requires
  a checkout with `src/memory` and `pyproject.toml` plus `uv`, and it invokes `uv run python -m memory`.
  DS-001's discovery likewise qualifies a checkout by `src/memory/config.py`. **A person installing
  Mirror today cannot use Mirror Desktop at all**, and DS-001 cannot find their Mirror.
- **The Navigator's own production is exposed.** `/Users/alissonvale/mirror` is still 0.31.14 Python on
  `stable` at `b2d710e`, while `stable` upstream is `0a40b108` (0.37.0). A Mirror runtime update in that
  checkout would move it outside the supported range and leave Mirror Desktop unable to append,
  import Journeys or connect. That falls under the suspension's serious-harm exception.

**Consequence for CV-010.** The premise that existing Mirror users have the Core this Desktop speaks
to now holds only for people who installed before v0.32.0 and have not updated. DS-001 stays as built,
but its field check in the `mirror` account is meaningful only against `v0.31.14`, which is still
tagged. The first real prerequisite of the first-run assistant is **Mirror Desktop support for the
TypeScript Core** (v0.32+): an npm-installed `mirror` rather than a checkout, `~/.config/mirror/env`
as well as a clone's `.env`, Node 24, and `mirror …` in place of `uv run python -m memory …`. That is
Desktop adapting to a Core that has already shipped, not a Core change, so it is consistent with the
Navigator's rule. It is recorded here for a decision and is not planned.

**Decision (2026-10-28):** path b. DS-005 comes first. Its first step is a read-only compatibility audit, under the invariant that the Navigator's current installation must keep working.

**Decision (2026-10-28, later the same day):** [freeze 0.2, build a 0.3 line on an embedded TypeScript
Mirror](decision-2026-10-28-the-0-3-line.md). DS-001 belongs to the 0.2 line. DS-002 to DS-004 are rebuilt on 0.3 as phase 3 of DS-005.

## Done (2026-11-03)

Closed by the Navigator: *"O CV10 já não está pronto? Considero pronto aqui do meu lado. A não ser
pela demanda de tornar o Pi embedded."*

- **What was delivered** is DS-005, the 0.3 line: an embedded TypeScript Mirror, a first-run
  assistant that installs Pi, creates or adopts a home and connects providers (phase 3, accepted on
  the clean `mirror` account on 2026-10-30), and production moved onto it (phase 5).
- **DS-002 to DS-004** were rebuilt as DS-005 phase 3 and are not separate stories any more.
  **DS-001** belongs to the 0.2 line; on 0.3, its outcome is DS-005 phase 5a.
- **The Done Condition says "signed".** Signing was always CV-009's, outside this CV's Boundary, and
  waits on Apple. The Navigator accepted CV-010 on the unsigned build.
- **Pi is not embedded.** The assistant installs a pinned Pi into a folder the app owns, and the app
  runs it as a separate CLI. Embedding it, as the TypeScript Mirror is, is the Navigator's next
  relevant demand, captured as [CV-011](../cv-011-embedded-pi/index.md).
