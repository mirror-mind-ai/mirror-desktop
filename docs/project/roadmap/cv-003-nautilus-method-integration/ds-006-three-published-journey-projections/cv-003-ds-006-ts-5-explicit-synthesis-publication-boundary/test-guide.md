[< Story](index.md)

# Test Guide — CV-003.DS-006.TS-5

## Automated Validation

### Command contract

- `register` exposes `contract-smoke`, `publish-tactical` and `publish-strategic`.
- Publication commands require Journey and source snapshot identifiers.
- Candidate content is read from stdin and must be one JSON object.
- Unknown arguments, malformed JSON and non-object content fail before publication.

### Envelope and source ownership

- Publisher supplies contract/schema versions, Journey, altitude, namespace, projection, snapshot, generation time, producer and source revision.
- Tactical records Ariad Operational ancestry.
- Strategic records Ariad Operational and optional Nautilus Tactical ancestry.
- Candidate content cannot override any envelope field.

### Protocol behavior

- Valid Tactical and Strategic candidates publish and inspect successfully.
- Missing fields, unexpected fields, duplicate IDs and broken Evidence/Delivery or Realization/Impact relationships fail.
- JSON Schema and relational validator both run before publication.
- A rejected candidate preserves the prior stable document and manifest entry.

### Safety

- The extension uses only `memory.extensions.api.ExtensionAPI` from Mirror.
- No extension path invokes `api.llm`, Pi, a provider or a model.
- Receipts include status, projection, snapshot and source coordinates but no candidate content.
- Runtime asset hashes match their manifest and development sources.

## Driver E2E

Use an isolated Mirror home and synthetic Journey. Publish Tactical and Strategic candidates through the registered CLI handlers, inspect both through Extension API 1.1, then attempt an invalid replacement.

Expected observation:

```text
Tactical published with Operational ancestry
Strategic published with Operational and Tactical ancestry
invalid replacement rejected
last valid documents unchanged
provider calls: 0
```

## Pass Condition

All automated and isolated round-trip checks pass, the installed extension validates, and publication remains explicit and source-coordinate grounded.

## Fail Condition

Invalid meaning publishes, source ancestry is absent, candidate data gains envelope authority, last valid state changes on failure or any implicit provider invocation occurs.

## E2E Decision

Fixture-level E2E accepted under accelerated Driver validation because this story establishes deterministic publication mechanics, not live semantic-quality acceptance.
