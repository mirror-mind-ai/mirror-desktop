[< RS026](index.md)

# CR178: A Chapter May Begin at Mirror's Context

**Status:** captured
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

## Acceptance

- The `mirror-desktop` conversation's chapters include the three compactions after 10:12.
- A compaction whose kept tail starts at a `custom_message` closes a chapter, and its divider is
  drawn at the next visible message.
- A kept tail that does not resolve, sits after the compaction, or is a `toolResult` is still
  refused.
