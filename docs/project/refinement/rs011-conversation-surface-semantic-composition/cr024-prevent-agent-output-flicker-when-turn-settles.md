[< RS011 — Conversation surface semantic composition](index.md)

# CR024 — Prevent agent output flicker when a turn settles

## Problem

When an agent turn finishes in Mirror Desktop, the visible agent output can flicker. The
content currently being shown disappears, is briefly replaced by different content, and
then reappears. This makes successful turn completion look unstable and raises doubt
about whether the response was lost, rewritten, or restored from another source.

The phenomenon occurs at the boundary where live runtime output settles into the
completed conversation representation. Its exact cause is not yet established and must
not be inferred from the visual symptom alone.

## Expected Behavior

The agent output remains visually continuous while a turn settles. Completion may change
status, available controls, semantic grouping, or persistence authority, but it must not
blank the visible response, substitute unrelated or stale content, duplicate text, jump
between incompatible representations, or make the final content disappear and reappear.

The final completed turn must converge once onto authoritative content. If persistence or
Mirror conversation synchronization finishes after provider completion, the last valid
visible content remains present until the authoritative replacement is ready and proven
to represent the same turn.

Provider failure, cancellation, incomplete authoritative evidence, and durable Mirror
repair states must retain their existing honest settlement behavior without being hidden
by an anti-flicker fallback.

## Impact

This CR belongs to RS011 because semantic turn composition depends on a stable transition
from live Agent Actions and Agent Comments to the latest completed turn. It may affect
live stream projection, completion settlement, persisted conversation reload, message
identity, React reconciliation, stale-response authority, System Surface extraction, and
Mirror synchronization timing.

Source observation: direct alpha usage reported that agent content disappears, is
replaced by other content, and then reappears when the turn completes.

## Investigation Findings

Builder inspection on 2026-09-10 found two independently reproducible presentation
transitions and one additional replacement path. A later visible clue from the Navigator
identified a fourth mechanism that now ranks as the leading explanation.

### Runtime layout contraction and smooth auto-follow

At the end of a Dev turn, the Navigator briefly saw text beginning with `Checking
Journey…` before the final agent content returned. No matching literal exists in the
application source. The phrase is consistent with a dynamic reasoning summary rendered
inside `LiveRuntimeActivity`, which remains above the assistant answer in the same agent
card.

Completion changes several layout and scroll inputs together:

1. Runtime projection settles and running or preparing tool details switch from open to
   closed, reducing the activity region height.
2. The chat auto-follow effect reacts to `messages`, `isStreaming`, and
   `runtimeProjection` changes.
3. Once `isStreaming` becomes false, the effect calls `scrollIntoView` with smooth rather
   than immediate behavior.
4. During the animated reposition after layout contraction, the viewport can briefly
   expose an earlier reasoning summary such as `Checking Journey…` before settling back
   on the final assistant answer.

This mechanism produces the perceived sequence without replacing assistant bytes. It
also explains why repeatedly forcing Mirror and Ariad surfaces did not reproduce the
problem and why a long tool-bearing turn did. The hypothesis requires a visual browser
probe with controlled activity height and scroll geometry, but it is now the leading
cause.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:1437-1453`
- `src/app/App.tsx:3525-3548`
- `src/app/LiveRuntimeActivity.tsx:36-80`
- `src/app/LiveRuntimeActivity.tsx:127-180`

### Incremental System Surface extraction

`App.tsx` derives agent body content and System Surface events from the same incrementally
streamed message on every render. `captureMirrorSurfaces` recognizes a marked surface only
after its closing marker or closing box border arrives. Before closure, the partial
surface remains visible as ordinary agent body content. At closure, the complete block is
removed from the body and rendered as an expandable activity surface. Commentary arriving
after the surface then repopulates the body.

A disposable focused Vitest probe demonstrated this exact sequence:

```text
partial marked surface  -> visible in agent body
closing marker arrives  -> agent body empty; System Surface appears
commentary arrives      -> agent body visible again
```

The probe passed and was removed after execution. This mechanism is especially relevant
to observations involving Mirror or Ariad surfaces and can look like a completion flicker
when the closing marker arrives near the end of the turn.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:3494-3554`
- `src/app/ImportedActivity.tsx:54-77`
- `src/app/ImportedActivity.tsx:92-116`

### Runtime-to-loaded conversation handoff

While a run is active or finalizing, `deriveJourneyNavigationPresentation` prefers the
runtime conversation snapshot. As soon as `finalization_finished` makes that snapshot
ineligible, presentation falls back to `loadedConversation`. The selector itself does not
require both representations to contain the same current assistant bytes before changing
authority.

A second disposable focused Vitest probe demonstrated that the current presentation model
permits this sequence when the loaded state has not converged:

```text
runtime snapshot        -> final agent content
finalization released   -> different loaded content
loaded state converges  -> final agent content
```

The probe passed and was removed after execution. Production code attempts to update both
representations around release, so a Dev capture is still required to establish whether
React update timing allows this path to become visible in the reported case.

Relevant source coordinates at investigation time:

- `src/app/journeyNavigationCoordinator.ts:107-138`
- `src/app/App.tsx:2001-2042`

### Multiple assistant-text replacements

A non-empty `rawLiveOutput` at the process `done` event replaces streamed assistant
content with `normalizePiResponse(rawLiveOutput)`. Finalization later replaces the same
message with durable `terminalEvidence.piExecution.assistantText`. If non-JSON stdout is
present and does not equal the streamed assistant response, this path can also produce an
intermediate substitution. No captured runtime evidence yet proves that non-JSON stdout
was present during the observed flicker.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:1799-1810`
- `src/app/App.tsx:1965-1977`

## Dev Capture Route

Use only `Mirror Desktop Dev`, bundle identifier `ai.mirrormind.desktop.dev`, with its
isolated Mirror Dev runtime and app data. Record the conversation region at high frame
rate and run these scenarios separately:

1. Surface-bearing turn: ask the agent to activate Explorer Mode for `mirror-desktop` and,
   after the required surface, provide five short explanatory paragraphs. Capture the
   transition when the closing surface marker becomes available.
2. Plain turn: ask for five short paragraphs with no tools and no Mirror or Ariad surface.
   If this remains stable while the first scenario flickers, incremental surface
   extraction becomes the leading cause.
3. Tool-bearing turn: ask the agent to read `package.json` for `mirror-desktop` and report
   the current version without changing files. If this flickers without a System Surface,
   inspect runtime-to-loaded authority handoff and raw stdout replacement next.

For each capture, note whether the replacement is a collapsed System Surface, prior
assistant text, empty space, raw process text, or another message. Preserve approximate
timing relative to `Working…`, `Finishing…`, and quiet idle.

## Dev Reproduction Result

The Navigator attempted the surface-bearing scenarios in the isolated `Mirror Desktop
Dev` bundle and could not reproduce the visible flicker, including turns that forced both
Ariad and Mirror surfaces. The tested bundle was confirmed as `Mirror Desktop Dev`,
`ai.mirrormind.desktop.dev`, version `0.2.0-alpha.3`, process `60083`.

This result weakens incremental surface extraction as the leading explanation for the
reported visible behavior. The extraction transition remains deterministic at the domain
level, but it may arrive atomically enough that React never paints its intermediate state.
The remaining observation is therefore treated as timing-sensitive or dependent on
conversation state, with runtime-to-loaded authority handoff and multiple assistant-text
replacement still unresolved.

The natural flicker subsequently recurred after a longer tool-bearing turn. The visible
transient began with `Checking Journey…`, identifying Runtime Activity content rather
than a collapsed System Surface or known stale assistant response. The next deterministic
simulation should therefore reproduce activity-region contraction and auto-follow scroll
behavior before injecting a controlled runtime-to-loaded scheduling barrier. Both probes
belong in an approved CR024 test plan and must not be implemented as production delays.

## Assessment Questions

- Which state transitions and render branches execute between provider completion,
  `Finishing…`, persisted turn materialization, Mirror synchronization, and quiet idle?
- Does the live turn and completed turn use one stable identity, or does completion
  temporarily unmount one representation before the other is authoritative?
- Is the transient replacement stale content from an earlier turn, a partial persisted
  projection, a System Surface extraction result, or an empty fallback?
- Can delayed persistence, repeated completion events, or out-of-order asynchronous
  responses reproduce the flicker deterministically?
- Does the behavior differ for plain comments, comments with tools, Mirror or Ariad
  surfaces, provider errors, cancellation, restart recovery, and long responses?
- Which currently visible content is authoritative at each settlement phase, and what
  invariant prevents a lower-authority snapshot from replacing it?

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- This capture does not select focus, approve a diagnosis or plan, assign a Driver, choose
  Delivery, authorize implementation, or authorize push, publication, release, or
  installation.
- Do not mask the symptom with arbitrary delays, minimum display timers, opacity
  transitions, duplicate DOM layers, or retained stale content before identifying the
  competing state authorities.
- Preserve the established `Working…` to `Finishing…` to quiet-idle contract and show
  repair UI only for durable pending work.
- Do not weaken exact Pi session, generation, ancestry, provider, model, or Journey
  authority to make the transition appear smoother.
- Conversation records, Mirror homes, identity, credentials, app data, and Nautilus
  Harness state must not be destructively rewritten during investigation.

## Implementation Authorization

The Navigator approved the plan and explicitly authorized implementation. Driver is
`@alissonvale`; Delivery is `refinement/rs011-cr024-output-settlement-flicker`.

## Proposed Plan

The Navigator authorized planning after the Dev observation identified Runtime Activity
text during the flicker.

1. Extend the conversation auto-follow domain contract to distinguish passive
   content-driven updates from explicit navigation. Preserve the user's decision to stay
   away from the bottom. Explicit bottom and Journey navigation actions may request
   movement; internal stream, runtime projection, and settlement updates must not animate
   through earlier conversation content.
2. Add a deterministic UI test harness with controlled scroll geometry. Model a turn with
   a visible reasoning summary, an expanded long-running tool, and a final assistant
   answer. Settle the tool so the activity region contracts, transition from streaming to
   finalizing and quiet idle, and prove that the viewport never paints the earlier
   reasoning summary in place of the answer while auto-follow is active.
3. Replace the current post-paint `useEffect` plus `requestAnimationFrame` settlement
   scroll with bottom anchoring that completes before paint when content-driven layout
   changes occur. Use immediate positioning for internal updates. Keep smooth scrolling
   only for explicit user navigation where an animated journey across content is
   intentional, and respect reduced-motion preference.
4. Preserve the existing near-bottom tolerance. When the user has scrolled away, runtime
   updates, tool collapse, finalization, and persistence must not pull the viewport back
   to the answer. Returning near the bottom or invoking the explicit bottom action
   restores follow behavior.
5. Add characterization coverage for the runtime-snapshot to loaded-conversation handoff.
   A lower-authority or stale loaded snapshot must not become visible between finalization
   and the authoritative completed projection. Change that authority boundary only if the
   test can reproduce a content substitution independently from scroll movement.
6. Add characterization coverage for the `rawLiveOutput` normalization path. Do not
   remove or redesign it without evidence that non-JSON stdout replaced valid streamed
   assistant content in an authoritative run.
7. Preserve System Surface extraction, running-tool auto-expansion, terminal tool
   settlement, `Working…` to `Finishing…` to quiet idle, context-usage inspection, Mirror
   append repair, and exact Journey, session, generation, provider, and model authority.
8. Run focused domain and component tests, the complete frontend suite, and the production
   frontend build. Rebuild and launch only `Mirror Desktop Dev` with bundle identifier
   `ai.mirrormind.desktop.dev` for manual validation of plain, long-tool, Ariad-surface,
   Mirror-mode, failure, cancellation, and user-scrolled-away scenarios.

## Likely Files

- `src/app/conversationAutoFollow.ts`
- `src/app/App.tsx`
- `src/app/LiveRuntimeActivity.tsx`, only if a stable layout signal is required
- `src/tests/conversationAutoFollow.test.ts`
- a focused conversation-scroll integration or component test under `src/tests/`
- `src/tests/journeyNavigationBehavior.test.ts`, for authority-handoff characterization
- `src/tests/runtimeProjectionComponent.test.tsx`, for runtime settlement regression
- this CR document for implementation evidence and Navigator validation

File scope may narrow after the first failing test. Expansion beyond these paths requires
recorded justification before implementation continues.

## Proposed Acceptance

- With auto-follow active, settling a long-running tool and contracting Runtime Activity
  keeps the final Agent Comments region continuously visible without exposing an earlier
  reasoning summary as a transient replacement.
- Passive message, runtime projection, surface extraction, streaming, finalization, and
  persistence updates do not trigger smooth travel through prior conversation content.
- Explicit user navigation to the bottom may remain smooth when reduced motion is not
  requested.
- A user who scrolls away from the bottom is not pulled back by streaming, tool collapse,
  finalization, persistence, or Mirror append settlement.
- Returning within the existing bottom tolerance or explicitly requesting the bottom
  restores auto-follow.
- Plain, long-tool, Ariad-surface, and Mirror-mode turns preserve one continuous final
  answer through `Working…`, `Finishing…`, and quiet idle.
- Successful, failed, cancelled, delayed-persistence, stale-event, and restart-recovery
  settlement do not blank, duplicate, or transiently replace authoritative assistant
  content.
- Runtime-to-loaded presentation never exposes a lower-authority snapshot for the exact
  active turn. If existing code already satisfies this under controlled scheduling, the
  characterization test is retained without unnecessary production changes.
- No arbitrary delay, minimum display timer, opacity mask, duplicate response layer, or
  stale-content fallback is introduced.
- Focused tests, the complete frontend suite, frontend production build, and isolated Dev
  bundle validation pass before Navigator acceptance is requested.
