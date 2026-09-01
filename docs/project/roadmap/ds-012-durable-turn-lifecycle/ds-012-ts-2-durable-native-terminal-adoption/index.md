[< Parent](../index.md)

# DS-012.TS-2 — Durable Native Terminal Adoption

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to survive frontend loss after Pi finishes,
as the native execution boundary,
I want exact bounded terminal evidence adopted by the turn journal before lifecycle-closing done,
so that completion cannot exist only in an ephemeral event route or Pi transcript.

## Outcome

Every spawn failure, completion, cancellation, process death and shutdown path chooses one immutable terminal outcome and durably records exact authority plus bounded final evidence before observation retirement or Journey lease release can proceed.

## Acceptance Behavior

```text
Given Pi has produced final output
When the frontend disappears before projection
Then exact terminal authority and bounded output remain durably recoverable
And Pi JSONL is unnecessary for destination or message authority.
```

```text
Given done, cancellation and process death race
When terminal adoption occurs
Then exactly one outcome wins by the declared phase rule
And late terminal signals become bounded audit evidence only.
```

## Scope

- Native bounded final-output adoption.
- Terminal outcome race rules.
- Journal transition before lifecycle-closing done consequences.
- Lease and process-capacity ordering checks.
- Stale callback and replacement-run isolation.
- Native fault injection for write, spawn, child and shutdown failures.

## Out Of Scope

- Local conversation projection and Mirror outbox settlement.
- User-facing restart recovery.
- Capacity two.

## Validation

Automated only. No desktop E2E or screenshots. Use Rust fake-child tests, deterministic race barriers, durable-file inspection, focused frontend transport tests, full suites and build checks at story completion.
