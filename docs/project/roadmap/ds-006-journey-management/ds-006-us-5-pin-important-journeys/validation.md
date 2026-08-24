# Validation — DS-006.US-5

## Status

Passed

## Automated Checks

- npm test passed: 11 test files, 44 tests
- npm run build passed
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated visually: pin/unpin works in Recent, A–Z, Tree and search; pinning does not select the Journey, clear search, invoke Pi, or reorder A–Z/Tree; pinned Journeys remain visually marked and appear first in Recent.

## Navigator Validation

Route: Run npm run tauri -- dev. In the Journey sidebar, click the pin control on several Journeys in Recent, A–Z, Tree, and search. Confirm pin/unpin does not select the Journey, does not clear search, does not invoke Pi, and pinned Journeys move to the top only in Recent mode while remaining visually marked in A–Z/Tree/search.

Navigator accepted: yes

Expected observation: Each Journey row has a small pin control. Pinned Journeys are visually marked, appear first in Recent mode, and active Journey remains visible even when unpinned.

Pass condition: Pin/unpin works at runtime, does not change active Journey unless the row itself is clicked, search stays active when pinning from search results, A–Z/Tree ordering is not overridden by pins, and no persistence/Mirror/workspace/Pi side effects occur.

Fail condition: Pinning selects a Journey, clears search, invokes Pi, persists to disk, reorders A–Z/Tree unexpectedly, or hides the active unpinned Journey in Recent.

## Missing Evidence

- none
