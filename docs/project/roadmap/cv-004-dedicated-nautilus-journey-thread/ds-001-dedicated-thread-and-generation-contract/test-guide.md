[< Story](index.md)

# Test Guide: CV-004.DS-001

## Aggregate Validation

Prove that Nautilus can recognize dedicated Journey-thread authority without importing or reconciling conversations created under the old model. The aggregate result is a fail-closed desktop boundary, not native-pair provisioning.

## Child Work Packages

- `CV-004.DS-001.TS-1`
- `CV-004.DS-001.TS-2`
- `CV-004.DS-001.TS-3`
- `CV-004.DS-001.US-1`

## Domain Contract Matrix

| Condition | Expected classification |
|-----------|-------------------------|
| No dedicated record | `absent` |
| Legacy conversation only | `absent`, `legacyStatePresent: true` |
| One valid active ready generation | `ready` |
| Missing Pi or Mirror native ID | `inconsistent` |
| Active generation not found | `inconsistent` |
| More than one active generation | `inconsistent` |
| Non-monotonic or duplicate generation number | `inconsistent` |
| Reused Pi or Mirror ID | `inconsistent` |
| Record Journey differs from selected Journey | `inconsistent` |
| Valid dedicated record beside legacy state | `ready`; legacy remains inert |

Every inconsistent result uses bounded reason codes and contains no transcript content.

## Persistence Validation

- Missing `journey-threads/<journey>.json` returns absence without creating a file.
- Valid records round-trip exactly through Tauri and the TypeScript parser.
- Empty, malformed and traversal Journey IDs are rejected.
- A failed write preserves the last valid record.
- Temporary files do not become current authority.
- Cross-Journey payloads are rejected on both save and load.
- Registry validation rejects native ID reuse across Journey thread files.
- Existing `journey-conversations` files remain byte-preserved.

## Legacy Quarantine Validation

Characterize representative legacy payloads:

- local `origin: new` conversation;
- `mirror_import` with imported activity;
- `mirror_reconciliation` hydrated generation;
- restarted local generation;
- `in_sync`, advanced and conflicted reconciliation states.

None may create or satisfy dedicated authority. Tests should compare the legacy payload before and after thread inspection to prove no mutation.

## UI and App Validation

- `loading` prevents stale prior-Journey conversation from flashing.
- `absent` shows a centered not-started surface and hides conversation/composer.
- `inconsistent` shows bounded recovery copy and keeps invocation blocked.
- `ready` is the only class that permits the conversation shell.
- Legacy presence does not open a picker or reconciliation preview.
- Rapid Journey switching discards late thread-load results.
- Operational artifacts and published Tactical/Strategic projections remain reachable while conversation is absent.
- No recognition path calls a provider, provisions native state or writes a thread file.

## Automated Commands

```text
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

All checks must pass before asking for Navigator validation.

## Navigator Validation

The Navigator validates only after TS-1, TS-2, TS-3 and US-1 are complete.

1. Open the running Harness.
2. Select `nautilus-harness` and at least one other Journey that has legacy conversation activity.
3. Confirm each displays **This Journey has not started in Nautilus** rather than old chat content.
4. Confirm conversation composer, Mirror picker and reconciliation preview are absent.
5. Open Operational artifacts and any available Tactical/Strategic projections and confirm they still render.
6. Switch Journeys repeatedly and confirm no title, state or conversation leaks across selections.
7. Confirm no provider activity or new Pi/Mirror conversation occurred.

Expected observation: legacy Journeys are recognized as not started, non-conversational Journey surfaces remain useful, and the desktop never behaves as a generic chatbot.

Pass condition: all automated checks pass and the Navigator accepts the desktop observations.

Fail condition: any legacy conversation becomes active; any non-ready Journey can send; recognition mutates native state; Journey switching leaks; or altitude projections disappear unnecessarily.

## Deferred Behavior

The not-started surface does not yet provision a conversation. `CV-004.DS-002` will make **Start this Journey** operational and create the first clean dedicated generation. This is an accepted delivery boundary and must be visible in validation notes.
