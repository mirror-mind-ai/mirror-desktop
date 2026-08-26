# TD-001 — Operational Relative-Link Confinement Defect

## Status

- **State:** Resolved and consumer-verified
- **Severity:** High for published Operational consumers
- **Affected release:** Mirror `v0.31.10`
- **Resolved release:** Mirror `v0.31.11`
- **Immutable release SHA:** `c9519c30caac1522209a56840a09dabc123cead0`
- **Affected contract:** `mirror.journey-projections@1.0`
- **Affected component:** `memory.journey_projections.operational.OperationalCompiler`
- **Discovered by:** `CV-003.DS-006.TS-2 — Repository Baselines and Mirror Compatibility`
- **Consumer gate:** Open

## Summary

Mirror rejects a relative Markdown link containing a parent segment (`..`) before checking where the link canonically resolves. A link such as:

```markdown
[DS-001](../ds-001-inherited-desktop-agent-baseline/index.md)
```

is valid when its resolved target remains inside the registered Journey root. Mirror `v0.31.10` nevertheless returns `unsafe_projection_path`, so Ariad lifecycle commits succeed while the automatic Operational projection refresh fails. The last valid published projection is preserved but becomes stale.

## User-visible impact

After an Ariad lifecycle mutation for `nautilus-harness`, Mirror reports:

```text
Operational projection refresh failed after source commit: code=unsafe_projection_path
```

An explicit rebuild returns:

```json
{
  "code": "unsafe_projection_path",
  "message": "Durable Ariad source reference is outside the registered Journey.",
  "status": "error"
}
```

Consequences:

1. Ariad roadmap truth advances successfully.
2. `operational.json` does not advance to the new source state.
3. The last valid projection remains available but stale.
4. Tactical and Strategic synthesis cannot safely claim ancestry from the current Operational state.
5. Harness cannot rely on the released automatic-refresh behavior for this Journey.

No source commit is lost and no path outside the Journey is read.

## Preconditions

A registered Journey contains:

```text
<journey-root>/
  docs/project/roadmap/index.md
  docs/project/roadmap/cv-001-operable-agent-cockpit/index.md
  docs/project/roadmap/ds-001-inherited-desktop-agent-baseline/index.md
```

The root roadmap links to the capability package:

```markdown
[CV-001](cv-001-operable-agent-cockpit/index.md)
```

The capability package links back to a root-level delivery package:

```markdown
[DS-001](../ds-001-inherited-desktop-agent-baseline/index.md)
```

The canonical DS-001 target is still inside `<journey-root>`.

## Reproduction

Run against an isolated Journey fixture registered in an isolated Mirror home. Do not use production state for the regression test.

1. Create the directory structure and Markdown links described above.
2. Register the fixture Journey with `project_path` equal to its canonical root.
3. Invoke the public Operational rebuild command:

   ```bash
   uv run python -m memory journey-projection rebuild-operational \
     --journey confinement-probe \
     --mirror-home "$ISOLATED_MIRROR_HOME" \
     --format json
   ```

### Actual result in v0.31.10

- Exit code: `2`
- Error code: `unsafe_projection_path`
- No refreshed Operational projection is published.

### Expected result

- Exit code: `0`
- The relative link resolves canonically inside the registered Journey.
- The linked roadmap package is compiled into the Operational projection.
- The manifest and stable projection advance atomically.

## Root cause

`OperationalCompiler._resolve_link` classifies any target containing a `..` path segment as unsafe before canonical resolution and Journey-root confinement are evaluated.

The relevant behavior is equivalent to:

```python
candidate_target = Path(raw)
if candidate_target.is_absolute() or ".." in candidate_target.parts:
    raise ProjectionError(UNSAFE_PROJECTION_PATH, ...)

candidate = parent.parent / candidate_target
self._assert_confined(candidate, root, require_file=True)
```

This conflates two different cases:

- **Confined parent traversal:** `../delivery/index.md` resolves inside the registered Journey and should be allowed.
- **Escaping traversal:** a relative path resolves outside the registered Journey and must remain rejected.

Canonical confinement already provides the security boundary. Lexically rejecting every parent segment is stricter than the public contract requires and rejects legitimate Ariad roadmap topology.

## Required correction

Resolve the relative target from the containing document, then enforce canonical confinement against the registered Journey root.

The correction must:

1. Continue rejecting empty targets, absolute paths, backslash-based paths and unsupported URI/scheme syntax.
2. Permit `..` only when the fully resolved canonical target remains inside the canonical Journey root.
3. Require the resolved target to exist and be a regular file, or resolve a linked directory to its `index.md` under the existing contract.
4. Reject symlink components that canonically escape the Journey root.
5. Preserve the current structured `unsafe_projection_path` error for real escapes.
6. Preserve last-valid publication on every failure.
7. Avoid weakening projection namespace confinement or publication atomicity.

A suitable decision order is:

```text
parse relative target
→ resolve from containing document
→ canonicalize existing target
→ verify target is relative to canonical Journey root
→ verify expected file type
→ compile
```

## Acceptance criteria

1. A one-level `../` link resolving inside the Journey compiles successfully.
2. A multi-level relative link resolving inside the Journey compiles successfully.
3. A relative link whose canonical result is outside the Journey fails with `unsafe_projection_path`.
4. An absolute target fails with `unsafe_projection_path`.
5. A symlink inside the Journey pointing outside it fails with `unsafe_projection_path`.
6. A directory link resolves only to its confined `index.md`.
7. A missing confined target fails without replacing the last valid projection.
8. Existing Operational schema, manifest, atomic publication and concurrency tests remain green.
9. An isolated fixture matching the Nautilus CV-to-root-DS topology rebuilds successfully.
10. The patched behavior is released and verified through the installed public CLI, not only source tests.

## Required regression matrix

| Case | Example | Expected |
|---|---|---|
| Same directory | `ds-001/index.md` | Accept |
| Confined parent traversal | `../ds-001/index.md` | Accept |
| Confined multi-parent traversal | `../../roadmap/ds-001/index.md` | Accept |
| Canonical escape | `../../../../outside.md` | Reject: `unsafe_projection_path` |
| Absolute path | `/tmp/outside.md` | Reject: `unsafe_projection_path` |
| Symlink escape | `../linked-outside/index.md` | Reject: `unsafe_projection_path` |
| Confined directory | `../ds-001/` | Accept as `index.md` |
| Missing target | `../missing/index.md` | Reject; preserve last valid |
| URI-like target | `file:///tmp/outside.md` | Reject: `unsafe_projection_path` |
| Windows-style separator | `..\\outside.md` | Reject: `unsafe_projection_path` |

## Release and consumer gate

The defect is resolved only when all of the following are true:

1. Mirror Core regression tests pass, including symlink and canonical-escape cases.
2. A patch release newer than `v0.31.10` is tagged and published.
3. GitHub Actions for the release commit succeeds.
4. The installed Mirror runtime reports the patched version.
5. The unchanged Nautilus Journey rebuild succeeds.
6. `operational.json` advances to the current Ariad source state.
7. Manifest inspection confirms the new Operational snapshot.
8. TD-001 is closed in the Harness technical-debt ledger.

Until this gate is satisfied, explicit Tactical and Strategic synthesis must not publish readings that claim ancestry from the stale Operational snapshot.

## Closure evidence

The release and consumer gate was satisfied on Mirror `v0.31.11`:

- immutable release commit: `c9519c30caac1522209a56840a09dabc123cead0`;
- GitHub release: <https://github.com/mirror-mind-ai/mirror/releases/tag/v0.31.11>;
- Tests, Docs, main Windows installer and tag Windows installer workflows completed successfully for the immutable release SHA;
- installed runtime reported `0.31.11`, stable, migrations `16/16`, status `ready`;
- installed public rebuild accepted the unchanged confined parent links;
- published snapshot: `op-59d36a08c142494c88c12ecb5fcbf105`;
- source revision: `sha256:222aa1214a54c8059c7689daf21d6b98f128277a2462b79fd908ca49dc5d6c93`;
- compiled roadmap roots: `CV-001`, `CV-002`, `CV-003`;
- manifest and stable Operational document coordinates match;
- installed public inspection returns `status: ok`;
- structured return evidence: [td-001-mirror-return.json](td-001-mirror-return.json), SHA-256 `e5d0a78a9a3b0b3f00f74d0ba338cfbfb141da645377d19ba1b3d66a8c60387a`.

The earlier `projection_divergence` was corrected by the explicit rebuild, establishing a new valid manifest/document pair. TD-001 no longer blocks explicit synthesis implementation.

## Non-goals

This correction must not:

- introduce Nautilus semantics into Mirror Core;
- relax canonical Journey-root confinement;
- change Tactical or Strategic schemas;
- auto-invoke Pi or synthesis;
- rewrite existing roadmap links as a workaround;
- replace structured projection errors with untyped exceptions;
- treat projection JSON as mutation truth.

## Temporary operating rule

Keep Ariad roadmap source as truth and preserve the last valid projection. Do not rewrite legitimate confined roadmap links merely to bypass the defect. Do not start live derived-projection publication until the release and consumer gate above is open.
