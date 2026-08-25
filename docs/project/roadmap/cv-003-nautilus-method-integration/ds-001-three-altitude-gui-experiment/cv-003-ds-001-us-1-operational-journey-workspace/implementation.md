# Implementation — CV-003.DS-001.US-1

## Delivered Experience

- Removed Mission, Delivery, Situation, Current Map and participant summaries from the Journey header.
- Removed their dead counters, labels and CSS while preserving Journey identity, menus, header collapse, right-panel control and concise moment summary.
- Mounted the controlled Operational/Tactical/Strategic selector in the simplified header.
- Added a controlled Conversation/Artifacts selector within Operational.
- Kept altitude and Operational-surface state ephemeral and separate from Journey preferences, conversation persistence and runtime ownership.
- Disabled both selectors during active stream/run or Journey reload.
- Preserved the existing message stream, composer, runtime footer and reconciliation notices as the full-width Conversation surface.
- Added an alternate full-width Artifacts surface using sanitized TS-1 fixture paths, with no links or file actions.
- Removed redundant artifact eyebrow, repeated Journey title, explanatory preview paragraph and badge so Workspace structure and Artifact detail area consume the canvas.
- Returned grammar inspection, settings and diagnostics to an optional Conversation-only panel collapsed by default.
- Added bounded Tactical and Strategic placeholders without fabricated semantic content or execution controls.

## TDD Evidence

The focused tests failed first because the new workspace components and disabled selector contract did not exist. They passed after the presentation components, shell integration and scoped styles were implemented.

```text
Focused correction: 2 files, 11 tests passed
Frontend: 29 files, 197 tests passed
Production build: passed
Rust: 8 tests passed
cargo check: passed
```

## Visual Inspection

A local browser rendering confirmed:

- Operational and Conversation selected by default;
- simplified header and visible altitude/surface selectors;
- full-width Conversation without a permanent right sidebar;
- unframed full-width Artifacts with only the Workspace structure and Artifact detail area cards;
- Tactical and Strategic placeholders;
- right-panel control restricted to Chat;
- an unsent draft survived Chat to Artifacts to Chat navigation.

Sanitized temporary screenshots were written outside the repository:

```text
/tmp/nautilus-us1-full-chat.png
/tmp/nautilus-us1-artifacts-refined.png
```

The Tauri development app also launched successfully through `target/debug/nautilus-harness` and was stopped after the launch check.

## Changed Production Files

```text
src/app/App.tsx
src/app/JourneyAltitudeSwitcher.tsx
src/app/JourneyAltitudePlaceholder.tsx
src/app/OperationalWorkspaceSwitcher.tsx
src/app/OperationalArtifactsPreview.tsx
src/styles/app.css
```

## Boundary Confirmation

No Rust, Python, Pi, Mirror, provider, protocol, filesystem or persisted conversation behavior changed. Tactical and Strategic semantic composition remains assigned to US-2 and US-3.
