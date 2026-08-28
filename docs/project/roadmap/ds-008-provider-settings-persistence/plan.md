# Delivery Story Plan — DS-008

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Persistent Agent Configuration and Journey Overrides

## Objective

Persist one non-secret global Pi agent profile, resolve optional per-Journey provider/model and thinking-level overrides, project the effective profile into each explicit dedicated Pi invocation, and let the Navigator inspect or reset inheritance without changing Journey or conversation authority.

## Child Work Packages

- DS-008.TS-1
- DS-008.TS-2
- DS-008.TS-3
- DS-008.TS-4
- DS-008.US-1
- DS-008.US-2
- DS-008.US-3
- DS-008.US-4

## Scope

### Versioned local authority

Add a dedicated Harness application-data record, separate from Journey preferences and canonical Mirror Journey metadata:

```text
agent-settings.json
  schemaVersion: 1.0.0
  globalProfile
    provider
    model
    thinkingLevel
    invocationMode
  journeyOverrides
    <native Journey ID>
      provider/model override, optional
      thinkingLevel override, optional
```

`thinkingLevel` accepts Pi's explicit levels (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`) plus an honest `pi-default` value that omits `--thinking`. Absence of a Journey field means inherit the corresponding global value. Journey keys are exact native IDs; title, slug-like display text, recency and path never establish authority.

The persisted schema is allowlisted and cannot contain command arguments, environment variables, API keys, tokens, headers or arbitrary provider payloads. Existing command, raw arguments, stdin and safe-test controls remain current-session DS-003 configuration unless they map to an explicitly allowlisted field.

### Effective profile resolution

Create a pure TypeScript domain model that:

- parses and serializes the versioned record;
- rejects malformed roots and invalid enum/string values without partial adoption;
- resolves `Journey override ?? global profile` independently for model and thinking level;
- preserves explicit Journey overrides when global defaults change;
- returns a Journey to inheritance when its overrides are cleared;
- ignores unknown Journey IDs at runtime without mutating or deleting their stored records;
- projects one effective profile into the provider configuration used by context display, validation and the next explicit invocation.

The resolver removes prior `--provider`, `--model` and `--thinking` pairs before appending the effective values exactly once. `pi-default` omits `--thinking`. It does not modify session, Journey, thread, generation or Mirror-conversation coordinates.

### Pi-native model selection

Add a model-free Tauri catalog command backed by the installed Pi CLI's local model catalog (`pi --offline --list-models`). Parse only bounded provider, model, context, max-output, thinking and image columns into structured non-secret records. The model selector uses available Pi models and retains the currently configured model honestly if catalog discovery is unavailable.

The catalog's `thinking` capability controls whether thinking selection is offered. Harness passes the requested Pi thinking enum through `--thinking`; Pi remains final model-compatibility authority and may clamp model-specific unsupported levels according to its native `thinkingLevelMap`. Catalog loading cannot invoke a model, refresh remote catalogs, expose authentication data or alter Pi settings.

### Settings experience

Refine the existing Settings window rather than creating another global surface:

- show and edit the persisted global provider/model and thinking default;
- show the active Journey and whether model and thinking are inherited or overridden;
- allow independent per-Journey model and thinking overrides;
- show the resolved effective profile before invocation;
- provide explicit actions to save global defaults, save Journey overrides, reset a Journey to inheritance and restore Harness defaults;
- preserve the existing bounded invocation-mode control;
- keep raw command/test controls visibly current-session only.

Switching Journeys updates the effective profile immediately. Saving, resetting, loading and switching are model-free. Changes apply to the next explicit send and do not create or restart a generation.

### Native persistence

Add narrow Tauri commands to load and atomically publish `agent-settings.json` under the app-data root. Writes use a staged sibling file plus rename. Existing targets and parents are checked with `symlink_metadata`; symlinked, non-file, escaped and malformed states fail closed. TypeScript validates before save and after load. Failed load or publication leaves the prior in-memory effective profile visible but blocks claiming the new settings were saved.

## Implementation Sequence

1. Add failing domain tests for schema parsing, inheritance, independent overrides, reset behavior, exact-ID lookup and Pi argument projection.
2. Implement `agentProfile` domain types, defaults, resolver and provider-config projection without React or Tauri dependencies.
3. Add failing Rust tests for safe path resolution, atomic publication, symlink rejection and bounded `pi --list-models` parsing.
4. Implement native settings load/save and model-catalog commands, then register only those commands in Tauri.
5. Add the TypeScript storage adapter and startup lifecycle. Gate live invocation until settings inspection settles so stale defaults cannot win a race.
6. Refactor App provider state into current-session invocation controls plus persisted global profile and exact Journey overrides. Use the resolved profile consistently for footer labels, context-window lookup, validation and live Pi invocation.
7. Add the Settings controls for global defaults, Journey inheritance/override, effective-value disclosure and explicit reset actions.
8. Add compatibility coverage for missing files, legacy current-session defaults, unknown models, unavailable catalog, malformed payloads and failed writes.
9. Run aggregate automated checks, then execute the desktop validation route before DS Validation.

## Non-Goals

- Persisting API keys, tokens, headers, environment variables, arbitrary args or secrets.
- Writing to Pi's global or project `settings.json`, `models.json`, auth files or model catalog.
- Refreshing or downloading models.
- Invoking a provider during load, save, reset, catalog inspection or Journey switching.
- Creating, restarting, forking or migrating dedicated Pi sessions or Mirror conversations when settings change.
- Changing canonical Mirror Journey identity, hierarchy, project path or semantic content.
- Concurrent Journey execution, background agents, remote synchronization or account management.
- Guaranteeing that every Pi model supports every thinking level; Pi remains compatibility authority.

## Acceptance Behavior

```text
Given the Navigator saves a global provider/model and thinking default
When Harness is closed and reopened
Then the same allowlisted global profile is restored before live invocation is enabled
And no provider was invoked while restoring it
```

```text
Given Journey A overrides model and thinking while Journey B inherits both
When the Navigator switches between the Journeys
Then each Journey shows and uses its own resolved effective profile
And changing the global default updates Journey B without overwriting Journey A
```

```text
Given a Journey has one or both overrides
When the Navigator resets that Journey to inheritance
Then the effective values come from the global profile
And Journey identity, thread, generations and conversations remain unchanged
```

```text
Given an effective provider/model and thinking level
When the Navigator explicitly sends the next message
Then Pi receives exactly one provider, model and applicable thinking selection
And the visible provider/context projection describes that same effective profile
```

```text
Given persisted settings are malformed, symlinked, secret-bearing or unavailable
When Harness attempts to load or save them
Then the operation fails visibly without partial adoption or provider invocation
And the last valid in-memory profile is not silently replaced
```

## Validation Route

Aggregate validation requires automated and desktop evidence.

Automated checks:

- focused TypeScript domain, storage, provider-config and Settings tests;
- full Vitest suite;
- production TypeScript/Vite build;
- Rust unit tests for storage and catalog parsing;
- `cargo check`;
- source guardrails proving no secret-bearing fields enter the persisted schema and no persistence command enters the provider path.

Navigator desktop route:

1. Save a non-default global model and thinking level, close Harness, reopen it and verify both values return.
2. Configure one Journey with explicit model and thinking overrides; leave a second Journey inheriting global defaults.
3. Switch between them and verify the Settings disclosure and composer footer show the correct effective profile.
4. Change the global defaults and verify only the inheriting Journey changes.
5. Reset the overridden Journey and verify it returns to inheritance without changing its dedicated conversation or generation.
6. From each Journey, explicitly send one harmless prompt and verify the visible runtime identifies the selected model; thinking selection must be present in the invocation configuration without displaying private reasoning.
7. Restore global defaults and confirm no secret or broad argument state appears in `agent-settings.json`.

Pass when persistence, inheritance, overrides, reset and explicit invocation all agree on one effective profile and remain model-free outside send. Fail on restart loss, cross-Journey leakage, duplicate/conflicting Pi flags, hidden fallback, authority mutation, secret persistence or any automatic provider call.

## Implementation Contract

- Follow TDD for every behavior change.
- Keep one typed source of truth for profile resolution; React, storage and invocation adapters must not reimplement precedence.
- Treat native IDs as Journey authority and persisted settings as a Harness-owned projection.
- Keep settings and catalog operations model-free and non-destructive.
- Preserve dedicated-thread, generation, conversation, restart and interrupted-turn contracts.
- Do not absorb DS-007 attachments, DS-009 concurrency, model installation, credentials or remote settings sync.
- Keep authored plan detail intact through later Ariad checkpoints.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
