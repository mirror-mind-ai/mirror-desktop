[< Roadmap](../index.md)

# DS-011 — Isolated Development and User App Environments

**Status:** 🟡 Planned

---

## Outcome

Nautilus Harness has two unmistakable local application channels: a stable user app for daily use and an isolated development app for building and testing Harness changes. Both can be installed and opened side by side without one replacing the other or sharing Harness-owned runtime state by accident.

## Product Lens

Developing the desktop app must not make the Navigator wonder which window is safe for daily work. The user channel should remain calm and stable while the development channel declares itself immediately through its application identity, icon and visual treatment.

The distinction must be structural before it is cosmetic. A different color alone is insufficient if both channels still resolve to the same bundle identity, application-data directory or local conversation files.

## Scope

- Give the user and development channels distinct Tauri bundle identifiers and product names.
- Ensure development builds and launches do not overwrite, replace or masquerade as the user application.
- Route Harness-owned application data to separate channel-specific roots, including settings, Journey registry projections, dedicated thread/generation records, local conversations and Pi session artifacts.
- Provide explicit development commands and configuration so ordinary development does not require editing the user-channel manifest by hand.
- Give the development app a distinct application icon visible in Finder, Dock, window switching and system surfaces.
- Apply a persistent development visual identity inside the app, including a clearly different accent/theme and a compact `DEV` indicator that cannot be confused with Journey state.
- Keep application behavior and feature contracts equivalent across channels unless a difference is explicitly channel-owned.
- Expose enough runtime identity for tests and diagnostics to prove which channel and data root are active.
- Fail closed when a development launch resolves to the user bundle identity or user Harness data root.

## Isolation Boundary

The channel split protects Harness-owned installation and local runtime state. It does not silently duplicate source repositories, selected attachment files or canonical Mirror data. Any development-specific Mirror home, fixture registry or test Journey corpus must be explicit during planning rather than inferred from color or process environment.

No automatic migration, copying or synchronization may move user-channel conversations, settings, credentials or dedicated generation records into the development channel.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-011.TS-1 | Desktop Channel Identity Contract | Technical Story | User and development apps have stable, inspectable and non-colliding names, bundle identifiers and runtime channel metadata | 🟡 Planned |
| DS-011.TS-2 | Channel-Specific Local State Roots | Technical Story | Harness-owned settings, conversations, registries, threads, generations and Pi artifacts cannot cross channels accidentally | 🟡 Planned |
| DS-011.US-1 | Run Stable and Development Apps Side by Side | User Story | Navigator can keep the daily-use app open while launching the development app without replacement or state collision | 🟡 Planned |
| DS-011.US-2 | Recognize Development Mode at a Glance | User Story | Development mode has a distinct icon, accent palette and persistent `DEV` identity inside the window | 🟡 Planned |
| DS-011.TS-3 | Reproducible Development Launch and Build | Technical Story | Repository commands select the development manifest, identity and data root without manual production configuration edits | 🟡 Planned |
| DS-011.TS-4 | Channel Isolation Guardrails | Technical Story | Automated and desktop checks fail when bundle identity, data roots or visible channel identity converge unexpectedly | 🟡 Planned |
| DS-011.US-3 | Inspect Active Runtime Channel | User Story | Navigator and diagnostics can verify the active channel and local state root without guessing from process ancestry | 🟡 Planned |

## Done Condition

DS-011 is done when the installed user app and a development build can run simultaneously; each has a distinct system name, bundle identifier, icon and unmistakable in-app appearance; each writes only to its own Harness application-data root; restarting, resetting or exercising development state leaves the user app's settings and conversation generations unchanged; normal development uses documented deterministic commands; and automated plus real desktop evidence proves channel identity and isolation fail closed.
