[< Story](index.md)

# Test Guide — CV-007.DS-002

## Aggregate Validation

Validate that Mirror Desktop now has a deterministic verified-installation and recovery contract for self-update: exact consent, quiescence, staged checksum verification, apply planning and rollback preservation, without live application replacement in automated tests.

## Child Work Packages

- CV-007.DS-002.US-1
- CV-007.DS-002.TS-1
- CV-007.DS-002.TS-2
- CV-007.DS-002.TS-3
- CV-007.DS-002.US-2

## Automated Checks

```bash
npm test -- src/tests/updateInstallation.test.ts
npm run build
```

## Navigator Validation

Review:

- `src/domain/updateInstallation.ts`;
- `src/tests/updateInstallation.test.ts`;
- `docs/update/trusted-self-update.md`;
- this Delivery Story package and child story docs.

## Expected Observation

Consent must match the exact available version and artifact checksum. Active Pi runs, pending conversation commits, pending projection writes and active file snapshots block apply. Staged bytes must match the manifest SHA-256 before an apply plan exists. Apply and rollback plans preserve Mirror homes, `memory.db`, runtime binding, Journey registry and conversations, Mirror Desktop app data and Nautilus Harness state.

## Pass Condition

Focused tests and TypeScript build pass; docs explain verified installation and recovery; the implementation has no live network download, no application replacement, no Mirror database access, no credential handling, no app data deletion and no remote mutation.

## Fail Condition

Validation fails if mismatched consent is accepted, unsafe native operations allow apply, checksum mismatch produces a verified artifact, rollback targets Mirror state, diagnostics require private coordinates, or this story claims live update installation without a real release candidate and explicit installation environment.

## Validation Evidence

Record only command statuses, consent match behavior, quiescence decisions, checksum verification behavior, apply-plan preservation targets and rollback preservation targets. Do not record credentials, private paths, Mirror user slugs, Journey names, prompts, responses, database contents, identity documents or private channel details.
