# Mirror Journey Projection Contract v1

Status: consumer proposal

Contract identifier: `mirror.journey-projections`

Contract version: `1.0`

## Normative Language

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT and MAY are normative requirements.

## Purpose

Mirror Journey Projection Contract v1 gives local consumers and installed Mirror extensions a stable, secure way to publish and inspect versioned JSON read models inside a registered Journey. It also defines the Ariad-owned deterministic Operational projection.

This contract is consumer-driven. It specifies public behavior, not internal modules or implementation architecture.

## Ownership

Ariad documents and durable lifecycle records remain the mutation authority for Operational state. The Operational projection is the canonical published read model for consumers, not a write-back source.

An extension owns only projections in its implicit extension namespace. Tactical and Strategic semantics remain outside Mirror Core. A persona MAY shape interpretation but MUST NOT receive filesystem publication authority.

Harness and other consumers read projections. They MUST NOT mutate Ariad or extension state by editing projection JSON.

## Storage Model

The canonical storage location is relative to the registered Journey root:

```text
.mirror/projections/
  current.json
  ariad/
    operational.json
  <extension-id>/
    <projection-id>.json
```

A production caller supplies `journeyId`, never a root path. Mirror resolves the registered root and performs canonical confinement after resolving existing filesystem components.

Namespace and projection identifiers MUST match:

```text
^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$
```

Absolute paths, separators, `..`, empty segments, symlink escapes and paths resolving outside the registered root MUST be rejected before publication. Existing symlinks anywhere in the projection path MUST NOT be followed outside the root.

The `ariad` namespace is reserved to Mirror Core. Extension namespaces are bound to `ExtensionAPI.extension_id`. Extensions MUST NOT select or impersonate another namespace.

## Public Capability Discovery

The installed Mirror runtime MUST expose:

```bash
python -m memory journey-projection capabilities \
  --mirror-home <home> \
  --format json
```

Successful output:

```json
{
  "contractId": "mirror.journey-projections",
  "contractVersion": "1.0",
  "extensionApiVersion": "<installed-version>",
  "operations": [
    "capabilities",
    "rebuild-operational",
    "inspect"
  ]
}
```

Unknown command, missing JSON, incompatible major version or a different contract identifier means the capability is unavailable or nonconformant. Additive fields and additive operations are compatible within v1. Consumers MUST reject a different major contract version.

## Projection Envelope

Every projection MUST conform to `schemas/envelope.schema.json` and a domain schema.

Required identity fields are:

- `contractVersion`
- `schemaVersion`
- `journeyId`
- `altitude`
- `namespace`
- `projection`
- `snapshotId`
- `generatedAt`
- `producer`
- `sourceRevision`
- `sourceSnapshots`
- `content`

`generatedAt` MUST be a UTC timestamp ending in `Z`. `sourceRevision` MUST be a stable fingerprint of represented source state. A snapshot identifier MUST identify immutable published content. Reusing a snapshot ID for different bytes is forbidden.

Serialization MUST use UTF-8 JSON, sorted object keys, two-space indentation and one trailing newline. Equivalent deterministic input MUST produce byte-identical output except for fields whose source truth changed.

## Manifest

`.mirror/projections/current.json` MUST conform to `schemas/manifest.schema.json`.

Each key is `<namespace>:<projection>`. Each value points to the currently published snapshot and records its `sourceRevision`.

A manifest entry MUST NOT point to a snapshot that has not reached its durability boundary. A successful publication makes snapshot and manifest mutually consistent before returning success.

## Atomic Publication

Publication MUST follow this observable sequence:

1. Resolve Journey and verify authority.
2. Validate identifiers and canonical confinement.
3. Validate envelope and domain schema.
4. Serialize deterministic bytes.
5. Write a temporary file inside the target directory.
6. Flush and close according to the platform durability boundary.
7. Atomically replace the projection file.
8. Build and validate the next manifest.
9. Publish the manifest through the same temporary-write and atomic-replace discipline.
10. Return a structured success result.

Invalid input MUST NOT change projection or manifest bytes. Failure before projection replacement MUST leave both unchanged. Failure after projection replacement but before manifest replacement MUST preserve the previous manifest and return actionable divergence. Implementations SHOULD retain enough information to repair the unreferenced snapshot, but MUST NOT silently report success.

The last manifest-referenced projection is the last valid consumer state.

Publication MUST NOT invoke a model, provider, Pi, Mirror Mode, persona, network service or hidden synthesis. It MUST NOT persist prompts, responses, transcript bodies, raw reasoning, secrets or arbitrary environment variables.

## Structured Results

Successful operations return JSON with `status` and relevant identity:

```json
{
  "status": "published",
  "journeyId": "example",
  "namespace": "ariad",
  "projection": "operational",
  "snapshotId": "op-123",
  "sourceRevision": "sha256:..."
}
```

Failures return nonzero and a JSON error on stdout or stderr:

```json
{
  "status": "error",
  "code": "unsafe_projection_path",
  "message": "bounded non-private diagnostic"
}
```

Stable v1 error codes MUST cover unsupported contract, unknown Journey, invalid identifier, unsafe path, namespace violation, schema failure, serialization failure, publication failure and projection divergence.

## Ariad Operational Projection

Ariad is the exclusive producer of:

```text
namespace: ariad
projection: operational
altitude: operational
producer.kind: ariad
```

The content MUST conform to `schemas/operational.schema.json` and contain:

### Roadmap

A nested forest rooted in Capability Values. Node types are:

- `capability_value`
- `delivery_story`
- `user_story`
- `technical_story`

Each node contains ID, type, title, normalized status, outcome, index path, artifact references and children. References are Journey-relative paths. File bodies are not copied into the projection.

### Active Work

Active Ariad item, checkpoint, pending confirmation and runtime status when present. `activeWork` is `null` when no durable active position exists. Environment variables and session-private content are excluded.

### Exploratory Stories

Each record contains durable story ID, title, status, summary, index path, attractors, experiments and optional handoff reference. Full source conversations and private narrative evidence are excluded.

### Refinement Stories

Each record contains ID, title, status, index path and nested Change Requests with the same public metadata shape.

### Determinism and Source Revision

The compiler MUST order roadmap roots and children by authored roadmap order when represented, otherwise by stable ID. Explorations and refinements MUST use stable documented order. The source revision MUST fingerprint all represented durable sources plus represented active state.

The compiler MUST support synthetic fixed time and snapshot inputs in test mode so the normative fixture can be byte-compared.

## Ariad Lifecycle Refresh

Mirror MUST expose:

```bash
python -m memory journey-projection rebuild-operational \
  --journey <journey-id> \
  --mirror-home <home> \
  --format json
```

Every successful Ariad lifecycle mutation that changes represented state MUST request deterministic refresh after durable truth commits. Explorer and Refinement mutations represented by the schema are included.

Refresh failure MUST NOT roll back already committed Ariad truth. It MUST preserve the previous manifest-referenced Operational projection and surface actionable divergence. Normal successful refresh is quiet.

Rebuild and lifecycle refresh MUST invoke no model.

## Inspection

Mirror MUST expose:

```bash
python -m memory journey-projection inspect \
  --journey <journey-id> \
  --namespace <namespace> \
  --projection <projection-id> \
  --mirror-home <home> \
  --format json
```

Inspection resolves Journey authority from the registry. It returns the validated document and current manifest entry. Missing, invalid or divergent files return structured errors and never trigger repair or synthesis implicitly.

## Extension API

`ExtensionAPI` MUST expose a stable `journey_projections` capability whose namespace is permanently bound to `api.extension_id`.

Required conceptual operations are:

```python
api.journey_projections.publish(
    journey_id: str,
    projection_id: str,
    document: Mapping[str, object],
    schema: Mapping[str, object] | None = None,
) -> ProjectionPublication

api.journey_projections.inspect(
    journey_id: str,
    projection_id: str,
) -> ProjectionInspection
```

Exact Python value types MAY follow Mirror conventions, but names, semantics and namespace binding MUST be documented as stable public API. Extensions MUST NOT import internal Journey, filesystem or builder modules.

The API verifies that envelope namespace and producer ID equal the bound extension ID. It validates the shared envelope plus an optional extension-owned domain schema. It cannot publish into `ariad` or another extension namespace.

A Tactical document SHOULD reference the Operational snapshot it interpreted. A Strategic document SHOULD reference Operational and MAY reference Tactical. Mirror stores these references but does not interpret their meaning or repair staleness.

## Test-Only Probe Preparation

To enable an unchanged black-box consumer probe, the installed runtime MUST expose the following operation only when `MEMORY_ENV=test` and the supplied Mirror home is not production:

```bash
python -m memory journey-projection probe-prepare \
  --fixture-root <synthetic-journey-root> \
  --active-state <synthetic-state-json> \
  --mirror-home <isolated-home> \
  --format json
```

This operation MAY accept an authoritative fixture root only in this constrained test mode. It registers or replaces the synthetic Journey, loads synthetic Ariad state and enables fixed IDs/timestamps from fixture expectations. It MUST refuse production mode or the configured production home.

The test runtime MAY expose `probe-publish` for black-box storage and schema checks. Such an operation MUST be unavailable outside test mode and MUST model an extension-bound namespace rather than grant production publication authority.

## Security Acceptance

Mirror Core tests and the external probe together MUST demonstrate:

- registered-root authority in production;
- traversal and absolute-path rejection;
- symlink escape rejection;
- implicit extension namespace ownership;
- reserved Ariad namespace protection;
- validation before write;
- last-valid preservation;
- manifest-after-snapshot ordering;
- production refusal of test-only operations;
- no model or network invocation;
- no production database requirement for the probe.

## Compatibility

Contract v1 allows additive capability metadata and new optional projection content only when existing strict schemas explicitly permit it. Breaking field, path, authority, atomicity or error semantics require a new major contract version.

Mirror release notes MUST identify the contract and extension API versions. Database migrations are not inherently required by this contract. If implementation introduces one, normal Mirror migration and backup policy applies.

## Consumer Gate

Nautilus MUST remain blocked until the unchanged probe passes against the installed released Mirror runtime and `RETURN-CONTRACT.md` is complete. Repository tests or release metadata alone do not prove the production return.

## Explicit Non-Goals

This contract does not define Nautilus Tactical or Strategic meaning, prompts, personas, Harness rendering, automatic semantic refresh, correction workflows, scores, confidence or checkpoint acceptance. It does not authorize projection write-back into Ariad.
