[< Story](index.md)

# Test Guide — CV-003.DS-001

## Purpose

Validate that the real Harness can present Operational, Tactical and Strategic as three perceptibly different altitudes over one selected Journey without weakening the existing conversation, invocation or reconciliation behavior.

## Scenario 1 — Stable Journey Shell

1. Launch the Tauri desktop app with the normal Journey registry.
2. Select `nautilus-harness`.
3. Observe the Journey sidebar, selected Journey header and altitude selector.
4. Visit all three altitudes.

Pass when the sidebar and active Journey remain stable while only the workspace altitude changes. Fail if an altitude behaves like a separate disconnected module or changes the selected Journey implicitly.

## Scenario 2 — Operational Continuity

1. Open Operational with an existing loaded conversation.
2. Type a distinctive draft without sending it.
3. Note the visible final conversation message and any reconciliation notice.
4. Visit Tactical, then Strategic, then return to Operational.

Pass when the draft, messages, composer, runtime footer and reconciliation state are unchanged. Fail if altitude navigation sends a request, starts Pi/Mirror/provider work, loses the draft or remounts a different conversation.

## Scenario 3 — Operational Artifacts Preview

1. Inspect the right-side artifacts composition in Operational.
2. Confirm representative folders/files are legible beside the conversation.
3. Confirm the panel states that it is preview content.
4. Attempt no real file action in this experiment.

Pass when the panel helps the Navigator feel the future conversation/artifact relationship without claiming to inspect the live filesystem. Fail if preview entries look authoritative, open unrestricted local paths or displace essential settings/diagnostics without another reachable route.

## Scenario 4 — Tactical Altitude

1. Select Tactical.
2. Inspect the active mission, evidence and deliverables.
3. Compare their wording with the shared representative Journey content.
4. Check visual density and hierarchy.

Pass when Tactical feels calmer and more structured than Operational, the three semantic groups feel related, and the surface is visibly a preview. Fail if it resembles an editable task board, presents unrelated cards or exposes a composer/provider action.

## Scenario 5 — Strategic Altitude

1. Select Strategic.
2. Inspect realizations, impacts and generated value.
3. Compare pragmatic and integrative lenses for the same realization.
4. Check visual space and hierarchy.

Pass when Strategic feels broader than Tactical, the realization connects to observed impacts, and both value lenses remain complementary. Fail if it becomes an executive metrics dashboard, assigns synthetic scores or separates the two lenses into unrelated outcomes.

## Scenario 6 — One Territory Across Altitudes

1. Start from the representative current mission in Tactical.
2. Move to Strategic and identify the related realization/value reading.
3. Return to Operational and identify the source-like conversation/artifact context suggested by the preview.

Pass when the three screens appear to reframe one Journey narrative. Fail when each screen uses unrelated example content or visual language.

## Scenario 7 — Journey Isolation

1. While no run is active, switch to another Journey.
2. Return to `nautilus-harness`.
3. Verify its persisted conversation is unchanged.
4. Repeat altitude navigation without sending a message.

Pass when Journey conversation isolation remains intact and preview content never overwrites Journey state. Fail on cross-Journey messages, drafts, runtime events or persistence leakage.

## Scenario 8 — Existing Safety Boundaries

Confirm through automated characterization and inspection that:

- Enter still sends and Shift+Enter still inserts a newline in Operational;
- send remains disabled for active runs, invalid provider settings and reconciliation blockers;
- altitude navigation has no Pi/provider/Mirror invocation handler;
- Ariad/mode surfaces and imported activity remain inert;
- allowed-root link restrictions remain unchanged;
- no `dangerouslySetInnerHTML` is introduced.

## Automated Coverage

Add focused tests for:

- accepted `JourneyAltitude` values and Operational default;
- deterministic representative preview data;
- altitude switcher labels, selected state and accessibility semantics;
- Operational preview label and artifact entries;
- Tactical mission/evidence/deliverable rendering;
- Strategic realization/impact/pragmatic/integrative rendering;
- shared representative identifiers across Tactical and Strategic;
- source characterization proving altitude selection is not connected to invocation functions;
- existing conversation and reconciliation suites remaining green.

Run:

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

No Mirror test expansion is required unless implementation unexpectedly changes Mirror-owned behavior. Such a change should normally trigger a stop rather than expanded scope.

## Navigator Evidence

Record:

- app build/commit under review;
- selected Journey;
- screenshots or concise observations for each altitude;
- whether Operational still feels like the current working cockpit;
- whether Tactical feels like orientation rather than task management;
- whether Strategic feels like realization/value rather than reporting;
- whether transitions preserve one-territory continuity;
- any layout correction required;
- final judgment: `continue`, `correct` or `discard`.

Do not record private conversation content, prompts, responses, secrets or reasoning in evidence.

## Pass Condition

- all required automated checks pass;
- Scenarios 1 through 8 pass;
- preview data is unmistakably non-authoritative;
- no invocation, persistence or reconciliation regression appears;
- the Navigator accepts that the experiment is sufficient to guide the next design movement.

## Fail Condition

- any altitude navigation changes operational conversation authority;
- preview data appears to be live derived truth;
- the three views feel like unrelated modules;
- Tactical or Strategic introduces hidden execution;
- existing Journey isolation or runtime safety regresses;
- the Navigator cannot judge the direction from the real desktop experience.
