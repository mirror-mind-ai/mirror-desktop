[< Story](index.md)

# Implementation — DS-008

## Delivered authority

Harness now owns one versioned, non-secret agent profile record:

```text
agent-settings.json
  schemaVersion: 1.0.0
  globalProfile
    model { provider, model }
    thinkingLevel
    invocationMode
  journeyOverrides
    <exact native Journey ID>
      model, optional
      thinkingLevel, optional
```

The pure resolver in `src/domain/agentProfile.ts` independently applies model and thinking precedence. Empty Journey overrides are removed, so reset returns honestly to inheritance. Unknown Journey IDs remain inert records and never become title-, path- or recency-based authority.

## Native persistence and catalog

`src-tauri/src/agent_settings.rs` provides three narrow commands:

- `load_agent_settings`;
- `save_agent_settings`;
- `list_pi_models`.

The native boundary validates the exact allowlist, schema version, enum values, Journey IDs and bounded provider/model values. It rejects malformed JSON, extra secret-bearing fields, oversized files, symlinked targets and unsafe file types. Publication writes and synchronizes a staged sibling before rename, preserving the previous valid target on validation failure.

Model discovery executes only:

```text
PI_OFFLINE=1 pi --list-models
```

The bounded table parser returns provider, model, context, max output, thinking and image capability. It does not invoke a provider, refresh a remote registry or expose credentials.

## Effective Pi projection

`projectAgentProfile` removes any existing `--provider`, `--model` and `--thinking` pairs, including `--flag=value` forms, before appending one effective provider/model and optional thinking level. `pi-default` omits `--thinking`. Safe-test mode remains isolated.

`App.tsx` uses the same effective configuration for:

- provider validation;
- composer footer identity;
- context-window selection;
- authoritative context-stat matching;
- the next explicit `livePiAgentStream` call.

Startup inspects persisted settings before live send is enabled. Malformed persisted state is surfaced and blocks live send until the Navigator restores a valid profile. Settings mutations remain model-free and do not provision or restart threads, generations, Pi sessions or Mirror conversations.

## Settings experience

The existing global Settings window now contains:

1. effective profile disclosure for the active Journey;
2. persisted global model, thinking and invocation defaults;
3. independent active-Journey model and thinking inheritance/overrides;
4. explicit reset to inheritance and restore-Harness-default actions;
5. clearly separated current-session-only command, arguments, stdin and safe-test controls.

Locally available Pi models populate the selectors. Thinking options are constrained when the catalog reports that a model does not support thinking; Pi remains final model-specific clamping authority.

## Files

```text
src/domain/agentProfile.ts
src/agent/providerConfig.ts
src/app/agentSettingsStorage.ts
src/app/App.tsx
src-tauri/src/agent_settings.rs
src-tauri/src/main.rs
src/styles/app.css
docs/architecture/app-architecture.md
```

## Automated evidence

```text
Vitest:      55 files / 294 tests passed
Vite/TS:     production build passed
Rust:        22 tests passed
cargo check: passed
```

Coverage includes schema round-trip and rejection, independent inheritance, exact Journey lookup, reset, duplicate flag removal, `pi-default`, storage adapter commands, native atomic publication, symlink rejection, malformed/secret-bearing payload rejection, bounded Pi catalog parsing, startup gating and Settings/invocation source guardrails.

## Commits

```text
62f2a27 Establish non-secret Journey agent profile authority
fa49b68 Resolve effective agent profiles in desktop Settings
```
