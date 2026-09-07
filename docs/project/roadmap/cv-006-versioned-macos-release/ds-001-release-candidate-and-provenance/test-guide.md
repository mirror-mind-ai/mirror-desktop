[< Story](index.md)

# Test Guide — CV-006.DS-001

## Aggregate Validation

Validate that Mirror Desktop now has a documented, deterministic and read-only release-candidate provenance route before any tag, release artifact publication, signing, notarization or self-update authority exists.

## Child Work Packages

- CV-006.DS-001.TS-1
- CV-006.DS-001.US-1
- CV-006.DS-001.TS-2
- CV-006.DS-001.US-2

## Automated Checks

```bash
npm test -- src/tests/releaseCandidate.test.mjs
npm run build
npm run release:candidate
npm run release:candidate -- --json \
  --artifact 'Mirror Desktop_0.1.0_x64.dmg' \
  --architecture x64 \
  --sha256 '<64-character sha256>'
```

## Navigator Validation

Review:

- `docs/release/versioned-macos-release.md`;
- `scripts/release_candidate.mjs`;
- `package.json` script `release:candidate`;
- this Delivery Story package and its child work packages.

## Expected Observation

The release-candidate route derives one version from the coordinated app metadata, one `vX.Y.Z` tag, one full source revision, one architecture-specific artifact name and one privacy-safe provenance receipt. The route is inspectable before promotion and explicitly says it does not create tags, publish releases, push, sign, notarize or implement self-update.

## Pass Condition

Focused tests and build pass; the inspection command renders bounded release-candidate metadata; docs explain version/tag authority, artifact naming, provenance, promotion and rollback; generated binaries are not committed; and all release, signing, notarization and self-update actions remain explicit future authorities.

## Fail Condition

Validation fails if source version files can disagree silently, tag naming is ambiguous, provenance requires private paths or credentials, the script mutates Git or remotes during inspection, generated binaries are treated as ordinary source files, rollback is absent, or the story implies signing, notarization, public distribution or self-update authority.

## Validation Evidence

Record only command statuses, version, tag, revision, artifact name, architecture, checksum, promotion decision and rollback target. Do not record credentials, private paths, Mirror user slugs, Journey names, prompts, responses, database contents, identity documents or private release-channel details.
