[< Story](index.md)

# Test Guide — DS-008

## Aggregate Validation

Validate one effective agent-profile chain across persistence, exact Journey inheritance, Settings presentation and explicit Pi invocation:

```text
agent-settings.json
  global profile
  exact Journey override
    deterministic resolver
      effective provider/model/thinking
        next explicit Pi invocation
```

No persistence, reset, catalog or Journey-switch action may invoke a provider or mutate dedicated conversation authority.

## Automated Evidence

### TypeScript domain

- missing settings produce the documented Harness defaults;
- valid `1.0.0` settings round-trip without extra fields;
- malformed schemas, enums, provider/model values and container shapes are rejected as a whole;
- model and thinking overrides inherit independently;
- global changes do not overwrite explicit Journey values;
- reset removes override authority and resolves global values;
- exact native Journey IDs are required;
- effective projection removes duplicate provider/model/thinking args and appends one canonical selection;
- `pi-default` omits `--thinking`;
- safe-test behavior remains isolated from live Pi profiles.

### TypeScript application and storage

- startup loads settings before enabling live send;
- missing file uses defaults honestly;
- failed load/save is visible and does not claim success;
- switching Journeys changes only the effective profile;
- Settings distinguishes inherited, overridden and effective values;
- global and Journey save/reset actions call only the settings adapter;
- provider footer, context-window lookup and live invocation use the same resolved profile;
- no settings action provisions, restarts or invokes a dedicated thread.

### Rust native boundary

- app-data path remains inside the configured root;
- missing settings return `None`;
- staged write plus rename publishes complete content atomically;
- existing file, parent and staged-path symlinks fail closed;
- malformed and oversized payloads are rejected before publication;
- model-list table parsing accepts bounded valid rows and rejects malformed rows;
- catalog inspection uses offline local Pi listing and never provider invocation;
- Tauri exposes only the narrow load, save and catalog commands.

### Regression baseline

Run:

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Also run focused Python or source guardrail checks when adapter scripts are introduced.

## Navigator Validation

### Global persistence

1. Open Settings.
2. Select a non-default available Pi model and thinking level as global defaults.
3. Save and verify the effective-profile disclosure updates.
4. Quit Harness completely and reopen it.
5. Reopen Settings and verify the same values were restored before any send.

Pass when both values survive restart without provider activity. Fail if defaults return silently, settings appear saved only in memory, or startup calls a model.

### Journey overrides

1. Select Journey A and override both model and thinking.
2. Select Journey B and leave both fields inherited.
3. Switch repeatedly between A and B.
4. Change the global defaults.

Pass when A remains explicit and B follows the new global profile, with exact selected-Journey disclosure and no conversation/thread change. Fail on cross-Journey leakage, title-based matching or global overwrite of A.

### Independent inheritance and reset

1. In Journey A, inherit model but override thinking.
2. Verify the effective profile combines the global model with Journey thinking.
3. Reset Journey A to full inheritance.

Pass when independent precedence is visible and reset changes settings only. Fail if reset restarts the conversation, creates a generation, modifies Mirror or loses the current transcript.

### Explicit invocation

1. Send one harmless prompt in Journey A.
2. Send one harmless prompt in Journey B.
3. Inspect visible runtime/provider evidence and the dedicated session metadata available through existing diagnostics.

Pass when each explicit invocation receives its Journey's effective provider/model and applicable thinking exactly once. Fail if settings actions invoke Pi, raw args override the resolved profile, or private reasoning is exposed.

### Guardrails

Inspect the persisted app-data file after the route.

Pass when it contains only the versioned allowlisted global profile and exact-ID Journey overrides. Fail if it contains command arguments, environment variables, keys, tokens, headers, prompts, responses, paths, conversation IDs or other authority.

## Child Work Packages

- DS-008.TS-1: versioned non-secret settings store
- DS-008.TS-2: effective agent-profile resolution
- DS-008.TS-3: Pi model and thinking projection
- DS-008.TS-4: persistence and compatibility guardrails
- DS-008.US-1: remembered global defaults
- DS-008.US-2: Journey model selection
- DS-008.US-3: Journey thinking selection
- DS-008.US-4: effective configuration inspection and reset

## Validation Evidence

Record automated command output, the exact app-data schema shape with values redacted where appropriate, and explicit Navigator acceptance or rejection. Aggregate DS Validation remains blocked until the desktop route is completed.
