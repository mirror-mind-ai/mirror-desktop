[< Refinement Workbench](../index.md)

# RS012 — Post-release conversation action corrections

## Framing

Refine semantic Agent Action ownership when real post-release turns expose reasoning-summary boundaries that are valid runtime evidence but do not map one-to-one onto visible action titles.

## Problem Space

The `v0.2.0-alpha.4` action projection correctly groups ordinary summary-led operations, but live evidence revealed two boundary shapes not represented by the initial fixtures: one reasoning record may contain multiple independently emphasized action summaries, and an empty reasoning record may sit between operations. Treating the first as one label concatenates actions; ignoring the second leaks later tools into an earlier action.

## Desired Outcome

Visible Agent Actions preserve every exposed independent title without concatenation. Tool ownership resets at empty summary boundaries and follows the nearest valid visible action title, falling back honestly when no title owns the operation. Source evidence and terminal persistence remain unchanged.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement authority is the file-first Workbench; legacy SQLite state is not consulted or written.
- The Story corrects presentation projection only. It does not rewrite Pi events, persisted evidence, private reasoning, existing conversations, Mirror data, updater state, or published release artifacts.
- `v0.2.0-alpha.4` remains immutable; any later release decision is separate.

## Change Requests

- [CR025 — Separate compound and empty action boundaries](cr025-separate-compound-and-empty-action-boundaries.md)

CR025 is `done`. Navigator validation confirmed the correction in the isolated `Mirror Desktop Dev` application, so RS012 is closed.
