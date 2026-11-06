[< RS028](index.md)

# CR202: Say Which Folder the Agent Is Working In

**Status:** done
**Driver:** @alissonvale
**Delivery:** `main` (`5b9151ec`, `7f2fbefe`), RS028 group B
**Group:** B, where the agent works

## Friction

Nothing on screen says which folder a turn runs in. On 2026-11-05 a turn ran in the neutral folder
`~/Mirror Journeys/mirror-desktop` because the registry cache still held a moved path, and nobody
could see it until the agent's own output showed the wrong files (CR197).

## Outcome

The conversation surface shows a quiet line such as "Working in ~/…/nautilus-app" for the selected
Journey. When the turn would fall back to the neutral folder, the line says so and why.

## First Investigation

The folder is chosen natively by `turn_workspace` and `resolve_journey_workspace`
(`main.rs`, `journey_workspace.rs`), with the fallback `~/Mirror Journeys/<id>`. Expose that
resolution to the renderer as one read, so the line shows what the turn will use and not a second
derivation that could disagree. Place the line with the Navigator (conversation header or near the
composer).

## Acceptance

- The line shows the same folder the next turn's Pi process receives as its cwd, proved by a test
  against the native resolver.
- A missing stored folder shows the fallback with a reason, never the stale path.
- The line updates after a Journey edit or a tree reload without restarting the app.

## Boundaries

No change to how the folder is chosen. Making a stale cache refuse or warn before a turn is CR197,
delivered in the same group.

## Delivered (2026-11-06)

On `main` in `5b9151ec` and `7f2fbefe`; the Group B Check passed on 2026-11-06.

- `plan_journey_workspace` (`src-tauri/src/journey_workspace.rs`) decides the folder without
  creating anything, and `resolve_journey_workspace` is now that plan plus the one folder a turn is
  allowed to make. A test asserts the plan and the turn agree on the path and on the sentence, which
  is the acceptance line about a second derivation that could disagree.
- `resolved_journey_workspace` (`main.rs`) serves the turn (`ensure = true`), the compaction and the
  new read-only command `preview_journey_workspace`. A source guard holds the preview to calling it
  rather than planning on its own, and holds both Pi-spawning callers to `ensure = true`.
- The line sits under the Journey's name in the chat header: "Working in ~/…". When the Journey's own
  folder could not be used it turns amber, adds "this Journey's folder is unavailable", and carries
  CR176's exact sentence as its tooltip.
- It is read when the Journey changes, when the registry changes (a Journey edit or Reload Journey
  tree) and when a turn ends, never while a turn streams.
- **Decision:** the line says nothing at all until the folder is known, rather than showing a guess.
  CR197 exists because a folder nobody had shown the Navigator was trusted.

## Widened by the Navigator (2026-11-06): the folder opens in Finder

The path in the line is a button that opens the folder in the system file manager.

- Only the path is the target; "Working in" is not clickable.
- The click sends the Journey id, never a path, so `open_journey_workspace` resolves the folder
  through `resolved_journey_workspace` exactly as the turn and the line do. A renderer cannot ask it
  to open any other folder.
- The folder is **opened**, not revealed in its parent: the Navigator asked for the folder.
- `~/Mirror Journeys/<id>` is created by the turn that uses it, and a preview creates nothing, so the
  line can name a folder that does not exist. A click there answers "… does not exist yet. It is
  made when a turn runs there." rather than spawning Finder at nothing.
- It is offered on a fallback too, because that folder is the one the turn is using.
- Four mutations caught: opening a file as a folder, spawning at a missing folder, creating the
  folder on a click, and revealing instead of opening.
