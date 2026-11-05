[< RS026](index.md)

# CR197: A Moved Journey Folder Sends the Turn to the Neutral Folder Without a Word

**Status:** captured
**Line:** 0.4 · Desktop

## Friction

Found on 2026-11-05 during CV-013.DS-007 step 8. The Navigator moved this checkout from
`mirror-mind-ai/mirror-desktop` to `mirror-mind-ai/nautilus/nautilus-app` with the app closed and
set the new project path in the Mirror through the Core. The first turn after reopening ran in
`~/Mirror Journeys/mirror-desktop`, an empty folder, and nothing on the screen said so. The agent's
tools would have read and written there.

## Cause

- `turn_workspace` (`src-tauri/src/main.rs`) reads the Journey's project path from the app's cached
  `journey-registry.json`, not from the Mirror.
- That cache is refreshed only by "Reload Journey tree" and by the Journey editor. Launching the app
  does not refresh it; it was from 12:17, before the move, and still held the old folder.
- The old folder no longer existed, so `resolve_journey_workspace` fell back to the neutral folder
  (CR176), and `anchor_session_cwd` moved the Pi session's header there.
- Repaired by hand: "Reload Journey tree", then the next turn re-anchored to `nautilus-app`.

## Expected Behavior

- When the registered folder is missing, the app refreshes the registry from the Mirror before it
  falls back, and uses the refreshed path when that folder exists.
- When it still falls back, the turn says so where the person sees it, naming the missing folder
  and the folder used.
- A turn whose registered folder exists is unchanged and costs no refresh.

## Plan Or Decision

Captured by the Navigator's word, 2026-11-05 ("registre a CR"). Not planned. Spec first: a registry
naming a missing folder while the Mirror names an existing one.

## Outcome

Pending: captured, not planned.
