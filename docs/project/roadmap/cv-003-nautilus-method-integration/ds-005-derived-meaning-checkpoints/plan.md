# Delivery Story Plan — CV-003.DS-005

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Derived Meaning Checkpoints

## Objective

Complete Derived Meaning Checkpoints end to end by preserving the delivered read-only Harness projection while extending the canonical Tactical and Strategic Protocol and Mirror Extension publication boundary to validate and publish optional source-grounded checkpoints, then prepare a controlled `nautilus-harness` projection for Navigator validation without hand-editing published state.

## Child Work Packages

- TS-1
- US-1
- US-2
- US-3
- TS-2
- TS-3

## Validation Finding That Reopened This Story

The first implementation delivered the Harness read model and rendering surface, but Navigator validation found that no positive checkpoint example could be published canonically:

```text
Harness consumer
  accepts content.meaningCheckpoints

Agentic Protocol + installed Mirror Extension runtime
  content.additionalProperties = false
  does not define meaningCheckpoints
  therefore rejects canonical publication
```

A direct edit of `.mirror/projections/**` would bypass extension authority and is forbidden. This plan closes the missing publication boundary rather than weakening validation or fabricating a desktop-only state.

## Scope

### Canonical Protocol

Extend the canonical Tactical and Strategic JSON schemas in `agentic-protocol` with one shared checkpoint shape:

```text
meaningCheckpoint
  id                  required non-empty string
  title               required non-empty string
  summary             required non-empty string
  state               required enum
    provisional
    consolidated
    contested
    correction_requested
    stale
  sourceReferences    required non-empty string array
  correctionBoundary  optional non-empty string
```

`content.meaningCheckpoints` remains optional for backward compatibility and must be a non-empty array when present. Existing projections without checkpoints remain valid.

Extend the dependency-free Python validators so they:

- allow `meaningCheckpoints` only at the Tactical or Strategic content boundary;
- reject unknown checkpoint fields;
- reject missing identifiers, title, summary, state or source references;
- reject unsupported state values;
- validate optional `correctionBoundary` as a non-empty string;
- preserve all existing mission/evidence/deliverable and realization/impact relationship checks.

### Fixtures and compatibility

Update canonical Tactical and Strategic fixtures with representative source-grounded checkpoints. Add characterization tests for:

- provisional and consolidated states;
- correction boundary and source references;
- invalid state rejection;
- malformed checkpoint rejection;
- backward compatibility when `meaningCheckpoints` is absent.

The schema version remains `1` because the field is optional and backward compatible. No existing published document requires migration.

### Mirror Extension publication

Synchronize the canonical validators and schemas into `mirror-extension/runtime/` through `scripts/sync_runtime_assets.py`; do not edit runtime copies independently. Update the runtime manifest and compatibility tests.

Extend publication tests to prove:

- Tactical and Strategic candidates containing valid checkpoints are published unchanged inside extension-owned envelopes;
- invalid checkpoint states fail with `candidate_invalid` before publication;
- the last valid projection remains intact after rejection;
- candidate content still cannot supply Journey, snapshot, producer, namespace or ancestry authority;
- publication remains provider-free.

Update the extension skill guidance so optional checkpoint content is an explicit supported part of Tactical and Strategic candidate shapes and must remain source-grounded. This does not authorize automatic checkpoint generation.

### Controlled Navigator projection

After all suites pass, bind publication to the exact authorized Journey:

```text
JOURNEY_ID=nautilus-harness
```

Then:

1. inspect current Ariad Operational through the public Mirror projection API;
2. inspect the current Tactical and Strategic documents;
3. construct temporary candidate files outside the Journey by preserving their current content and adding only validation checkpoints grounded in DS-005 implementation, tests and protocol artifacts;
4. publish Tactical through `publish-tactical` using the inspected Operational snapshot;
5. inspect the new Tactical receipt and document;
6. publish Strategic through `publish-strategic` using the same Operational snapshot and the newly published Tactical snapshot;
7. inspect both final public coordinates and verify the manifest points to them;
8. delete temporary candidates;
9. restart or reload Harness and perform the positive visual validation.

The controlled content will include at least one `provisional` and one `consolidated` checkpoint so visual distinction can be validated, plus an explicit correction boundary that preserves source evidence. Consolidated labels may describe only already-proven implementation facts; Navigator acceptance itself must not be claimed before validation.

## Non-Goals

- No checkpoint creation, editing, approval or deletion controls in Harness.
- No direct edits to published projection files or manifest coordinates.
- No provider, Pi synthesis or Mirror Mode invocation to prepare validation content.
- No automatic checkpoint generation when Operational changes.
- No mutation or rewriting of cited source evidence.
- No new workflow for promoting provisional checkpoints to consolidated.
- No schema-version break or migration of existing checkpoint-free projections.
- No broad redesign of Tactical, Strategic or the synthesis extension.

## Acceptance Behavior

```text
Given a Tactical or Strategic candidate with valid meaningCheckpoints
When the extension validates and publishes it
Then the canonical public projection contains the checkpoints unchanged
And Journey, envelope, ancestry and snapshot authority remain extension-owned
```

```text
Given a checkpoint with an unsupported state or malformed source grounding
When publication is requested
Then publication fails before mutation
And the previous valid projection remains publicly inspectable
```

```text
Given an existing projection without meaningCheckpoints
When canonical Protocol and Harness normalization run
Then the projection remains valid
And Harness does not fabricate checkpoint content
```

```text
Given controlled source-grounded checkpoints published for nautilus-harness
When the Navigator opens Tactical and Strategic
Then checkpoint state, summary, source references and correction boundary are visible
And provisional and consolidated meanings are visibly distinct
```

```text
Given the Navigator only opens or reads a checkpoint surface
When no explicit synthesis-publication command is requested
Then no provider runs and no source or projection is mutated
```

## Implementation Sequence

1. Add failing Agentic Protocol schema and validator tests for optional valid checkpoints, invalid state, malformed records and absent-field compatibility.
2. Implement the shared checkpoint definition in Tactical and Strategic schemas and dependency-free validators.
3. Update canonical fixtures and run the complete Agentic Protocol suite.
4. Synchronize runtime assets into Mirror Extension and verify the manifest.
5. Add failing extension publication tests for valid and invalid checkpoint candidates, then implement compatibility through the synchronized runtime.
6. Update extension authoring guidance and runtime compatibility documentation.
7. Run Harness checkpoint normalization/rendering tests plus complete Harness, Protocol and Extension suites.
8. Publish controlled Tactical and Strategic validation projections only through the authorized extension commands and exact inspected ancestry.
9. Inspect final public coordinates and hand off the visual validation route to the Navigator.

## Validation Route

Automated:

```bash
cd agentic-protocol && uv run pytest
cd mirror-extension && uv run pytest
cd harness && npm test -- --run
cd harness && npm run build
```

Also run runtime-asset synchronization checks and targeted rejection tests proving failed publication preserves the prior projection.

Navigator desktop route:

1. reload `nautilus-harness` after the controlled publication;
2. open Tactical and locate **Meaning Checkpoints**;
3. confirm provisional and consolidated labels are visually distinct;
4. expand source evidence and confirm references remain readable;
5. confirm the correction boundary states that review appends without rewriting evidence;
6. open Strategic and verify its published checkpoint state and ancestry-backed sources;
7. switch altitudes and confirm no forms, mutation controls or provider activity appear.

Pass when both canonical publication and read-only visual rendering agree. Fail if publication rejects valid checkpoints, accepts invalid states, rewrites evidence, mutates without explicit command, fabricates absent content or requires a direct projection-file edit.

## Implementation Contract

- TDD for every Protocol, publication and rendering behavior change.
- Canonical source flows from `agentic-protocol` into synchronized extension runtime assets; never patch generated runtime copies alone.
- Extension publication owns envelope, ancestry, snapshot, revision and manifest authority.
- Candidates contain altitude `content` only and no private prompt, response, transcript, reasoning, secret or environment data.
- Exact Journey authority for the controlled publication is `nautilus-harness`; stop on any mismatch.
- Temporary validation candidates remain outside the Journey and are deleted after bounded receipts.
- Preserve the already-delivered Harness read model and all checkpoint-free compatibility.
- Do not proceed to publication unless Protocol, Extension and Harness checks are green.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
