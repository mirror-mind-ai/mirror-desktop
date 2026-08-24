# Validation — DS-006.US-4

## Status

Passed

## Automated Checks

- npm test passed: 11 test files, 44 tests
- npm run build passed after ordering, sidebar scroll, and stronger Tree indentation adjustments
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated visually: sidebar has working Recent/A–Z/Tree ordering, Journey list scrolls, Tree mode hierarchy is visibly indented with connector cues, search still works, and Journey selection does not invoke Pi.

## Navigator Validation

Route: Run npm run tauri -- dev. In the Journey sidebar, switch the order selector between Recent, A–Z, and Tree. Confirm Recent shows active/recent cockpit list, A–Z shows all Journeys alphabetically, Tree shows all Journeys in hierarchy/depth order with visible indentation, the sidebar scrolls, search still works in each mode, and selecting a Journey does not invoke Pi or reorder Recent.

Navigator accepted: yes

Expected observation: The sidebar has a compact Recent/A–Z/Tree selector. The visible Journey list changes predictably, scrolls when long, and Tree mode has readable depth context while selection only changes active Journey.

Pass condition: All three modes work over the imported real Journey registry, search honors ordering where sensible, clicking Journeys does not update recents, sending messages remains the only recent-update path, ordering is not persisted, and no Pi/Mirror/workspace side effects occur.

Fail condition: Ordering controls are missing, A–Z or Tree omit registry Journeys, sidebar cannot scroll, Tree hierarchy is unreadable, selection reorders Recent, search stops working, or ordering triggers Pi/Mirror/workspace side effects.

## Missing Evidence

- none
