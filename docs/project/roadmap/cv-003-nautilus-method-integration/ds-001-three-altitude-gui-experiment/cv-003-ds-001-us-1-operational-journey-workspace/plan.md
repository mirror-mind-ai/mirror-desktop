# Plan — CV-003.DS-001.US-1

## Objective

Simplify the Journey header by removing its Mission, Delivery, Situation, Current Map and participant summaries; mount the approved altitude contract in the space this creates; preserve the existing Journey sidebar and complete conversation/runtime behavior as the Operational altitude; and let Chat and representative Artifacts alternate as full-width Operational surfaces. Tactical and Strategic remain selectable but intentionally show bounded preview placeholders until their own stories. Navigation stays ephemeral and never invokes Pi, Mirror or a provider.

## Product Boundary

This story makes the first altitude real without pretending the other two are finished. Operational is not a new chat implementation. It is the existing trusted cockpit placed inside the three-altitude grammar. Chat and Artifacts are alternate surfaces within Operational, not permanent columns. Each uses the full workspace after the Journey sidebar. The artifact tree is a spatial prototype built from TS-1 representative data, not a filesystem browser.

The current header over-specifies semantic context before the altitude grammar exists. Mission, Delivery, Situation, the complete Current Map summary and participant avatars will be removed from the header. This is deliberate product simplification, not temporary hiding. Journey identity, menu actions and the concise moment summary remain. Mission information continues to exist in the grammar inspector and underlying model; this story removes redundant header projection, not domain data.

Tactical and Strategic need enough presence to make the selector understandable and to validate return-to-Operational continuity. They must not anticipate their semantic layouts. Their placeholders should name the future altitude, state that it belongs to a later experiment story, and offer no fabricated derived content.

## Existing Terrain

`App.tsx` owns the selected Journey, restored conversation, unsent draft, Pi runtime projection, provider configuration, context state and reconciliation notices. Its current three-column shell contains the Journey sidebar, central `chat-shell` and a collapsible right-side grammar/settings panel. The right panel starts collapsed. The expanded header currently renders Mission, Delivery and Situation pills plus a Current Map row and participant avatars; these consume the space selected for altitude navigation.

TS-1 added:

```text
src/app/journeyAltitudePreview.ts
src/app/JourneyAltitudeSwitcher.tsx
```

The switcher is controlled and side-effect free. This story may add integration-oriented props such as `disabled` when required by the live run boundary, but must preserve that contract.

## TDD Sequence

### 1. Characterize the operational shell

Before changing production markup, add focused assertions for the behaviors that must survive:

- Journey sidebar remains outside altitude-specific workspace rendering;
- existing message stream, composer, runtime footer and reconciliation notices remain the Operational body;
- `Enter` and `Shift+Enter` behavior remains unchanged;
- send guards and explicit invocation call sites remain unchanged;
- draft and conversation state remain owned above altitude-specific rendering;
- settings and diagnostics remain available from Operational.

Use behavior tests where feasible and narrow raw-source characterization only for call-site boundaries that the current node-only test environment cannot interact with directly.

### 2. Simplify the Journey header

Remove from `App.tsx`:

- the Mission, Delivery and Situation status rail;
- the complete Current Map summary and its counters;
- participant avatars and participant labels;
- helper values, derived arrays and presentation-only logic that become unused after those surfaces are removed.

Remove CSS that exists only for the deleted status rail, pills, map summary or participant avatars. Keep shared styles still used elsewhere. Preserve:

- active Journey icon and title;
- Journey menu actions;
- right-panel control;
- concise `journey-moment-summary` copy;
- any underlying mission/conversation data still used by the inspector or runtime.

Add characterization assertions that the removed labels/classes no longer appear in the header and that retained controls remain present.

### 3. Mount controlled ephemeral altitude state

In `App.tsx`:

- initialize `selectedAltitude` from `defaultJourneyAltitude`;
- initialize an ephemeral Operational surface state with `chat` as the default and `artifacts` as the alternative;
- mount `JourneyAltitudeSwitcher` in the stable Journey header outside the expanded/collapsed detail region;
- mount a controlled Chat/Artifacts selector visible only while Operational is selected;
- preserve the selected altitude during ordinary Journey switching within the same app session;
- do not write altitude to Journey preferences, local storage or conversation persistence;
- disable altitude and Operational-surface switching while a Pi run, stream or Journey reload is active so operational activity cannot disappear behind another surface;
- never connect either selector callback to invocation, reconciliation or persistence functions.

The simplified common header and selected Journey identity remain visible at every altitude.

### 4. Establish altitude workspace rendering

Keep the existing Operational message stream and composer markup functionally intact inside the `chat` surface. Conditional rendering may hide them behind altitude/surface branches, but their state must remain in `App` so visiting Artifacts or a future-altitude placeholder and returning preserves draft, conversation, runtime and notices. When Artifacts is selected, the chat, composer and optional grammar/settings panel are hidden and the artifact workspace receives the full available width.

For `tactical` and `strategic`, render a small shared placeholder component or equivalent markup that:

- identifies the selected altitude;
- states that its visual composition arrives in US-2 or US-3;
- labels itself as part of the GUI experiment;
- contains no cards that resemble derived live data;
- contains no composer, send action, file action or provider control.

The placeholder is scaffolding only. Do not start Tactical or Strategic visual composition here.

### 5. Compose the full-width Operational Artifacts surface

Create or reshape `OperationalArtifactsPreview.tsx` using `representativeJourneyPreview.artifacts` from TS-1.

The surface should:

- replace the Chat surface when Artifacts is selected;
- occupy the full workspace after the Journey sidebar, with the permanent right panel forced closed;
- identify the selected Journey by display name while stating that the artifact layout is representative;
- render folder/file distinctions and relative paths without links or file actions;
- use explicit copy such as `Representative preview` and `Live workspace reading comes later`;
- provide enough internal space for a future browser/detail composition without implementing it now;
- return to Chat without losing draft, conversation, runtime or reconciliation state.

The existing grammar/settings panel remains an optional Chat-only inspector, collapsed by default. Do not convert representative paths into clickable local links. Real workspace projection belongs to CV-003.DS-002.

### 6. Shape the visual altitude grammar

Extend `src/styles/app.css` with scoped classes:

- altitude selector integrated with the existing dark teal shell;
- clear selected/focus/disabled states;
- full-width Chat by default, with the existing right inspector available on demand;
- full-width Artifacts surface with an internal browser/detail spatial suggestion;
- representative artifacts hierarchy with restrained file/folder treatment;
- calm, bounded placeholder field for Tactical and Strategic;
- no global style reset or unrelated visual refinement.

At desktop widths, Chat and Artifacts should both begin at the full available workspace width. The existing grammar/settings panel remains collapsed by default and can compress Chat only when the Navigator explicitly opens it. Artifacts and future altitudes always force that panel closed.

### 7. Prove runtime separation and continuity

Add tests for:

- removal of Mission, Delivery, Situation, Current Map and participant header surfaces;
- retention of Journey identity, menus and concise moment summary;
- altitude and Chat/Artifacts selector integration with Chat as the Operational default;
- active-run/reload disabling for both selectors;
- representative artifact labels, relative entries and full-width workspace rendering;
- draft/conversation continuity across Chat to Artifacts to Chat;
- Tactical/Strategic placeholders containing no derived content or execution controls;
- altitude changes using presentation state only;
- existing conversation/input/runtime call sites remaining intact;
- no new imports from native filesystem or new Pi/Mirror/provider commands;
- no `dangerouslySetInnerHTML`.

Then run the complete frontend and native baseline.

## Expected Production Files

```text
src/app/App.tsx
src/app/JourneyAltitudeSwitcher.tsx
src/app/OperationalWorkspaceSwitcher.tsx
src/app/OperationalArtifactsPreview.tsx
src/app/JourneyAltitudePlaceholder.tsx
src/styles/app.css
```

The placeholder may remain local to `App.tsx` if extraction would add complexity without test value. No Rust, Python, Mirror or protocol change is expected.

## Scope

- Removal of Mission, Delivery, Situation, Current Map and participant summaries from the header.
- Removal of presentation logic and styles made dead by that simplification.
- Preservation of Journey identity, menus, concise moment summary and underlying domain data.
- Live altitude selector in the simplified Journey header.
- Ephemeral altitude and Operational-surface selection.
- Controlled Chat/Artifacts selector within Operational.
- Existing chat as a full-width Operational surface.
- Representative Artifacts as an alternate full-width Operational surface.
- Optional grammar/settings panel restricted to Chat and collapsed by default.
- Bounded Tactical and Strategic placeholders.
- Active-run navigation guard.
- Desktop visual composition and accessibility.
- Automated regression coverage and Tauri Navigator validation.

## Non-Goals

- Real Tactical or Strategic content.
- Real filesystem listing, links, opening, watching or mutation.
- Prompt attachments.
- Semantic derivation or background analysis.
- Altitude persistence.
- New runtime/provider invocation.
- Conversation, reconciliation, context or compaction changes.
- Mobile layout or broad design-system refactoring.
- DS-007, DS-009 or CV-003.DS-002 through DS-005.

## Acceptance Behavior

```text
Given the current Journey header
When US-1 simplifies it for altitude navigation
Then Mission, Delivery, Situation, Current Map and participant summaries are absent
And Journey identity, menu actions, right-panel control and concise moment summary remain.
```

```text
Given the Harness opens with a selected Journey
When the shell settles
Then Operational and Chat are selected
And the existing conversation uses the full available workspace
And the optional grammar/settings inspector remains collapsed until requested.
```

```text
Given an unsent draft and restored conversation in Operational Chat
When the Navigator visits Artifacts, Tactical or Strategic and returns to Chat
Then the draft and conversation are unchanged
And Artifacts uses the full available workspace
And no Pi, Mirror, provider, persistence or reconciliation action was triggered.
```

```text
Given a run, stream or Journey reload is active
When the Navigator sees the altitude selector
Then altitude changes are disabled
And the active operational surface remains visible until settlement.
```

```text
Given Tactical or Strategic is selected while idle
When its placeholder appears
Then it names the future altitude honestly
And it shows no fabricated mission, evidence, deliverable, realization, impact or value content.
```

## Validation Route

Automated validation covers rendering, accessibility, preview honesty, active-run guarding and source-level ownership boundaries. Run:

```bash
npm test -- <focused US-1 test files>
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Navigator E2E is required in the real Tauri desktop app:

1. Launch the app and select `nautilus-harness`.
2. Confirm Operational is selected and the existing conversation is intact.
3. Confirm Chat occupies the full workspace and type a distinctive draft without sending it.
4. Select Artifacts and confirm it replaces Chat at full width with explicit preview labeling.
5. Return to Chat and confirm the draft, messages and controls are unchanged.
6. Visit Tactical and Strategic placeholders, then return to Operational Chat.
7. Open and close the optional right inspector in Chat.
8. Confirm settings/diagnostics remain reachable and that Artifacts forces the inspector closed.
9. If a bounded safe run is already available, confirm both selectors are disabled while it is active. Do not create an unnecessary provider call solely for this check when deterministic coverage is sufficient.

## Required Checks

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Pass Condition

- all automated checks pass;
- Operational remains a usable conversation cockpit;
- Chat and Artifacts alternate at full width;
- preview artifacts are visible, useful and unmistakably representative;
- Artifacts and placeholder visits preserve draft and conversation state;
- no altitude action invokes or persists anything;
- active runtime cannot be hidden by altitude switching;
- Navigator accepts the Operational composition in the desktop app.

## Stop Conditions

- conditional rendering loses conversation, draft, runtime or reconciliation state;
- an altitude switch can run while active work becomes hidden;
- settings or diagnostics become unreachable;
- Artifacts cannot receive full workspace width without unbounded shell restructuring;
- artifact preview requires native filesystem access;
- Tactical or Strategic need real semantic composition to make the selector understandable;
- implementation changes Pi, Mirror, provider or persisted conversation ownership;
- the current three-column shell requires an unbounded redesign.

## Implementation Contract

- Follow red/green/refactor and preserve existing shell characterization.
- Keep Operational runtime markup behaviorally unchanged unless a test proves the refactor safe.
- Keep preview content sanitized, non-clickable and explicitly non-authoritative.
- Use semantic controls, visible focus and selected/disabled states.
- Do not use `dangerouslySetInnerHTML`.
- Stage and commit only US-1 files with an English message explaining the product boundary.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
