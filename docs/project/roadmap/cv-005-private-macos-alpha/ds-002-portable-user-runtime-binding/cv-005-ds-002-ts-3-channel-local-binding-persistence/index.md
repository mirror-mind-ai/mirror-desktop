[< Parent](../index.md)

# CV-005.DS-002.TS-3 - Channel-Local Binding Persistence

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to preserve runtime trust across restarts without mixing application channels,
As the Mirror Desktop persistence boundary,
I want each bundle identity to own one atomic non-secret binding file,
So that stable and development restore only their own validated configuration.

## Outcome

Each channel persists, reloads and revalidates `runtime-binding.v1.json` beneath its own app-data root while malformed, symlinked or cross-channel state is retained for diagnosis and never used as authority.

## Acceptance Behavior

```text
Given a completely validated binding for the active channel
When Mirror Desktop saves it
Then a restrictive staged write is synced and atomically renamed inside that channel's app-data root
When the channel restarts
Then it reloads and revalidates only that file
And another channel's binding, malformed bytes, unknown fields or symbolic links never become runtime authority
```

## Scope

- Channel-local binding path and strict serialization.
- Restrictive create permissions where supported.
- Staged write, file sync, atomic rename and parent sync.
- Restart reload and revalidation.
- Stable and development isolation.
- Import and validation launchers consuming persisted binding coordinates.

## Out Of Scope

- Credential storage or Keychain integration.
- Binding history, multiple profiles or synchronization.
- Database copying or migration.
- Nautilus Harness state import.

## Validation

Native persistence tests use temporary app-data roots and prove valid round trips, previous-file preservation on failure, symlink rejection and channel isolation. Desktop E2E restarts both channels with distinct bindings.
