[< RS011 — Conversation surface semantic composition](index.md)

# CR024 — Prevent agent output flicker when a turn settles

## Problem

When an agent turn finishes in Mirror Desktop, the visible agent output can flicker. The
content currently being shown disappears, is briefly replaced by different content, and
then reappears. This makes successful turn completion look unstable and raises doubt
about whether the response was lost, rewritten, or restored from another source.

The phenomenon occurs at the boundary where live runtime output settles into the
completed conversation representation. Investigation initially kept the cause open; the
Navigator's decisive screenshot later identified the exact global loading replacement.

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
transitions and one additional replacement path. The Navigator's captured frame then
identified the actual replacement surface and displaced the earlier scroll hypothesis.

### Confirmed same-Journey authority reload

The captured frame shows the whole conversation replaced by the global `Checking Journey
conversation…` surface while the composer still reports `Finishing…`. This is not a
reasoning summary, assistant-content substitution, System Surface extraction, or viewport
travel. `JourneyThreadState` renders that exact global replacement only when
`journeyThreadState.kind === "loading"`.

The authority restore effect begins a new conversation inspection whenever its native
lease dependencies change. Before loading the dedicated thread, it unconditionally set
both `conversationLoaded` to false and `journeyThreadState` to `loading`. Native lease
phase and terminal-state changes occur around settlement, so a same-Journey authority
refresh could unmount the already ready conversation even though the selected Journey
and currently presented conversation had not changed. The async restore then classified
the same thread as ready and mounted the conversation again, producing the captured
flicker.

The selection path is not responsible for this frame: selecting the already selected
Journey exits without resetting state. The captured global surface plus the restore
effect's unconditional setter establish the competing presentation authority.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:1024-1038`
- `src/app/App.tsx:1188-1189`
- `src/app/JourneyThreadState.tsx`

### Disproven primary hypothesis: runtime contraction and smooth auto-follow

Before the decisive frame was available, the transient words `Checking Journey…` were
mistaken for a possible dynamic Runtime Activity summary exposed by smooth auto-follow
after tool contraction. An approved repair moved passive scrolling before paint and made
it immediate. The later screenshot proves that diagnosis was wrong: the entire chat was
replaced by the dedicated global loading surface while `Finishing…` remained visible.

The viewport repair was therefore reverted rather than retained as an unrelated masking
change. Existing auto-follow semantics remain outside this CR unless independent evidence
establishes a separate defect.

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

The natural flicker subsequently recurred after a longer tool-bearing turn. A decisive
Navigator screenshot captured the full `Checking Journey conversation…` global loading
surface while the composer still showed `Finishing…`. This corrects the earlier reading
that only Runtime Activity text had become visible. The frame maps directly to the
`journeyThreadState.kind === "loading"` branch and to the unconditional loading reset in
the authority restore effect.

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

The Navigator authorized implementation before the decisive screenshot. Evidence changed
the diagnosis, so execution was narrowed to the confirmed state transition rather than
continuing the disproven viewport repair.

1. Revert the viewport-specific implementation so CR024 does not retain an unrelated
   behavioral change.
2. Characterize when an already ready conversation belongs to the exact currently
   selected Journey.
3. During a background authority refresh, preserve that ready presentation instead of
   resetting it to the global loading branch. Continue to show loading for initial load,
   Journey changes, and any non-exact conversation.
4. Allow the completed inspection to replace the retained presentation with its honest
   classified result, including unavailable or recovery states; do not create a stale
   fallback or weaken authority checks.
5. Preserve exact Journey, thread, generation, lease, settlement, and persistence
   authority, plus the existing `Working…` to `Finishing…` to quiet-idle contract.
6. Run focused tests, the complete frontend suite, and the production frontend build.
   Rebuild and launch only `Mirror Desktop Dev` for Navigator validation.

## Likely Files

- `src/app/App.tsx`
- `src/app/journeyNavigationCoordinator.ts`
- `src/tests/journeyNavigationBehavior.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- this CR document for implementation evidence and Navigator validation

File scope may narrow after the first failing test. Expansion beyond these paths requires
recorded justification before implementation continues.

## Proposed Acceptance

- A lease or settlement authority refresh for an already ready exact Journey does not
  replace the mounted conversation with `Checking Journey conversation…`.
- Initial conversation load, Journey changes, and non-exact conversation state continue
  to use the honest loading surface.
- The refresh result may still transition to an honest unavailable or recovery state;
  ready content is not retained as a stale fallback after classification completes.
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

## Implementation

Implemented the captured-surface repair:

- reverted the disproven viewport-authority implementation in
  `cb3d49f Revert "Keep the final response anchored while runtime activity settles"`;
- introduced a pure exact-Journey rule for preserving an already ready conversation while
  its authority is reinspected;
- gated the restore effect's `conversationLoaded = false` and global
  `journeyThreadState = loading` reset behind that rule;
- retained the asynchronous authority reload and its final classified result, so the
  change prevents only the transient global loading replacement and does not bypass
  persistence, recovery, or failure decisions;
- initial load and explicit Journey selection continue to enter the loading state.

Implementation commit:

```text
c928237 Keep ready conversations visible during authority refresh
```

## Evidence

- The revised focused TDD run failed because the exact-Journey preservation rule and the
  loading-reset guard did not exist.
- 15 focused tests passed across Journey navigation behavior and runtime integration.
- All 645 frontend tests passed across 117 files after the disproven scroll tests and
  implementation were removed.
- `npm run build` passed with only the existing Vite chunk-size warning.
- `npm run tauri:build:dev` rebuilt the isolated application and DMG successfully.
- Bundle metadata confirms `Mirror Desktop Dev`, `ai.mirrormind.desktop.dev`, version
  `0.2.0-alpha.3`.
- The rebuilt isolated Dev executable ran as process `67421` for Navigator validation.
- The Navigator validated a long multi-tool turn without recurrence of the flicker.

## Navigator Validation

Validated by the Navigator in the rebuilt isolated `Mirror Desktop Dev` bundle on
2026-09-10. A long turn with multiple tool calls completed through `Finishing…` without
the conversation being replaced by `Checking Journey conversation…`; the reported
flicker did not recur.

Scroll-away behavior is not a CR024 acceptance condition because the decisive screenshot
disproved viewport movement as the reported mechanism.

## Closure Review

**Proportionality.** The final production change is limited to a small pure exact-Journey
presentation rule and one guard around the existing loading reset. The asynchronous
restore, classification, persistence, settlement, and recovery paths remain intact. The
disproven scroll implementation was explicitly reverted rather than retained as unrelated
scope.

**Debt.** No migration, compatibility layer, timer, duplicate presentation, or stale-data
fallback was introduced. The source-level integration guard is intentionally paired with
a unit-tested domain rule; no new technical-debt ledger entry is warranted. Broader
semantic turn composition remains owned by CR021–CR023 rather than being smuggled into
this repair.

CR024 is closed as `done` after automated evidence and explicit Navigator acceptance.
