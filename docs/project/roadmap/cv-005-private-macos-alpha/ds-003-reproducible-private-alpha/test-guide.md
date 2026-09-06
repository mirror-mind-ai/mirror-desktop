[< Story](index.md)

# Test Guide - CV-005.DS-003

## Aggregate Validation

Prove that one authorized collaborator can use only committed repository instructions and tools to move from private clone to a locally built, bound and operational macOS alpha, return safe evidence and remove or abandon the alpha without affecting Mirror or Nautilus Harness.

## Child Work Packages

- CV-005.DS-003.TS-1
- CV-005.DS-003.US-1
- CV-005.DS-003.US-2
- CV-005.DS-003.TS-2

## Automated Checks

From a clean clone or clean worktree, run:

```bash
npm ci
npm run alpha:preflight -- --mirror-root <root> --mirror-home <home> --mirror-user <slug>
npm run alpha:preflight -- --json --mirror-root <root> --mirror-home <home> --mirror-user <slug>
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check --locked
cd .. && uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
npm run tauri:build:user -- -- --locked
```

Automated evidence must prove:

- preflight accepts only macOS 12 or newer on `x86_64` or `arm64` and rejects Big Sur before dependency installation;
- source revision and canonical private origin are reported without credentials;
- dirty worktree state is visible but does not leak changed file content;
- `package-lock.json` and `src-tauri/Cargo.lock` are present and unchanged;
- Git, Node 20+, npm, Rust, Cargo, `uv`, Pi and Xcode Command Line Tools are detected through bounded argument-array probes;
- missing tools and unsuccessful probes produce one actionable failure and nonzero exit;
- runtime root, home and user must be supplied together;
- root, home and direct-child `memory.db` are canonical, non-symlink coordinates;
- Core compatibility uses the same `>=0.31.14,<0.32.0` authority as native binding;
- human output is useful locally while JSON evidence omits absolute paths, environment values, usernames, credentials and command output beyond bounded versions;
- stable bundle identity is `Mirror Desktop` and `ai.mirrormind.desktop`;
- executable architecture matches the host;
- no production script contains personal Mirror coordinates;
- generated `.app`, `.dmg`, preflight output and filled evidence remain untracked.

## Static Privacy Review

Review the canonical guide, rollback runbook, evidence template and fixtures for:

- personal absolute paths;
- access tokens, provider keys or shell-profile exports;
- conversation prompts or responses;
- database contents or identity records;
- instructions to copy a maintainer database;
- recursive deletion of Mirror homes or application data;
- broad Gatekeeper disablement;
- claims of signing, notarization or public support.

Any occurrence outside an explicit negative test fails validation.

## Internal Desktop Rehearsal

Expected duration is 15 to 30 minutes on a warm development machine. Notify the Navigator before opening windows or native folder selectors.

1. Start from a clean committed revision and record its short commit hash.
2. Run human and JSON preflight against the stable binding using local paths only on the command line. Inspect evidence to confirm those paths and the user slug are absent.
3. Run all automated gates and the locked stable build.
4. Verify `CFBundleName`, `CFBundleIdentifier` and executable architecture from the generated app.
5. Open the bundle directly from `src-tauri/target/release/bundle/macos/Mirror Desktop.app`, not `/Applications`.
6. Confirm the existing stable binding is `validated` without altering its bytes.
7. Start without a published registry, complete the app-owned **Connect your Mirror** gate and confirm it automatically imports the current user's registry without showing a fallback Journey or requiring `npm run import:mirror`; record only the expected root count.
8. Use a disposable Journey to complete one Pi and Mirror turn. Record only disposable Journey id, completion status and timestamps.
9. Close and reopen the bundle. Confirm the same Journey generation and completed turn remain available without recording message content.
10. Confirm Nautilus Harness remains independently launchable and no predecessor app-data path changed.
11. Confirm Git remains clean and generated bundles are ignored.

## External Collaborator Route

Expected duration is 30 to 60 minutes. This route requires separate authorization to push or transmit a revision and must be performed by an explicitly authorized private-repository collaborator on their own Mac.

The collaborator:

1. clones `https://github.com/mirror-mind-ai/mirror-desktop.git` into a new local directory;
2. checks out the authorized commit and confirms the origin without printing credentials;
3. follows `docs/alpha/private-macos-alpha.md` without oral corrections;
4. runs preflight with their own explicit Mirror coordinates;
5. makes shell-managed Node, Pi and `uv` visible from the documented trusted user location when needed, refreshes the Pi-owned provider catalog, installs JavaScript dependencies with `npm ci` and runs every documented gate;
6. builds the stable bundle for their host architecture without installing it globally;
7. opens the source-built app and explicitly binds their own Mirror installation;
8. imports their own registry and operates one disposable Journey through a completed Pi and Mirror turn;
9. restarts the app and confirms continuity;
10. follows the rollback inspection without deleting app data;
11. returns only `docs/alpha/evidence-template.md` with bounded statuses filled in.

No maintainer path, database, identity, credential or conversation is supplied to the collaborator.

## Expected Observation

The route is understandable without unpublished context. Preflight fails early and precisely when a prerequisite is absent. A ready machine produces a host-native unsigned bundle with Mirror Desktop identity. The collaborator's binding and Journey remain local, restart preserves continuity, and rollback leaves both Mirror and Nautilus Harness untouched.

## Pass Condition

All automated checks pass from a clean revision; internal rehearsal passes; the external collaborator completes the route without oral repair; bundle and architecture identity are correct; one disposable turn and restart continuity are confirmed; returned evidence passes privacy review; and no tracked or predecessor state is modified outside the documented boundaries.

## Blocked Condition

If no authorized external collaborator or push authorization exists, record local implementation as ready but keep the Delivery Story open at validation. A maintainer-only run cannot satisfy Done.

## Fail Condition

Validation fails if the guide requires undocumented steps, preflight leaks paths or secrets, lockfiles drift, a bundle has the wrong identity or architecture, binding falls back to another user, Journey operation requires copied private state, restart loses continuity, rollback deletes durable state, or unsigned source-build limitations are misrepresented.

## Validation Evidence

Record:

```text
source revision
host architecture and bounded macOS version
bounded tool versions or pass statuses
preflight result
frontend, Rust, Python and build results
bundle name, identifier and architecture
runtime binding status without coordinates
registry import status and root count only
disposable Journey id and completed-turn status without content
restart continuity result
rollback inspection result
collaborator acceptance or exact bounded blocker
```

Do not record credentials, absolute home paths, environment dumps, Journey names, prompts, responses, identity documents or database contents.
