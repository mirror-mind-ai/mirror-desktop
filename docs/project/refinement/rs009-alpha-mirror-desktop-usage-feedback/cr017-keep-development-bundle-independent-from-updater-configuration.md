[< Refinement Workbench](../index.md)

# CR017 — Keep development bundle independent from updater configuration

## Problem

The canonical `npm run tauri:build:dev` command successfully produces a bundle with the
expected development identity, but the application aborts during Tauri setup before its
window becomes usable. The updater plugin is registered unconditionally while the Dev
configuration intentionally has no updater contract, so Tauri attempts to deserialize a
missing `plugins.updater` value as `null` and panics.

Observed during CR010 validation:

```text
Failed to setup app: error encountered during setup hook:
failed to initialize plugin `updater`:
Error deserializing 'plugins.updater' within your Tauri configuration:
invalid type: null, expected struct Config
```

## Expected Behavior

`Mirror Desktop Dev` starts successfully without inheriting or connecting to the signed
alpha updater lane. The updater plugin remains available in user/release builds whose
overlays provide an explicit endpoint and public key. Development-channel builds remain
visibly and structurally isolated.

## Impact

This blocks natural validation of CR010 and any future feature through the packaged Dev
application. The build can appear successful while producing an unusable validation
artifact.

## Plan Or Decision

Navigator authorized this CR as a prerequisite for CR010 validation.

1. Add a failing regression test proving updater initialization is conditional on the
   compiled runtime channel.
2. Register the Tauri updater plugin only outside `development-channel`.
3. Keep process and other plugins unchanged.
4. Build and launch `Mirror Desktop Dev.app` without alpha/private-test updater overlays.
5. Verify the Dev name, identifier, app-data isolation, successful process lifetime, and
   absence of stable app replacement.
6. Return to CR010's three-line Shift+Enter validation route after the Dev bundle opens.

## Acceptance Criteria

- `npm run tauri:build:dev` produces `Mirror Desktop Dev.app`.
- The bundle opens without updater configuration or setup panic.
- Its identifier remains `ai.mirrormind.desktop.dev`.
- Dev does not receive the alpha or private-test updater endpoint implicitly.
- User/release builds retain updater plugin registration.
- Existing automated tests and production frontend build remain green.

## Validation Route

Open the source-built Dev bundle directly. Pass requires the process to remain alive and
the `Mirror Desktop Dev` window to become usable. Inspect Runtime channel and verify the
isolated development identity. Then execute CR010's natural multiline-message route.

## Evidence

The initial Dev bundle compiled successfully but generated macOS crash report
`mirror-desktop-2026-09-09-154001.ips`. Direct terminal launch exposed the bounded updater
configuration panic quoted above.

TDD established the channel contract before implementation. The focused TypeScript test
failed because no channel capability guarded updater initialization. Implementation adds
`RuntimeChannel::supports_updater()`, returns true only for `User`, and conditionally
registers the plugin during setup. The development feature therefore starts without an
updater config while signed user/release overlays retain registration.

Implementation evidence:

- focused runtime-channel and CR010 message-rendering suite: 18 tests passed;
- focused Rust runtime-channel suite: 8 tests passed;
- canonical `npm run tauri:build:dev` passed;
- complete frontend suite: 113 files and 627 tests passed;
- bundle identity: `Mirror Desktop Dev` / `ai.mirrormind.desktop.dev`;
- repaired DMG SHA-256:
  `75639cf787f2f85f5e33cdd6c58a18036928e4450a54134b3b42e0080ec7dcdd`;
- launch smoke remained alive as the Dev process and produced no new crash report.

No stable application, production Mirror database, updater endpoint, or release artifact
was modified. Navigator completed the natural Dev-bundle route and reported “Funcionou.
Validado.” The development launch behavior is explicitly accepted.

## Proportionality And Debt Review

The repair is proportional: one channel capability predicate controls one existing plugin
registration boundary. It avoids dummy keys, fake endpoints, duplicated Tauri configs,
and accidental connection from Dev to a signed release lane. Existing user/release
behavior is unchanged.

Review found one pre-existing adjacent ambiguity: generic user-channel source commands
register the updater without supplying an overlay. It is captured as CR018 and does not
block this development-channel repair.

## Outcome

The Navigator accepted the isolated Dev launch and the downstream CR010 multiline route.
CR017 is Done with no blocking debt. Driver is `@alissonvale`; Delivery is
`refinement/rs009-cr010-shift-enter-line-breaks`. Commit, push, publication, release, and
production promotion remain separately gated.

## Authority Boundary

This CR authorizes the approved local repair and Dev validation under the confirmed
assignment. It does not authorize commit, push, merge, publication, release,
updater endpoint mutation, or production promotion.
