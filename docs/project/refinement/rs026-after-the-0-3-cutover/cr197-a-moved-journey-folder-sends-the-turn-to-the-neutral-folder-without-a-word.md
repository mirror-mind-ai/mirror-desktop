[< RS026](index.md)

# CR197: A Moved Journey Folder Sends the Turn to the Neutral Folder Without a Word

**Status:** done
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

Captured by the Navigator's word, 2026-11-05 ("registre a CR"). Delivered with
[CR202](../rs028-journey-management/cr202-say-which-folder-the-agent-is-working-in.md) as RS028's
group B, because the line CR202 adds is where this fallback becomes visible.

## A Second Cause, Measured (2026-11-06)

The fallback **was** announced: `resolve_journey_workspace` returned CR176's sentence and the turn
emitted it as a `Stderr` event. The renderer maps that to a `warning` and a `diagnostic`
(`src/agent/piProcessStream.ts`). The `warning` is read only by `preAgentProviderWarnings`, which
explains a message returned to the composer, and the `diagnostic` is collected without being
surfaced. So on a turn that otherwise succeeded, the sentence had no reader. That is why nothing was
on the screen, and it is a second defect this CR had recorded as absence of a note.

## Outcome

On `main` in `5b9151ec`, Group B Check passed on 2026-11-06.

- The refresh: `plan_after_refresh` adopts a plan taken from a freshly read Mirror tree only when
  the cached plan falls back and the refreshed one does not, asking at most once. A turn whose
  folder exists never pays for it. Measured at about 11 ms (median of 12 reads of the production
  tree, 13 roots, over the already running host), so no memo is needed and none is kept: a memo
  would have re-created this very defect after a repair made outside the app.
- A folder gone in Mirror too keeps the cached plan's own sentence, so the person reads about the
  folder they registered rather than about the refresh.
- The visibility: CR202's line names the folder in use and marks a fallback, with CR176's sentence
  as its tooltip. The stderr emit is kept as the transcript's record.
