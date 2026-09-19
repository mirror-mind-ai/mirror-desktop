[< RS019](index.md)

# CR058: Remove Post-Terminal Journal State from Conversation Admission

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Even after native occupancy is narrowed, frontend availability still accepts `localAdmissionReady: !blockingTurnJournalRecord`. This leaves turn-journal successor eligibility and recovery classification with direct power over `canSend` whenever a record is correlated to native state.

Journal phases after terminalization describe lifecycle evidence and outstanding work. They do not prove an active Pi writer exists. Using them as a second admission gate contradicts the RS018/RS019 authority contract and risks recreating the same blockage under a different correlation path.

## Expected Behavior

Conversation availability derives send admission from exact control-plane readiness and active native execution only. Post-terminal journal records may select notices and recovery actions, but cannot disable Send after native inactivity is established.

## Proposed Scope

- Remove post-terminal journal state from `localAdmissionReady`/`canSend`.
- Preserve fail-closed behavior for invalid control-plane binding and unknown native inspection.
- Keep admitted/running evidence diagnostic when native occupancy cannot yet be established.
- Separate “recovery available” from “successor forbidden” in UI state.
- Update recovery notices and placeholders so debt is visible without implying an active agent.
- Add tests proving every post-terminal journal phase remains non-blocking when native occupancy is known inactive.

## Acceptance

- `terminal_durable`, `projected`, `outbox_enqueued`, `settled` and `interrupted` records cannot independently disable Send.
- An active exact native run still blocks overlap.
- Unknown occupancy remains bounded fail-closed.
- Recovery actions remain exact and never rerun the provider implicitly.
- Restart does not change availability solely by erasing process-local correlation.

## Boundaries

- Depends on CR057's native occupancy separation.
- Does not redesign settlement or outbox execution; CR059 owns that.
- No production data mutation, push, release or publication is implied.
