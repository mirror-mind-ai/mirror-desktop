[< Story](index.md)

# Test Guide — CV-003.DS-001.US-2

## Purpose

Validate that Tactical becomes a durable, calmer workspace shell over the same selected Journey: mission leads, related evidence and deliverables support it, representative status is unmistakable, and no operational execution or editing behavior enters the surface.

## Automated Validation

### Representative relation contract

Verify that:

- the active mission references existing evidence and deliverable IDs;
- Tactical renders only records referenced by that mission;
- deterministic source order is preserved;
- missing unrelated records do not appear accidentally;
- the source model remains `representative_preview` with `previewStatus: representative`.

### Tactical component semantics

Static-render `TacticalJourneyWorkspace` and verify:

- `role="tabpanel"` and the accessible Tactical workspace label;
- explicit representative-preview badge/copy;
- mission title and purpose;
- evidence and deliverable section headings;
- semantic lists for related records;
- read-only descriptive deliverable states;
- no `form`, `input`, `textarea`, submit button, send action, editable element or drag/drop affordance;
- no wording that claims live or authoritative derivation.

### App composition and safety

Characterize source/composition so that:

- Tactical mounts the dedicated component only for `selectedAltitude === "tactical"`;
- Strategic still mounts the foundation placeholder;
- Operational Conversation/Artifacts branches remain intact;
- the Tactical component imports no invocation, persistence, Tauri command or runtime module;
- altitude selection remains isolated from Pi, Mirror and provider invocation.

### Regression baseline

Run:

```bash
npm test -- src/tests/tacticalJourneyWorkspace.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Desktop Scenario

1. Launch `npm run tauri dev` using the normal Journey registry.
2. Select `nautilus-harness`.
3. Open Operational → Conversation and type a distinctive draft without sending.
4. Select Tactical.
5. Verify the selected Journey header and sidebar remain stable.
6. Read the mission anchor, then its evidence and deliverables.
7. Confirm the preview label is immediately visible.
8. Confirm there is no composer, send button, mutation control or workflow affordance.
9. Return to Operational → Conversation.
10. Confirm the draft, messages, runtime and reconciliation state are unchanged.

## Expected Observation

Tactical has less visual noise and more breathing room than Operational. The mission is clearly primary. Evidence and deliverables read as two supporting dimensions of that mission rather than unrelated inventories. Deliverable states are informative, not actionable. The surface clearly identifies itself as representative preview content.

## Pass Condition

- all automated checks pass;
- mission, evidence and deliverables form one coherent reading;
- Tactical feels like orientation rather than task management;
- preview honesty is immediately legible;
- no execution/editing behavior appears;
- Operational state survives the round trip;
- the Navigator accepts the shell for later live hydration.

## Fail Condition

- evidence or deliverables unrelated to the mission appear;
- the composition resembles a kanban board, dashboard or form;
- representative data looks live or authoritative;
- any Tactical interaction can invoke Pi, Mirror or a provider;
- Journey identity or Operational conversation state changes;
- desktop hierarchy or readability is not acceptable.

## Evidence Rules

Record the commit, automated check results and a Tactical desktop screenshot or concise visual observation. Do not capture private prompts, responses, transcripts, secrets, environment variables or reasoning.
