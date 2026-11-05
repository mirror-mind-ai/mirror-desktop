[< RS026](index.md)

# CR196: Render a Table Whose First Header Cell Is Empty

**Status:** captured
**Line:** 0.4 · Desktop

## Friction

Reported by the Navigator on 2026-11-05 ("sua tabela nao foi renderizada e nao consegui ler
direito (vale CR nova pra corrigir na surface do nautilus)"). An answer compared two options in a
table whose header began with an empty cell, the usual shape of a comparison:

```markdown
| | A: the umbrella is the framework | B: the method becomes the framework |
|---|---|---|
| Umbrella repository | `nautilus-framework` (new) | `nautilus` (new) |
```

The conversation showed it as one paragraph of pipes and dashes.

## Cause

`src/app/MessageContent.tsx`, `createTableBlock`: `headers.some((header) => !header)` refuses a
table with any empty header cell, so the lines fall back to a paragraph. GFM accepts an empty header
cell; the rule has no recorded reason.

Probed on `main` (2026-11-05) through `parseMessageBlocks`: `| | A | B |` with its delimiter and one
row gives `paragraph`; the same table with `Item` in the first cell gives `table`.

## Expected Behavior

- A table whose header has empty cells renders as a table, the empty cells empty.
- A header with no named cell at all still renders, or the reason it should not is written down.
- The other refusals (column count, cell length, row count) are unchanged.

## Plan Or Decision

Captured by the Navigator's word, 2026-11-05. Not planned. Spec first: the comparison above as the
failing case.

## Outcome

Pending: captured, not planned.
