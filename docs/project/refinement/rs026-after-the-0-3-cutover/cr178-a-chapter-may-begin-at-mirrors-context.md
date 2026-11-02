[< RS026](index.md)

# CR178: A Chapter May Begin at Mirror's Context

**Status:** in_progress
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02, after updating production to v0.3.0-alpha.5: a manual
compaction of the `mirror-desktop` conversation, run with Claude, ended with "Pi compaction
checkpoint is structurally invalid."

The compaction itself is sound. Pi wrote it (`043f983d`, 18:02Z), and the conversation goes on with
it. What fails is the Desktop's chapter projection (`project_conversation_segment_manifest`). It
checks every compaction on the branch again, and an earlier one fails the check:

| Compaction | Time (UTC) | `firstKeptEntryId` is | Desktop check |
|---|---|---|---|
| `4c6a4446` | 10:12 | an assistant `message` | passes |
| `517e25d3` | 10:43 | a `custom_message` (`mirror-context`) | **fails** |
| `5a514717` | 11:41 | an assistant `message` | passes, never reached |
| `043f983d` | 18:02 | an assistant `message` | passes, never reached |

The check requires that the first entry a compaction keeps is a `message`. Pi 1.4 does not.
`findValidCutPoints` accepts any entry whose context messages include a cut point, and since the
0.3 line, Mirror's context reaches the turn as a `custom_message`. So Pi can start what it keeps at
Mirror's context. The model is not the cause: the cut is Pi's, made the same way for any provider.

The chapter manifest for this conversation stopped at segment 80 (`4c6a4446`). Every compaction
from 10:43 onward fails the same way, so none of them became a chapter.

## Not lost

The Pi session holds all four compactions, and the agent's context is right. The manifest is
projected from the Pi session, so the chapters return once the check accepts what Pi accepts.

## Direction (proposed)

- One rule for "where a chapter begins": Pi's `firstKeptEntryId` is accepted when it resolves on the
  branch, before the compaction, at an entry Pi can cut at (`message`, but never a `toolResult`;
  `custom_message`; `branch_summary`).
- The places that draw from it (the manifest, the chapter closures, the TypeScript segment check)
  use the first visible message at or after that entry. Today the transcript drops entries without a
  role, so a divider keyed to Mirror's context would never be drawn.
- Spec from the real shape: the `517e25d3` neighbourhood, reduced to ids and types.

## Delivered on `main` (`b1f7e7d`)

- One rule, `is_pi_cut_point` in Rust and `isPiCutPoint` in TypeScript: a `message` other than a
  `toolResult`, a `custom_message` or a `branch_summary`. A `custom` entry (an extension's own state)
  is still refused, and so is a tool result, which the old check let through.
- Before tightening, every compaction in the 0.2 and 0.3 app data was read: 1014 kept tails start
  at an assistant message, 15 at a user message, 1 at Mirror's context, none at a tool result.
- The chapter closure the transcript reads names the first visible entry from Pi's kept tail; the
  manifest keeps Pi's own id, because it counts turns by position.
- On an APFS copy of the real `mirror-desktop` session, the manifest now closes segments 81–83
  (`517e25d3`, `5a514717`, `043f983d`), and all 83 closures land on a drawn entry.
- Spec first; 6 mutation controls, each applied and caught. Full suites: 2487 TypeScript, 451 Rust.

### Navigator check (owed)

In the release that carries it: open the `mirror-desktop` conversation. The chapters after 10:12 on
2026-11-02 appear, and the next compaction ends without the error.

**Shipped in [v0.3.0-alpha.6](../../../releases/v0.3.0-alpha.6.md)** (2026-11-02).

## Acceptance

- The `mirror-desktop` conversation's chapters include the three compactions after 10:12.
- A compaction whose kept tail starts at a `custom_message` closes a chapter, and its divider is
  drawn at the next visible message.
- A kept tail that does not resolve, sits after the compaction, or is a `toolResult` is still
  refused.
