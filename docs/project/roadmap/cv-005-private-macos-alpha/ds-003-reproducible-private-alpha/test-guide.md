[< Story](index.md)

# Test Guide - CV-005.DS-003

## Aggregate Validation

Prove that a maintainer can produce and privately deliver a revision-bound macOS bundle with a bounded tester route that allows an authorized tester to verify and operate it on an external supported host without source access, foreign Mirror state or destructive rollback.

## Child Work Packages

- CV-005.DS-003.TS-1
- CV-005.DS-003.US-1
- CV-005.DS-003.US-2
- CV-005.DS-003.TS-2

## Maintainer Automated Checks

From a clean authorized checkout, run:

```bash
npm ci
npm run alpha:preflight -- --mirror-root <maintainer-root> --mirror-home <maintainer-home> --mirror-user <maintainer-slug>
npm run alpha:preflight -- --json --mirror-root <maintainer-root> --mirror-home <maintainer-home> --mirror-user <maintainer-slug>
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check --locked
cd .. && uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
npm run tauri:build:user -- -- --locked
```

Automated and inspection evidence must prove:

- preflight accepts only macOS 12+ on `x86_64` or `arm64` and rejects unsupported build hosts before expensive work;
- revision and canonical origin are reported without credentials;
- dirty state is visible without leaking file content;
- committed JavaScript and Cargo lockfiles remain unchanged;
- required build tools and compatible Mirror rehearsal runtime are checked through bounded probes;
- JSON evidence omits absolute paths, environment values, user slugs, credentials and unbounded command output;
- stable identity is `Mirror Desktop` and `ai.mirrormind.desktop`;
- executable architecture matches the intended external host;
- required application resources are inside the bundle;
- SHA-256 is computed for the exact delivered `.dmg`;
- generated bundles and private evidence remain untracked.

## Static Privacy and Safety Review

Review the guide, rollback runbook, evidence template and retained receipts for:

- personal absolute paths, user slugs or relationship details;
- access tokens, provider keys or shell-profile exports;
- Journey names, prompts, responses, database contents or identity records;
- instructions to copy any Mirror state between people;
- recursive deletion of Mirror homes or application data;
- broad Gatekeeper disablement;
- claims of signing, notarization, publication, release or self-update authority.

Any occurrence outside an explicit negative test fails validation.

## Maintainer Build Rehearsal

1. Start from a clean committed revision and record its full hash.
2. Run human and JSON preflight with maintainer-local arguments; inspect retained JSON for redaction.
3. Run all automated gates and locked stable build.
4. Verify name, identifier, executable architecture and bundled provisioning resource.
5. Compute SHA-256 for the exact `.dmg` selected for external evaluation.
6. Confirm artifact and receipt contain no private state.
7. Confirm generated output remains ignored and the checkout remains clean.

## External Delivered-Bundle Route

This route requires explicit authorization to transmit an artifact. The tester does not receive source access or compile the application.

1. Receive the `.dmg`, exact source revision, architecture and expected SHA-256 through the authorized private channel.
2. Compute SHA-256 locally and require an exact match.
3. Confirm architecture matches the external Mac running supported macOS 12+.
4. Mount the image and copy **Mirror Desktop.app** to a dedicated test folder outside `/Applications` without replacing an existing app.
5. Use only the app-specific unsigned opening flow; preserve global Gatekeeper policy.
6. Complete **Connect your Mirror** using only the tester's own runtime.
7. Confirm native Pi/Node discovery, Pi-owned model selection and automatic real registry import.
8. Complete one harmless disposable Journey turn through Pi completion and Mirror recording.
9. Quit and reopen the same copied app; confirm binding, model, generation and turn continuity.
10. Inspect rollback without deleting app data, a Mirror home, `memory.db` or Nautilus Harness.
11. Return only the bounded evidence template.

## Expected Observation

A clean maintainer revision produces a host-native unsigned bundle whose checksum survives private transport. The tester reaches normal Journey operation without build tooling or unpublished source steps. Their runtime and content remain local, restart preserves continuity, and rollback removes only delivered artifacts.

## Pass Condition

All maintainer checks pass; artifact revision, identity, architecture, resources and checksum are recorded; the artifact is privately handed off to an authorized tester with checksum and bounded operating instructions; maintainer-side evidence passes privacy review; and predecessor or durable state remains unchanged outside documented boundaries. Returned tester evidence may be recorded later as alpha feedback, but it is not required for this Delivery Story to pass.

## Blocked Condition

Keep the Delivery Story open when no authorized private transmission exists, when maintainer gates fail, when artifact identity or checksum cannot be verified, or when the package lacks a bounded tester route. The Big Sur experiment remains compatibility evidence only and does not expand the supported macOS contract.

## Fail Condition

Validation fails if checksum or architecture differs, the artifact depends on the build checkout, the guide requires undocumented repair, preflight or evidence leaks private state, lockfiles drift, identity is wrong, binding falls back to another runtime, Journey operation requires copied state, restart loses continuity, rollback deletes durable state, or unsigned/private limitations are misrepresented.

## Validation Evidence

Record only:

```text
exact source revision
build-host architecture and bounded macOS version
maintainer gate statuses
bundle identity, architecture, resources and SHA-256
private handoff status
bounded tester-route availability
optional external host architecture and bounded macOS version when returned
optional received checksum match when returned
optional binding, Pi/Node discovery, model and registry statuses when returned
optional completed disposable turn and restart statuses when returned
rollback inspection
accepted result or bounded blocker
```

Do not record credentials, private paths, environment dumps, user slugs, Journey names, prompts, responses, identity documents, relationships or database contents.
