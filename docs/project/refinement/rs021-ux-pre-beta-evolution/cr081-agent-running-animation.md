[< RS021](index.md)

# CR081: Agent Running Animation

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr081-agent-running-animation`

## Problem

The Journey pin icon is doing too much. It would work better if the visible animated affordance represented agent execution status, while pinning had its own distinct control. Today the pin shape can be confused with active-run state.

## Expected Behavior

Active agent execution has a dedicated animated status indicator. Pinning remains available as a separate, stable affordance that does not carry run-state meaning.

## Approved Scope (2026-09-27)

The control occupying the pin position becomes one shared, non-interactive agent-status affordance.
It looks control-like, but it is `role="status"`, not a button without an action: the whole Journey
item already opens the Journey, and the header has no additional action to offer.

Four states:

- **Idle:** quiet, static and visibly inactive.
- **Working:** derived from exact runtime ownership and pulsing calmly.
- **Finishing:** derived from exact finalization ownership and breathing more slowly.
- **Finished:** static completion mark indicating that a completed answer is ready for attention.

Finished is a session-local attention state, not new runtime authority and not a durable notification
ledger. When a run completes while its Journey is selected, Finished remains for five seconds and
then returns to Idle. When another Journey is selected, Finished remains indefinitely; selecting its
Journey acknowledges it and starts the same five-second window. A new run always supersedes stale
Finished attention. Failed and cancelled turns return to Idle and retain their existing truthful
notices rather than masquerading as successful completion.

Working and Finishing continue to derive from `journeyRuntimeState`; only unacknowledged Finished is
stored separately. The Finished transition occurs after local finalization, independently of Mirror
synchronization debt, because the answer is ready even when synchronization still needs repair.

**Pin moves to the Journey context menu.** It is the first item, rendered as a checked menu item with
`Pin Journey` / `Unpin Journey`. Because pinning is a local preference, the context menu remains
available while agents run and Pin/Unpin stays enabled; Edit/Create/Move/Delete remain disabled and
drag remains blocked under existing runtime rules. A stable, non-interactive pinned marker remains in
the Journey copy and compact rail.

**The same status appears in the header.** It sits beside the active Journey `<h1>`, inside the Journey
identity cluster rather than `chat-header-actions`, because it describes the Journey and is not an
action on the Conversation. Sidebar and header share one component and visual grammar.

All previous runtime decoration on Journey images, tree glyphs and textual `Working` badges is removed.
One Journey has one visible agent-status source.

## Acceptance

- Idle, Working, Finishing and Finished are distinguishable in sidebar and header.
- Working pulses; Finishing breathes more slowly; reduced-motion preserves state without animation.
- Finished retires after five seconds for the selected Journey and persists for an unselected Journey until it is opened.
- Concurrent Journeys retain independent runtime and Finished states.
- Pin/Unpin is available from the exact-Journey context menu, including while an agent runs, and does not navigate or control the agent.
- Administrative Journey mutations remain blocked during runtime.
- No duplicate runtime status remains on Journey images, tree glyphs or copy rows.
- Light and dark themes preserve contrast.

## Implementation Evidence (2026-09-27)

**One status component.** `JourneyAgentStatusIndicator` renders Idle, Working, Finishing and Finished
as an accessible, non-interactive status in both the sidebar and active-Journey header. The header
placement is beside the Journey `<h1>`, outside Conversation actions, and includes the human label
beside the icon (`Idle`, `Working`, `Finishing`, `Ready`). Default/system/custom Journey
marks and the Tree glyph no longer accept runtime presentation; the former textual runtime badge was
removed, structurally enforcing one visible status source.

**Runtime-derived activity, separate attention.** `deriveJourneyAgentStatus` maps exact runtime owner
phase to Working/Finishing. A small pure reducer stores only Finished attention. Successful local
completion records Finished after finalization; failure and cancellation do not. Completion while
selected is acknowledged immediately; background completion remains until selection; acknowledged
entries expire after `JOURNEY_FINISHED_VISIBLE_MS` (5 seconds); starting another run clears stale
completion. In expanded Recent cards, the same human label replaces the last-worked timestamp while
status is non-Idle; the timestamp returns automatically when the status returns to Idle.

**Pin moved without losing runtime access.** The card pin button is gone. `JourneyItemContextMenu`
starts with an enabled `menuitemcheckbox` saying Pin/Unpin Journey. The menu can now open during a
run: local pinning remains enabled while Edit/Create/Move/Delete keep their existing `runtimeBusy`
disabling and drag remains blocked. A non-interactive marker keeps pinned state legible in expanded
copy and the compact rail.

**Motion and themes.** Working pulses, Finishing breathes more slowly, Finished is static, and
`prefers-reduced-motion` removes both animations without removing state. A dedicated light-theme
contract covers all active states.

## Validation

- `npm test`: 182 files, 1139 tests green.
- `npm run build`: green.
- `npm run roadmap:check`: READY.
- `git diff --check`: clean.

New coverage pins the attention reducer and five-second boundary, shared component semantics,
start/finish lifecycle wiring, selection acknowledgement, header placement, contextual Pin/Unpin,
runtime-safe menu access, reduced motion, light themes and removal of duplicate runtime decoration.

## Dev Homologation (2026-09-27)

Validated by the Navigator on the Dev channel.

Validated: Idle in sidebar and header; Working during active execution; the brief Finishing path;
Ready/Finished after completion; automatic return to last-worked time after the acknowledged window;
persistent Ready for background completion until the Journey is opened; Pin/Unpin from the context
menu; compact rail behavior; and the header label beside the icon. A final adjustment replaced the
expanded Recent card's last-worked timestamp with the human state label while non-Idle, and added the
same label beside the header indicator.

Accepted outcome: pinning no longer competes with runtime meaning, the Journey has one visible
agent-state source across sidebar and header, and the state label says what is happening exactly
where the Navigator was already reading recency.

## Closure

**Proportionality review: proportional.** The change introduces one pure attention reducer, one shared
status component, local context-menu pinning, stylesheet updates and tests. It does not touch process
admission, cancellation, finalization, synchronization, durable turn evidence or Journey ordering.

**Debt review: none opened.** The one intentionally non-durable piece is the Finished attention state;
that was a scoped product decision, not a gap. If release feedback asks for unread completion to
survive app restarts, that should be captured as a new CR with explicit durable-state semantics.

Commit, merge, publication and release remain separate Navigator decisions.

## Exclusions

- No change to process admission, cancellation, finalization or synchronization semantics.
- No hidden auto-follow or focus change caused by the status animation.
- No durable unread-completion ledger across application restarts.
- No status click action; Journey selection remains owned by the Journey item.
