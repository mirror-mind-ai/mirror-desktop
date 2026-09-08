[< Story](index.md)

# Test Guide — CV-007.DS-001

## Aggregate Validation

Validate that Mirror Desktop has a read-only trusted self-update discovery contract that can parse update manifests, decide compatibility and present update availability without downloading, installing, mutating files or touching Mirror state.

## Child Work Packages

- CV-007.DS-001.TS-1
- CV-007.DS-001.TS-2
- CV-007.DS-001.US-1

## Automated Checks

```bash
npm test -- src/tests/updateChannel.test.ts
npm run build
```

## Navigator Validation

Review:

- `src/domain/updateChannel.ts`;
- `src/tests/updateChannel.test.ts`;
- `docs/update/trusted-self-update.md`;
- this Delivery Story package and child story docs.

## Expected Observation

A manifest for `Mirror Desktop` with version `X.Y.Z`, tag `vX.Y.Z`, full revision, HTTPS release notes, HTTPS provenance receipt, SHA-256 digests and architecture-specific artifacts is accepted. Malformed manifests return `invalid`; non-newer versions return `current`; incompatible macOS, architecture or Mirror Core returns `incompatible`; compatible newer versions return `available` with release notes and no-download/no-installation messaging.

## Pass Condition

Focused tests and TypeScript build pass; docs explain the manifest and compatibility decision; the implementation has no network fetch, no file staging, no app replacement, no Mirror database access, no credential handling and no remote mutation.

## Fail Condition

Validation fails if malformed metadata is accepted, tag/version mismatch is allowed, unsupported architecture is treated as compatible, incompatible Mirror Core or macOS still offers an update, discovery downloads or installs anything, diagnostics require private coordinates, or this story implies signing, notarization, publication or self-update installation authority.

## Validation Evidence

Record only command statuses and the read-only discovery states. Do not record credentials, private paths, Mirror user slugs, Journey names, prompts, responses, database contents, identity documents or private channel details.
