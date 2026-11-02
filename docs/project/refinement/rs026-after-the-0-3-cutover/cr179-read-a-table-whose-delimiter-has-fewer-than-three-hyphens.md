[< RS026](index.md)

# CR179: Read a Table Whose Delimiter Has Fewer Than Three Hyphens

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02 (screenshot of the RS026 queue), and noticed before: an
answer's table is drawn as one long paragraph of pipes. The answer's delimiter row was
`|--:|----|--------|---------|`.

`parseTableAlignments` in `src/app/MessageContent.tsx` accepts a delimiter cell only as
`^(:)?-{3,}(:)?$`. GitHub-flavoured Markdown asks for at least one hyphen, so `--:`, `:-:` and `-`
are valid delimiters, and models write them. Measured on `main`:

| Delimiter | Read as |
|---|---|
| `\|---:\|---\|` | table |
| `\|--:\|---\|` | paragraph |
| `\|:-:\|-\|` | paragraph |

When the delimiter fails, the canonical and the compact readers both give up, and every row joins
the paragraph, together with the text after the table.

## Direction (proposed)

- A delimiter cell is one or more hyphens with an optional colon on either side (GFM).
- Spec first, with the three delimiters above, and a control that a row of plain text between pipes
  is still not a delimiter.
- Check the compact reader (`parseCompactTable`) against the same rule, so the two cannot disagree.

## Acceptance

- The RS026 queue answer of 2026-11-02 renders as a table.
- `|-|`, `|:-|`, `|-:|`, `|:-:|` are delimiters; `|:|`, `|a|`, `|- -|` are not.
