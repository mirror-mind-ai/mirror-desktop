[< RS024](index.md)

# CR141: Key the Pi Event Route by Workspace

**Status:** captured
**Driver:** —
**Delivery:** —

**This is the slice RS024 was missing.** CR138, CR139 and CR140 are each delivered and each
correct, and the Story's Desired Outcome is still not achieved, because the layer that actually
refuses concurrency was never in scope.

## Friction

On 2026-10-10, with CR138, CR139 and CR140 all merged and installed on Dev, the Navigator started a
turn in one conversation and a second turn in a sibling conversation of the same Journey. Both the
native registry and the renderer's pre-check **admitted** it. The send then failed with:

> Message was not sent
> Message returned to the composer: Could not attach to the Pi process event stream: Pi process
> route already active for Journey mirror-desktop.

`piProcessEventDispatcher.ts` holds `routes` as a `Map` keyed by `authority.journeyId` — one event
route per Journey. It is keyed by Journey in seven places: `register` (`:168`, `:174`), `rehydrate`
(`:187`, `:196`), the route-handle close (`:97`, `:157`), `rememberClosedAuthority` (`:68`, which
replaces by Journey), and decisively **`deliver` (`:81`)**, where an arriving event finds its route
by `routes.get(event.authority.journeyId)`.

Re-keying `register` alone would not help: delivery would still find one route per Journey, so a
sibling's events would have nowhere to go, or worse, the wrong place.

`livePiAgentStream` calls `register` at `piProcessStream.ts:642`, **before**
`invokeCommand("start_pi_invocation")` at `:662`. So this layer refuses first, and it refuses by
throwing — after the Navigator has pressed Send.

## Why this was missed, recorded rather than smoothed over

Four First Investigations — CR136, CR138, CR139, CR140 — surveyed the **admission** path: the Rust
registry and its three consumers, the TS runtime state, the inspection validator, the turn journal,
the compaction exclusion, the journal reconciliation. None surveyed the **event transport** path.
CR136's "three registry consumers" enumerated consumers of the registry, not of the event stream.

`git log` over `src/agent/piProcessEventDispatcher.ts` shows zero commits from CR138, CR139 or
CR140. This is a pre-existing per-Journey bound, not a regression — and the investigations should
have found it, because "what else is keyed by Journey?" was exactly their question.

## Outcome

Two workspaces in one Journey each receive their own Pi process events, with no event delivered to
the wrong workspace and no route refused for a sibling that the registry admitted.

## First Investigation

1. Establish whether `PiProcessEventAuthority` carries `thread_id` on **every** event kind, not
   only the ones the journal path reads. The fix is only mechanical if the routing coordinate is
   always present; where it is absent, delivery must fail closed rather than guess a route.
2. Enumerate every per-Journey key in the dispatcher and decide each one separately. `deliver` and
   `register` must become per-workspace; `rememberClosedAuthority` replaces by Journey today, which
   at workspace grain would forget a sibling's closure — establish what that replacement was for.
3. Establish what `rehydrate`'s authority-mismatch error protects. It currently throws when a
   route exists for the Journey with a different authority; at workspace grain the comparison
   narrows, and the question is whether the old error was catching a real condition.
4. Decide where the refusal lives once the transport allows siblings. With this CR merged, the
   renderer's `PI_EVENT_TRANSPORT_GRAIN` flips to `"workspace"` and
   `same_journey_occupied` becomes unreachable again — this time for real. Removing it is the
   decision this CR inherits from CR140, and it should be taken here rather than assumed.
5. Establish whether anything else in the stream path is per-Journey. `piProcessStream.ts`, the
   App's stream consumption, and the terminal-handoff files are all candidates. **This item exists
   because the previous four investigations stopped at admission; it is the correction.**

## Acceptance

- Two concurrent turns in one Journey each receive their own `message_delta`, `run_status` and
  `done` events, asserted by a test that interleaves two routes and checks no event crosses.
- An event whose authority carries no routing coordinate is quarantined, not delivered to a guess.
- `PI_EVENT_TRANSPORT_GRAIN` flips to `"workspace"` and the guard in
  `runtimeWorkspaceKeying.test.ts` is re-aimed; `same_journey_occupied` is removed only if no path
  can reach it.
- **Field: the D1–D5 sequence in `docs/update/rs024-field-verification-baseline-2026-10-10.md`
  runs to completion.** D1's durable claim — two `turn-journal` records for one `journey_id` with
  distinct `thread_id` and intersecting `piExecution` windows — is this CR's closing evidence, and
  it carries the evidence owed by CR138, CR139 and CR140.

## Boundaries

No change to admission, the share, the registry key or the compaction exclusion. No change to the
refusal sentences, which CR140 already unified. The lost-turn defect observed in the same field
attempt is **CR142**, not this CR.
