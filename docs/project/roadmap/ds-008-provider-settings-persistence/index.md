[< Roadmap](../index.md)

# DS-008 - Persistent Agent Configuration and Journey Overrides

**Status:** ✅ Done

## Outcome

Nautilus Harness persists a bounded global Pi agent profile and lets each Journey inherit that profile or override its provider/model and thinking level. Reopening the app or switching Journeys restores the effective configuration without storing secrets or invoking a provider.

## Why This Matters

DS-003 made provider configuration visible and editable, but only for the current app runtime. The Navigator currently loses the selected model after closing the app, and one process-wide configuration forces every Journey to use the same model and reasoning depth.

Pi already treats model and thinking level as explicit runtime choices. Harness should project that grammar directly instead of leaving both concerns hidden inside an opaque argument string. A global default keeps ordinary setup simple, while a Journey override lets different kinds of work use different agent profiles without changing Journey identity, conversation authority or dedicated-thread ownership.

## Configuration Resolution

```text
effective Journey agent profile
  provider/model = Journey override ?? global default
  thinking level = Journey override ?? global default
```

Changing the global default affects only Journeys that inherit it. An explicit Journey override remains stable until the Navigator changes it or chooses to inherit the global default again.

The effective profile applies to the next explicit invocation. Loading, saving, resetting or switching profiles is model-free and does not create a Pi session, Mirror conversation, dedicated generation or provider request.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-008.US-1 | Remember Global Agent Defaults | User Story | Navigator reopens Harness with the last allowlisted global provider/model, thinking level and invocation preferences | ✅ Done |
| DS-008.US-2 | Select a Journey Model | User Story | Navigator can let a Journey inherit the global provider/model or select an explicit override | ✅ Done |
| DS-008.US-3 | Select a Journey Thinking Level | User Story | Navigator can let a Journey inherit the global thinking level or select an explicit supported override | ✅ Done |
| DS-008.US-4 | Inspect and Reset Effective Configuration | User Story | Settings show whether each value is inherited or overridden and can restore either the Journey or global defaults explicitly | ✅ Done |
| DS-008.TS-1 | Versioned Non-secret Settings Store | Technical Story | Harness persists allowlisted global and per-Journey profiles atomically in local application data | ✅ Done |
| DS-008.TS-2 | Effective Agent Profile Resolution | Technical Story | One deterministic resolver produces the provider/model and thinking level used by the next Journey-bound Pi invocation | ✅ Done |
| DS-008.TS-3 | Pi Model and Thinking Projection | Technical Story | Explicit Harness fields map to supported Pi CLI configuration without treating arbitrary arguments as durable profile authority | ✅ Done |
| DS-008.TS-4 | Persistence and Compatibility Guardrails | Technical Story | Malformed, stale, unknown or secret-bearing settings fail closed while legacy current-session configuration migrates safely | ✅ Done |

## Done Condition

DS-008 is done when:

- the allowlisted global agent profile survives an application restart;
- each Journey can inherit or override provider/model and thinking level independently;
- switching Journeys immediately presents the correct effective profile;
- changing a global default does not overwrite explicit Journey overrides;
- resetting a Journey returns it to inheritance without changing its identity, hierarchy, project path, thread, generations or conversations;
- the effective profile is passed only to the next explicit Pi invocation;
- storage and profile resolution are model-free, atomic and covered by compatibility tests;
- no API key, token, arbitrary environment variable or secret-bearing argument is persisted.

## Boundary

This delivery persists non-sensitive local agent configuration only. Global invocation preferences remain separate from Journey identity metadata, and per-Journey overrides belong to Harness application settings rather than canonical Mirror Journey semantics.

It does not store credentials, synchronize settings remotely, configure external accounts, download models, invoke Pi automatically, mutate project files, create or restart dedicated conversations, change Mirror memory, add concurrent execution or grant broad process and filesystem authority.
