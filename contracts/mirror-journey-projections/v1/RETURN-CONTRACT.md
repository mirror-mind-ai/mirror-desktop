# Mirror Journey Projection Contract v1: Return Contract

## Purpose

This document defines the evidence required before Nautilus may consume the Journey Projection capability. The external Mirror implementation session fills a return record after completing its full development and release lifecycle. Nautilus reruns the unchanged probe locally before opening the gate.

## Gate Rule

The gate begins `blocked` and remains blocked unless all required evidence is present and the unchanged consumer probe reports `passed` against the installed released runtime.

A merge, green repository tests, release tag or claimed installation is insufficient alone.

## Required Return Record

Create `mirror-return.json` beside this file using this shape:

```json
{
  "contractId": "mirror.journey-projections",
  "contractVersion": "1.0",
  "mirrorVersion": "",
  "mirrorCommit": "",
  "releaseTag": "",
  "centralRepositoryUrl": "",
  "ci": {
    "status": "",
    "url": ""
  },
  "extensionApiVersion": "",
  "production": {
    "backupStatus": "",
    "backupReference": "",
    "migrationStatus": "",
    "installedVersion": ""
  },
  "consumerProbe": {
    "sha256": "",
    "command": "",
    "result": "",
    "resultArtifact": ""
  },
  "operationalFixture": {
    "result": "",
    "snapshotId": "",
    "sourceRevision": ""
  },
  "knownDeviations": [],
  "gate": "blocked"
}
```

Do not place secrets, environment dumps, production database content, prompts, responses, transcript bodies or private Journey content in the return record.

## Evidence Requirements

### Source and release

- `mirrorVersion` equals the version published by the central repository.
- `mirrorCommit` is the immutable implementation commit.
- `releaseTag` resolves to that release.
- `centralRepositoryUrl` identifies the published release.
- CI is green and has a durable URL or equivalent reference.

### Public contract

- Capability discovery reports `mirror.journey-projections` version `1.0`.
- `extensionApiVersion` is recorded and documented in Mirror release notes.
- Any deviation from the contract is listed. An unresolved normative deviation keeps the gate blocked.

### Production transition

- Production database backup is completed before migration or update when state may be touched.
- Migration status is `not_required` or a completed migration reference.
- Installed runtime version equals the released version.
- Installed capability discovery is executed from the real runtime installation, not a source checkout substitute.

### Unchanged probe

Before transferring to the Mirror session, record:

```bash
shasum -a 256 probe/contract_probe.py tests/fake_mirror.py tests/test_contract_probe.py
```

The returning probe hash MUST match. Mirror implementation work MUST NOT edit this consumer package to obtain a pass. If the contract requires revision, return to Nautilus for an explicit contract change and new version or approved amendment.

The Mirror session may copy the package into an external test location, but the authoritative files remain here.

### Installed-runtime acceptance

After production update, Nautilus runs the probe using an isolated temporary Mirror home and the installed Mirror executable. The probe MUST report:

```json
{
  "contractId": "mirror.journey-projections",
  "contractVersion": "1.0",
  "result": "passed",
  "gate": "open"
}
```

The probe must not use production data. Production-return mode means testing the installed binary, not the production database.

## Pre-Release Baseline

Before the capability exists, the expected result is:

```json
{
  "contractId": "mirror.journey-projections",
  "contractVersion": "1.0",
  "result": "contract_unavailable",
  "gate": "blocked"
}
```

This proves the probe can recognize absence. It does not satisfy the return gate.

## Gate Opening Checklist

- [ ] Contract package hash unchanged.
- [ ] Mirror implementation commit recorded.
- [ ] CI green.
- [ ] Version and release tag published centrally.
- [ ] Release notes name contract and Extension API versions.
- [ ] Production backup recorded or explicitly not required with rationale.
- [ ] Migration complete or `not_required`.
- [ ] Installed runtime reports the released version.
- [ ] Installed capability discovery reports contract `1.0`.
- [ ] Consumer probe self-tests pass unchanged.
- [ ] Consumer probe against installed runtime reports `passed`.
- [ ] Operational fixture matches expected normalized content.
- [ ] No unresolved normative deviation.
- [ ] `mirror-return.json` sets `gate` to `open`.

## Failure and Return

If any item fails, keep `gate: blocked` and record only bounded diagnostics. Nautilus Protocol, Method, Mirror Extension and Harness projection implementation MUST NOT begin.

If Mirror finds the contract unsafe or infeasible, it returns a proposed amendment rather than silently changing public behavior. Navigator approval and an updated consumer package are required before retry.
