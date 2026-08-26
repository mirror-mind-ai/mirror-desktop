# TD-004 - Send Preflight Authority Refresh Race

**Status:** Resolved
**Detected:** 2026-08-26

## Problem

Window focus schedules a model-free conversation-authority refresh. A live send also starts the same preflight refresh. When send overlapped the focus-triggered inspection, the second call returned immediately because the authority key was already in flight. Send then observed the still-active inspection and aborted instead of awaiting it. To the Navigator, the conversation refreshed again but the command never executed.

No provider invocation or local user-message commit occurred.

## Resolution

Conversation-authority refresh now uses one shared single-flight promise. Focus recovery and send preflight join and await the same inspection. A later refresh begins normally after the shared inspection settles.

The composer remains fail-closed while inspection is active. After the awaited inspection, send proceeds only when the selected Journey still has `in_sync` authority.

## Validation

```text
Frontend: 39 files, 247 tests
Build: passed
Rust: 17 tests
cargo check: passed
```
