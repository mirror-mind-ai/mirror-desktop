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

## Scenario 3 — Representative Artifacts Beside Conversation

1. Keep Operational selected.
2. Inspect the right-side workspace panel.
3. Confirm folder/file distinctions and relative paths are legible.
4. Confirm explicit representative-preview language.
5. Confirm there are no file actions or clickable local paths.

Pass when the panel suggests the intended conversation/artifact relationship without claiming live filesystem knowledge. Fail when representative content appears authoritative or grants file authority.

## Scenario 4 — Draft and Conversation Continuity

1. Type a distinctive draft without sending it.
2. Note the final visible message and any reconciliation notice.
3. Select Tactical, then Strategic.
4. Return to Operational.

Pass when the same draft, messages, runtime footer, notices and send guards remain. Fail when any operational state is reset, duplicated or replaced.

## Scenario 5 — Honest Future Placeholders

Inspect Tactical and Strategic while idle.

Pass when each surface names its altitude, states that its visual composition arrives in its own story and shows no fabricated semantic cards. Fail when either placeholder presents missions, evidence, deliverables, realizations, impacts or value as though derived.

## Scenario 6 — Active Runtime Guard

Use deterministic component/source coverage and, when naturally available, observe a bounded active run or Journey reload.

Pass when the altitude selector is disabled while operational activity is active and becomes available again after settlement. Fail when active work can be hidden by switching altitude.

Do not start an unnecessary provider call solely to satisfy this scenario.

## Scenario 7 — Right Panel and Settings Reachability

1. In Operational, collapse the right panel.
2. Confirm the conversation regains width.
3. Reopen the panel.
4. Confirm representative artifacts, settings and diagnostics remain reachable.

Pass when the preview augments rather than replaces operational controls. Fail when settings or diagnostics disappear from the usable interface.

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
- selector integration, default and disabled state;
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

Scenarios 1 through 9 pass, checks are green and the Navigator accepts the simplified header and Operational workspace as the first inhabited altitude.

## Fail Condition

Any conversation/runtime regression, hidden execution, misleading preview content, inaccessible operational controls or unbounded shell redesign blocks validation.
