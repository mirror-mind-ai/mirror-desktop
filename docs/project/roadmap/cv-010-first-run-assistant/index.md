[< Roadmap](../index.md)

# CV-010 - First-Run Assistant

**Status:** 🟡 Planned

## Outcome

A person opening Mirror Desktop for the first time is guided, without a terminal, from launch to a first answered turn: an existing Mirror is found and connected, and what is missing is installed and configured with them, including provider API keys and OAuth.

## Why This Matters

Mirror Desktop's first screen asks for three absolute paths and a user slug, and assumes a complete, credentialed Mirror already exists. Mirror's own guide reaches that state in ten manual steps, four of them in a terminal. The Windows installer and Frame already prove the guided sequence; macOS has none of it. Exploration: [First-Run Assistant](../../explorations/first-run-assistant/index.md).

## Operating Premise

Decided by the Navigator on 2026-10-27:

- **Existing Mirror users come first.** DS-001 serves a person who already has Mirror and only lacks the Desktop; installing from nothing follows.
- **Signing is in flight outside this CV.** Software Zen's Apple enrollment was submitted and awaits Apple's contact (CV-009). Nothing in CV-010 waits on it, but no new user can reach the assistant until a signed build ships.
- **No dependency on Mirror Core changes** (Navigator, 2026-10-27). CV-010 works with the Core releases that already exist: it reads what Core already writes, calls only commands Core already ships, and reproduces Core's documented resolution rules where it needs an answer Core gives only as text. Needs that would require a Core change are recorded as debt, not prerequisites. The production Mirror checkout is never modified.
- **Credentials stay with their owners.** Pi owns OAuth tokens in `~/.pi/agent/auth.json`; Mirror owns its `.env`. Desktop reads readiness, never secret values.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-010.DS-001](ds-001-find-and-connect-an-existing-mirror/index.md) | Find and Connect an Existing Mirror | A person with Mirror already installed opens the Desktop and sees their Mirror found, every requirement checked in plain language, and connects with one confirmation instead of typing paths | 🟠 Implemented |
| CV-010.DS-002 | Install the Toolchain | The assistant installs pinned uv, Node + Pi and Mirror Core into app-owned locations with visible, resumable progress and a log without secrets | 🟡 Candidate |
| CV-010.DS-003 | Create the Mirror | The assistant takes a name, writes the Mirror configuration, runs `init` and `seed` through a fixed-argv allowlist and opens a first Journey | 🟡 Candidate |
| CV-010.DS-004 | Connect the Providers | The assistant takes the OpenRouter key and connects a subscription through Pi's own login or a provider API key, verified by `pi auth check` and the model catalog | 🟡 Candidate |

## Done Condition

On a clean macOS user account, a person can install the signed Mirror Desktop, follow the assistant, and receive a first answered turn in a Journey without opening a terminal; and a person who already has Mirror connects without typing a path.

## Boundary

This capability does not sign or notarize the application (CV-009), modify the production Mirror checkout, read or display credential values, bypass Pi's own login, choose among several Mirror homes without the person's confirmation, support Windows or Linux, or retire the Windows Frame.
