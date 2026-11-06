[< RS028](index.md)

# CR202: Say Which Folder the Agent Is Working In

**Status:** captured
**Driver:** —
**Delivery:** —
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
