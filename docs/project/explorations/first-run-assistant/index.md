[< Project roadmap](../../roadmap/index.md)

# Exploration: A First-Run Assistant for Mirror Desktop

**Status:** exploring — no Capability Value created, nothing built
**Opened:** 2026-10-27, by the Navigator, together with the Refinement Suspension
**Journey:** `mirror-desktop`

## Intent, in the Navigator's words

> Installing Mirror Desktop assumes Mirror is already installed. On first load, the app should guide
> the user through an assistant that installs whatever needs installing and, at the end, configures
> API keys and OAuth authentication together with the user.

This exploration maps the distance between that intent and today's code, so that the plan comes from
facts. Every claim below was read from source or measured on 2026-10-27. Where a fact is still unknown,
it says so.

## Where a new user stands today

Mirror Desktop's first screen is **Connect your Mirror**. It asks for three things a new user cannot
know: an absolute *Mirror source directory*, a *Mirror home directory*, and a *Mirror user* slug
(`src/app/App.tsx`, the `runtimeSetupVisible` branch). Validation
(`src-tauri/src/runtime_binding.rs`) then requires all of the following to **already exist**:

| Requirement | How it is checked today | On a clean Mac |
|---|---|---|
| Mirror Core checkout with `src/memory` and `pyproject.toml` | canonical directory + version read | absent |
| Core version inside `>=0.31.14,<0.32.0` | `config/runtime-compatibility.json` | — |
| Mirror home holding `memory.db` directly | canonical regular file | absent |
| `pi` **and** `node` in the same directory | searched in a fixed list of tool locations | absent |
| `uv` | same search | absent |
| at least one model in Pi's catalog | `Choose your model` screen | needs a credential |
| at least one Journey | Journey import | created by `memory init` |
| macOS ≥ 12 | compatibility file | usually true |

Every other screen after that assumes a working, credentialed Mirror. The **model** screen says,
verbatim: *"Mirror Desktop does not manage provider credentials."*

## What a new user has to do by hand today

From Mirror's own `docs/getting-started.md` (production checkout, read only):

1. Choose a subscription (Codex Plus recommended; Claude through Pi is billed at API rates).
2. Create an OpenRouter account, **add at least $5 in credits**, and generate a key. This step is
   required for embeddings and memory extraction.
3. Install `uv` (`curl … | sh`).
4. Install Pi (`curl -fsSL https://pi.dev/install.sh | sh`), which brings Node.
5. `git clone` Mirror, then `uv sync`.
6. `cp .env.example .env`, and set `MIRROR_USER` and `OPENROUTER_API_KEY`.
7. `uv run python -m memory init <name>`. This writes the identity templates, 12 personas and a
   starter Journey.
8. `uv run python -m memory seed`.
9. Open Pi and run `/login` for the chosen provider (OAuth in the browser).
10. Only then can Mirror Desktop be opened and the three fields filled in.

That is ten steps, four of them in a terminal, before the first screen of the app makes sense.

## The decisive finding: this already exists, on Windows

Mirror ships a **Windows installer plus an Electron "Frame"** that do almost exactly what the Navigator
describes (`installer/`, `frame/`, `docs/installer/README.md` in the Mirror repository):

- It detects Git, Node LTS, uv and Pi, and installs only what is missing.
- It clones the Mirror `stable` branch into an app-owned location and runs `uv sync`.
- It runs **guided onboarding**: it writes a validated `.env`, runs the real `memory init` and `seed`,
  takes the OpenRouter key in a password field that is never logged, and drives **Pi's own `/login`**
  through a terminal session, detecting completion by watching provider *names* appear in
  `~/.pi/agent/auth.json`. It never reads or touches the tokens.
- Every mutation goes through a **fixed-argv command allowlist** (`frame/main/command-registry.js`):
  `memory runtime status`, `init`, `seed`, `identity list`, and so on. No shell strings are built.
- Pi is **pinned** (`installer/pi-version.txt`), never `@latest`, because automating `/login` depends
  on the surfaces of a specific Pi version.
- It writes an installation log without secrets, and offers a terminal shortcut as an independent
  recovery route.

**macOS has none of it.** So the work here is not to design onboarding from nothing. It is to bring a
sequence that has already been proven on Windows into Mirror Desktop on macOS, in Tauri and Rust,
inside the boundaries this application already enforces (CR149 serialisation, bounded child processes
from CR163, channel isolation).

The September migration exploration
(`docs/project/explorations/mirror-desktop-core-installer-and-tauri-app-migration/`) had already
placed this in Mirror Desktop's future: *"DS3 migrates onboarding, Pi authentication, health diagnosis
and recovery into Desktop, validates the complete new-user path and retires Electron Frame."* It
never became a roadmap item.

## Facts that shape the design

1. **Pi has no non-interactive login.** `pi auth` (Pi 1.4.0, measured) offers only `print-api-key`,
   `print-bearer-token` and **`check [--provider] [--json]`**. OAuth login exists only as the
   interactive `/login`, which is why the Frame drives it through a PTY. Mirror Desktop runs Pi in
   `--mode rpc`. Whether RPC mode can start a login is **unknown** and is the first technical question.
2. **`pi auth check --json` is a readiness probe we do not use yet.** It also refreshes expired OAuth.
   The silent refusals of 2026-10-22 were expired OAuth sessions: an assistant that checks provider
   readiness would also have prevented them.
3. **API keys need no Pi login.** Pi accepts environment keys and `--api-key`. For users who choose an
   API key over a subscription, the flow is a password field and nothing more.
4. **Pi version skew.** Windows pins Pi `0.83.0`; this Mac runs Pi `1.4.0` from a Homebrew-managed
   global npm. A macOS assistant needs its own pin, and the binding's rule that `pi` and `node` share a
   directory has to hold for whatever location the assistant installs into.
5. **Core compatibility is a range, not a branch.** Cloning `stable` can land outside
   `>=0.31.14,<0.32.0`. The assistant should install a **pinned** Core version, the same way it pins
   Pi.
6. **Git is not free on a clean Mac.** `/usr/bin/git` is a stub that triggers the Xcode Command Line
   Tools install. Fetching a Core release archive instead of cloning would avoid that dependency
   entirely. Whether Mirror publishes such an archive is **unknown**.
7. **The app may not open at all.** Mirror Desktop is not signed or notarized (CV-009 is planned and
   not started). On a clean Mac, Gatekeeper blocks the first launch, **before any assistant can
   run**. That is likely the single largest piece of arrival friction, and no in-app work can fix it.
8. **Core-first rule (September exploration).** Anything the assistant needs that Core lacks — for
   example a single non-interactive "prepare this home" command — becomes a Core prerequisite with its
   own Mirror release. It is built in `mirror-dev`, never in the production checkout.

## Proposed shape — for decision, not yet planned

A new Capability Value, **CV-010 · First-Run Assistant**: *a person with nothing installed can go from
opening Mirror Desktop to a first answered turn without a terminal.*

| Slice | Outcome | Why in this order |
|---|---|---|
| **DS-001 · Readiness checklist** | The first screen lists every requirement as found or missing, in plain language, and connects automatically when everything is found. It replaces the three-path form for existing users. | No installs and low risk. It is useful immediately, and it is the instrument every later slice reports into. |
| **DS-002 · Install the toolchain** | The assistant installs uv, Node + Pi (pinned) and Mirror Core (pinned) into app-owned locations, with visible progress, a log without secrets, and resumable steps. | The largest share of the ten manual steps. |
| **DS-003 · Create the Mirror** | Name → `.env`, `memory init`, `memory seed`, and a first Journey, all through a fixed-argv allowlist. | Mirrors the Frame's proven sequence. |
| **DS-004 · Connect the providers** | OpenRouter key (required), then subscription OAuth through Pi's own `/login` or a provider API key. The step is verified with `pi auth check` and the model catalog. | The step the Navigator named last, and the one with the most unknowns. |
| **CV-009** (exists) | Signed and notarized, so the first launch is not blocked. | Without it, a new user never reaches DS-001. |

**Resumption point for CRs:** DS-001 shipping, unless the Navigator sets another.

## Recommended first move

**Walk the real path once, on a clean macOS user account, and record where it breaks.** The table
above is a desk reading. The walk turns it into measured friction:

- Does Gatekeeper block the app?
- Which installer asks for an administrator password?
- Does the Pi install script put `pi` and `node` together?
- How long does `uv sync` take?

Creating a test macOS user needs an administrator, so the Navigator does it. Within a session, I can
then read each step's outcome.

In parallel, and read only, three questions can be answered from source:

1. Can Pi in `--mode rpc` start a provider login, or does it need a PTY like the Frame uses?
2. Does Mirror publish a Core release archive, so that no git is needed?
3. Where does `pi.dev/install.sh` install, and does it keep `pi` and `node` side by side?

## Open questions for the Navigator

- **Who arrives first?** People with nothing installed, or Mirror users who only lack the Desktop?
  This decides whether DS-001's automatic connection or DS-002's installer is the first thing worth
  shipping.
- **Which subscription should the assistant recommend?** Mirror's guide says Codex Plus, and the
  refusals of 2026-10-22 showed how Anthropic's third-party billing surprises users.
- **Is CV-009 in scope for this effort**, given that it blocks the first launch?

## Provenance

Read on 2026-10-27:

- in this repository: `src/app/App.tsx`, `src-tauri/src/runtime_binding.rs`,
  `src-tauri/src/runtime_channel.rs` and `config/runtime-compatibility.json`;
- in the production Mirror checkout (read only, nothing modified): `docs/getting-started.md`,
  `docs/installer/README.md`, `installer/pi-version.txt`, `frame/README.md`,
  `frame/main/command-registry.js` and `frame/main/main.js`.

Measured on this Mac: `pi --version` 1.4.0, `pi auth --help`, the location of `pi` and `node`, and the
provider *names* in `~/.pi/agent/auth.json`. No credential was read.
