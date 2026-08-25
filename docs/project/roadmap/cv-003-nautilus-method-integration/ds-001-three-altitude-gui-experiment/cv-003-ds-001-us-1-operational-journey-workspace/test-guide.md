[< Story](index.md)

# Test Guide — CV-003.DS-001.US-1

## Purpose

Validate that the existing Harness conversation becomes the Operational altitude inside a stable three-altitude shell, with a useful but honest artifacts preview and no change to runtime authority.

## Scenario 1 — Simplified Journey Header

1. Launch the real Tauri app.
2. Select `nautilus-harness`.
3. Inspect the Journey header in expanded and collapsed states.

Pass when Mission, Delivery, Situation, Current Map and participant summaries are absent, while Journey identity, menu actions, right-panel control and the concise moment summary remain. Fail when removed semantic summaries still occupy header space or required Journey controls disappear.

## Scenario 2 — Operational Default

1. Keep `nautilus-harness` selected.
2. Inspect the Journey header and workspace.

Pass when Operational is selected, the existing conversation is present and the altitude selector does not displace Journey identity. Fail when another altitude is selected by default or existing conversation content is rematerialized as preview data.

## Scenario 3 — Full-Width Operational Surfaces

1. Keep Operational and Conversation selected.
2. Confirm the conversation occupies the full workspace and the optional inspector is collapsed.
3. Select Artifacts.
4. Confirm Artifacts replaces Conversation and occupies the same full workspace.
5. Confirm Workspace structure and Artifact detail area use the canvas without a Journey artifacts eyebrow, repeated Journey title, explanatory preview paragraph or representative badge.
6. Confirm there are no file actions or clickable local paths.

Pass when Conversation and Artifacts alternate without permanent width loss and the two artifact cards occupy the canvas without redundant framing. Fail when either surface remains compressed by a permanent artifact sidebar or representative content appears authoritative.

## Scenario 4 — Draft and Conversation Continuity

1. In Operational Chat, type a distinctive draft without sending it.
2. Note the final visible message and any reconciliation notice.
3. Select Artifacts, then Tactical, then Strategic.
4. Return to Operational Chat.

Pass when the same draft, messages, runtime footer, notices and send guards remain. Fail when any operational state is reset, duplicated or replaced.

## Scenario 5 — Honest Future Placeholders

Inspect Tactical and Strategic while idle.

Pass when each surface names its altitude, states that its visual composition arrives in its own story and shows no fabricated semantic cards. Fail when either placeholder presents missions, evidence, deliverables, realizations, impacts or value as though derived.

## Scenario 6 — Active Runtime Guard

Use deterministic component/source coverage and, when naturally available, observe a bounded active run or Journey reload.

Pass when both the altitude selector and Chat/Artifacts selector are disabled while operational activity is active and become available again after settlement. Fail when active work can be hidden by switching surface.

Do not start an unnecessary provider call solely to satisfy this scenario.

## Scenario 7 — Right Panel and Settings Reachability

1. In Operational Chat, confirm the right inspector starts collapsed.
2. Open it and confirm settings and diagnostics remain reachable.
3. Close it and confirm Chat regains full width.
4. Select Artifacts and confirm the inspector stays closed and unavailable there.

Pass when the inspector is an optional Chat-only control and never compresses Artifacts or future altitudes. Fail when settings disappear or the panel remains permanently open.

## Scenario 8 — Journey Isolation

1. Switch to another Journey while no run is active.
2. Observe the selected altitude and workspace.
3. Return to `nautilus-harness`.

Pass when each Journey retains its existing conversation authority and no preview content is written to Journey state. Fail on message, draft, runtime or persistence leakage.

## Scenario 9 — Existing Input and Invocation Safety

Automated characterization must confirm:

- Enter sends and Shift+Enter inserts a newline in Operational;
- existing send guards remain;
- altitude callbacks only change presentation state;
- no new Pi, Mirror, provider, Tauri or filesystem command exists;
- imported activity and mode/Ariad surfaces remain inert;
- no `dangerouslySetInnerHTML` is introduced.

## Automated Coverage

Add focused tests for:

- removed header surfaces and eliminated dead presentation classes/logic;
- retained Journey identity, menu controls and concise moment summary;
- altitude and Conversation/Artifacts selector integration, defaults and disabled states;
- full-width surface alternation and optional Chat-only inspector;
- Operational artifact preview labeling and entries;
- placeholder labeling and semantic emptiness;
- App ownership of draft/conversation above altitude rendering;
- runtime/reload navigation guard;
- preservation of existing invocation call sites;
- absence of new runtime/filesystem dependencies.

Run:

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Evidence

Record only:

- reviewed app commit;
- selected Journey;
- concise observations or sanitized screenshots of the three altitude states;
- draft continuity result without recording draft content;
- right-panel collapse/reopen result;
- settings/diagnostics reachability;
- automated baseline;
- explicit acceptance or requested correction.

Do not persist private conversation content, prompts, responses, secrets, arbitrary runtime metadata or reasoning.

## Pass Condition

Scenarios 1 through 9 pass, checks are green and the Navigator accepts full-width Conversation/Artifacts alternation with the simplified artifact canvas.

## Fail Condition

Any conversation/runtime regression, hidden execution, misleading preview content, inaccessible operational controls or unbounded shell redesign blocks validation.
