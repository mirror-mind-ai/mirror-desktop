[< Roadmap](../index.md)

# DS-011 — Isolated Development and User App Environments

**Status:** 🟠 In Progress

---

## Outcome

Nautilus Harness has two unmistakable local application channels: a stable user app for daily use and an isolated development app for building and testing Harness changes through the Mirror Dev code, home and database established by `~/mirror-dev.sh`. Both can be installed and opened side by side without one replacing the other or sharing Harness-owned runtime state, Mirror conversations or memory data by accident.

## Product Lens

Developing the desktop app must not make the Navigator wonder which window is safe for daily work. The user channel should remain calm and stable while the development channel declares itself immediately through its application identity, icon and visual treatment.

The distinction must be structural before it is cosmetic. A different color alone is insufficient if both channels still resolve to the same bundle identity, application-data directory or local conversation files.

## Scope

- Give the user and development channels distinct Tauri bundle identifiers and product names.
- Ensure development builds and launches do not overwrite, replace or masquerade as the user application.
- Route Harness-owned application data to separate channel-specific roots, including settings, Journey registry projections, dedicated thread/generation records, local conversations and Pi session artifacts.
- Bind the development channel to the same Mirror development runtime used by `~/mirror-dev.sh`: code from `~/Code/mirror-dev`, `MIRROR_HOME=~/.mirror-minds/mirror-dev`, `MIRROR_USER=mirror-dev` and `DB_PATH=~/.mirror-minds/mirror-dev/memory.db`.
- Keep the stable user channel bound to the stable Mirror runtime and user Mirror home; development must never provision or record its dedicated conversations in the user's production Mirror database.
- Provide explicit development commands and configuration so ordinary development does not require editing the user-channel manifest by hand or remembering to export Mirror development variables manually.
- Give the development app a distinct application icon visible in Finder, Dock, window switching and system surfaces.
- Apply a persistent development visual identity inside the app, including a clearly different accent/theme and a compact `DEV` indicator that cannot be confused with Journey state.
- Keep application behavior and feature contracts equivalent across channels unless a difference is explicitly channel-owned.
- Expose enough runtime identity for tests and diagnostics to prove which channel and data root are active.
- Provide one concise, canonical development-environment guide that a human or coding agent can follow from prerequisites through first verified launch without relying on conversation history or machine folklore.
- Fail closed when a development launch resolves to the user bundle identity or user Harness data root.

## Mirror Development Runtime Contract

`~/mirror-dev.sh` establishes the existing machine-local development boundary:

```text
Mirror code   ~/Code/mirror-dev
MIRROR_HOME   ~/.mirror-minds/mirror-dev
MIRROR_USER   mirror-dev
DB_PATH       ~/.mirror-minds/mirror-dev/memory.db
```

The Nautilus development channel must inherit these same coordinates for Pi invocation, Mirror context loading, Journey inspection, dedicated Mirror conversation provisioning and conversation recording. It may encode the contract in a shared launcher/configuration boundary rather than literally nesting `mirror-dev.sh`, but it must produce equivalent runtime identity and fail closed if it falls back to the stable Mirror installation or production database.

The stable user channel keeps its existing stable Mirror runtime coordinates. Harness channel identity and Mirror runtime identity must agree before a dedicated thread is considered ready.

## Isolation Boundary

The channel split protects Harness-owned installation and local runtime state and also separates the Mirror runtime/database used by agent work. It does not silently duplicate source Journey repositories or selected attachment files. A development Journey registry or fixture corpus must be derived from the Mirror development home, never copied implicitly from user-channel Harness state.

No automatic migration, copying or synchronization may move user-channel conversations, settings, credentials, dedicated generation records or Mirror memories into the development channel.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-011.TS-1 | Desktop Channel Identity Contract | Technical Story | User and development apps have stable, inspectable and non-colliding names, bundle identifiers and runtime channel metadata | 🟡 Planned |
| DS-011.TS-2 | Channel-Specific Harness and Mirror Runtime Roots | Technical Story | Harness state, Pi artifacts, Mirror code/home/user/database and dedicated conversations cannot cross channels accidentally | 🟡 Planned |
| DS-011.US-1 | Run Stable and Development Apps Side by Side | User Story | Navigator can keep the daily-use app open while launching the development app without replacement or state collision | 🟡 Planned |
| DS-011.US-2 | Recognize Development Mode at a Glance | User Story | Development mode has a distinct icon, accent palette and persistent `DEV` identity inside the window | 🟡 Planned |
| DS-011.TS-3 | Reproducible Development Launch and Build | Technical Story | Repository commands select the development manifest, app identity and `mirror-dev.sh`-equivalent Mirror environment without manual production edits | 🟡 Planned |
| DS-011.TS-4 | Channel Isolation Guardrails | Technical Story | Automated and desktop checks fail when bundle identity, Harness data roots, Mirror runtime coordinates or visible channel identity converge unexpectedly | 🟡 Planned |
| DS-011.US-3 | Inspect Active Runtime Channel | User Story | Navigator and diagnostics can verify the active channel and local state root without guessing from process ancestry | 🟡 Planned |
| DS-011.US-4 | Build a Development Environment from One Guide | User Story | A human or coding agent can construct and verify an isolated Nautilus Dev plus Mirror Dev environment from one concise canonical document | 🟡 Planned |

## Done Condition

DS-011 is done when the installed user app and a development build can run simultaneously; each has a distinct system name, bundle identifier, icon and unmistakable in-app appearance; each writes only to its own Harness application-data root; the development app invokes Pi and provisions/records conversations exclusively through the `~/Code/mirror-dev` and `~/.mirror-minds/mirror-dev` runtime established by `~/mirror-dev.sh`; restarting, resetting or exercising development state leaves the user app's settings, generations and production Mirror database unchanged; normal development uses documented deterministic commands; one concise guide enables both a human and a coding agent to construct and verify the environment without hidden context; and automated plus real desktop evidence proves app-channel and Mirror-runtime identity fail closed.
