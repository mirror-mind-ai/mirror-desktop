[< DS-007](../index.md)

# DS-007.TS-2 — Confined Native File Snapshot Boundary

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to read selected context without broad filesystem authority,
As the native Tauri boundary,
I want to resolve, validate and snapshot files beneath the exact registered Journey root,
So that only bounded regular textual content can cross into the frontend and invocation path.

## Outcome

One native command accepts exact Journey identity plus Journey-relative selections, re-resolves canonical authority at execution time, rejects escapes and unsafe file kinds, enforces byte limits and returns immutable text snapshots with integrity metadata. It never accepts arbitrary absolute paths as authority.

## Acceptance Behavior

```text
Given a registered Journey root and requested relative file
When the native snapshot command resolves the request
Then only an allowed regular textual file confined beneath that root is returned
And symlinks, traversal, hidden/generated entries, special files, unsupported encoding and oversized content fail before partial publication
```

## Scope

- Bind requests to exact native Journey ID and the current registered project root.
- Normalize and confine relative paths using platform-safe canonical checks.
- Reject absolute input, `..` traversal, root escape, symlinks, devices, sockets, FIFOs, directories and hidden/generated entries.
- Apply allowlisted textual types, UTF-8 validation, per-file and aggregate byte limits and maximum count.
- Read the complete requested set before returning success; avoid partial optimistic state.
- Return relative path, display name, media type, byte size, digest and content.
- Add Rust tests across valid, malformed, missing, changed and adversarial paths.

## Out Of Scope

- File mutation, file opening or command execution.
- Recursive directory ingestion.
- Broad Tauri filesystem plugin permissions.
- Watchers, polling or long-lived file handles.
- Provider invocation.

## Validation

Rust tests exercise normal files, nested files, traversal, absolute paths, symlink escape, special files where supported, hidden/generated paths, invalid UTF-8, count and byte limits, changed registry authority and all-or-nothing multi-file behavior; `cargo check` remains green.
