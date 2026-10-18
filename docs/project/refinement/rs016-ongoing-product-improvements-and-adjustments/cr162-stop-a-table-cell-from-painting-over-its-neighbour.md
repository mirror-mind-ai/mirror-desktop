[< RS016](index.md)

# CR162: Stop a Table Cell From Painting Over Its Neighbour

**Status:** done
**Driver:** @alissonvale
**Delivery:** `main` — direct request, no refinement branch

## Friction

Field, 2026-10-18, production `v0.2.0-alpha.53`. The Navigator sent a screenshot of the Canvas:

> *"Arrume o layout dessa coluna da tabela que está truncando o seu conteúdo (Estado)."*

The screenshot shows worse than truncation. The `Estado` column's text **runs past its own cell and
paints over `Progresso`** — the progress bars and their counts are covered by the text of the cell to
their left. On the RS016 row the bar is unreadable; on CR157's row the words *nasce da CR149* sit on
top of a bar. Nothing is cut off with an ellipsis; two columns are drawn in the same place.

## The Mechanism

One pair of declarations, repeated in two rules:

```css
max-width: 32rem;
white-space: nowrap;
```

A cell that may not grow past the cap and may not wrap also cannot shrink. With no `overflow` or
`text-overflow` rule, the content simply renders outside the box, over whatever is there.

**This is a rendering defect, not a content one.** No cell length makes it correct: the collision
fires for any cell wider than the cap, in any table, in any Journey. A shorter cell postpones it.

**It was in both markdown table renderers**, with identical declarations:

| rule | serves |
|---|---|
| `.artifact-markdown-table-scroll th, td` | `ArtifactMarkdown` — the **Canvas** and the documentation browser |
| `.message-table-scroll th, td` | tables inside chat messages |

So the same collision was reachable from three surfaces, and was reported from one.

## Expected Behavior

A table cell wraps inside its own column. No cell is ever drawn over another. The column stays
capped, because an uncapped column turns the Canvas into a horizontal scroll with one row per screen.

## Implemented (2026-10-18)

Written test-first; the guard failed on `white-space: nowrap` before the stylesheet changed.

- **Both cell rules** keep `max-width: 32rem` and gain `overflow-wrap: break-word` and
  `white-space: normal`. The cap is what keeps the column readable; the wrapping is what keeps it
  honest, and `break-word` covers the case wrapping alone does not — one token longer than the cap.
- **`vertical-align: top`** on the cells, so a row whose tallest cell now wraps to three lines does
  not centre its one-word neighbours against it.
- **A new rule per renderer** keeps code spans intact: `white-space: pre-wrap` plus
  `overflow-wrap: break-word`. A progress bar broken across two lines reads as two bars, and
  `refinement/cr161-unify-finishing` broken mid-token reads as two names. They break only if a single
  token genuinely cannot fit.

### Why not the alternatives

- **`text-overflow: ellipsis`** stops the collision by *hiding* content. The Navigator's complaint
  was that content was being lost, so this would answer the symptom with the thing complained about.
- **Dropping the cap** also stops the collision, by letting the table grow without bound. A guard
  asserts the cap is still there, so this repair cannot silently become that one.

### Guards

`src/tests/markdownTableCellWrapping.test.ts`, four tests, each anchored on the exact selector text
so a sibling rule cannot answer for it:

1. Neither cell rule may declare `nowrap`; both must declare `normal` and `break-word`.
2. **Negative:** both must keep `max-width: 32rem`, so the fix stays *wrapping* and never becomes
   *unbounded growth*.
3. Code spans in both renderers wrap without being broken.
4. **Negative:** no light-theme override for either table may set `white-space` or `max-width` —
   otherwise the repair would be silently undone for three of the seven themes.

Gates: vitest **269 files / 2,222 tests** (from 268 / 2,218), `tsc --noEmit` clean, `npm run build`
clean. No TypeScript, no Rust, no behaviour outside the stylesheet.

## Slice 2 — The Canvas Uses the Whole Panel (2026-10-18)

With the collision repaired the Navigator reported the next thing: *"ficaria bem melhor se as tabelas
ocupassem 100% da largura do canvas. Há muito espaço na lateral direita sobrando."*

**The cause was one declaration, and it was never meant for this content.**
`.journey-canvas-view` carried `max-width: 54rem` — a *reading measure*, which exists so a paragraph
does not run to a two-thousand-pixel line. The Canvas has no paragraphs **by its own instructions**:

> todo conteúdo do Canvas vive dentro de tabelas. Um parágrafo no Canvas é um defeito.

So the measure constrained the one kind of content it was never meant for. The tables were already
filling 100% — of 864 pixels.

**Repair.** The measure is removed; `min-width: 0` keeps the view able to shrink inside its flex
column. Canvas tables become `width: 100%`, and the per-cell `max-width` is set to `none` inside the
Canvas so the columns can distribute across the panel.

**Why dropping the cap here does not undo slice 1.** Slice 1's cap existed to stop a table growing
without bound. `width: 100%` **cannot overflow at all**, which is a stronger form of the same bound —
the mechanism is replaced by a better one rather than removed. The collision itself is gone for a
different reason: the cells wrap.

**Scoped to the Canvas on purpose.** `ArtifactMarkdown` also draws the documentation browser, whose
container carries no reading measure and whose tables may genuinely need more room than the panel.
The shared rule keeps `max-content` and its horizontal scroll, and a guard asserts that — so this
slice cannot quietly become a change to the documentation browser.

**Three guards added**, and one existing guard repaired: `declarationsOf` matched a selector anywhere
in the file, and `.artifact-markdown-table-scroll table` is a **substring** of
`.journey-canvas-view .artifact-markdown-table-scroll table`. It passed only because the shared rule
happens to appear first. It is now anchored to a line start and asserts the rule is declared once, so
the guard answers for the rule rather than for the file's ordering.

Gates: vitest **269 files / 2,225 tests**, `tsc --noEmit` clean, `npm run build` clean.

## Shipped in v0.2.0-alpha.54 (2026-10-18)

Published and independently verified. The release carries CR162 and nothing else.

Both slices proved present in the built stylesheet, with the defective declaration sequence and the
`54rem` reading measure both reading **0** against an instrument shown able to return non-zero. The
binary inside the served tarball is byte-identical to the locally built bundle, and the CSS asset was
written 101 seconds before that binary in the same build. Full chain in
`docs/update/alpha-54-release-publication-2026-10-18.md`.

## Field Verification Owed — Resolved 2026-10-18

**Not verified visually.** The stylesheet is compiled into the bundle, and the Navigator has seen
only the defect. This stays `in_progress` until the Canvas renders with the `Estado` column wrapping
and `Progresso` legible beside it.

Dev cannot show it: `ai.mirrormind.desktop.dev` does not read the production Journeys, so it cannot
render this Canvas. The check belongs to a release.

## A Second Cause, Reported and Not Acted On

The rendering defect is the whole of what was asked and the whole of what is repaired here. But the
Canvas cells are also **too long for their own instructions**, which say:

> Cada célula é um **fato de estado curto** — status, contagem, release, o que falta. Não escreva
> evidência, justificativa, história nem frase explicativa. **Se precisar de uma oração para explicar
> uma célula, a célula está errada.**

RS025's row, CR155's, CR157's and CR158's are each a sentence or more. **I noticed this while
redrawing the Canvas on 2026-10-17 and did not report it**, which is why it arrived as a screenshot
instead of as a decision.

Shortening them is an editorial act on information the Navigator reads, so it is recorded rather than
performed. With this repair the long cells wrap and stay legible, so the two questions are now
genuinely separate: this one is fixed, and the other is a choice.

## Field Verified (2026-10-18)

The Navigator upgraded production to `v0.2.0-alpha.54` and reported: *"Atualizei e o canvas está ok
agora."*

Production confirmed by hash: binary `095f9c15e05f7f633e0c66a1a82a7b40c4920eacc5574ae1208dbef036cb0a82`,
which is **exactly** the binary hashed inside the served updater tarball — not a build that merely
reports the same version string. Running as pid 27723 since 2026-10-18 14:16:18 local.

**This closes the one claim no guard could make.** Every other claim in this change request is proved
by a stylesheet guard, and a stylesheet guard can assert what the CSS says and never what the window
draws. The surface was the only remaining instrument, and it answered.

**Stated precisely, because it matters what was and was not measured.** The report is a general pass
on the surface, not an itemisation of the three expectations recorded before the upgrade. It is
nevertheless the right instrument for all three: a column still painting over its neighbour, a split
progress bar, or a table still stopping two thirds across would each have been visible as the same
complaint that opened this work.

It also answers the one thing recorded as unestablishable — whether the resulting column proportions
are *good*. That was never a question a test could settle, and it is answered in the only way it can
be: by the person who reads the Canvas saying it reads.

## Boundaries

Does not change the Canvas's content, its instructions, or any cell text. Does not touch table
structure, column order, or the markdown parser. Does not alter colour in any theme.

## Provenance

Screenshot supplied by the Navigator, 2026-10-18, production `v0.2.0-alpha.53`. Stylesheet rules read
from `src/styles/app.css`; the renderer traced from `JourneyCanvasSurface.tsx` through
`ArtifactMarkdown.tsx` to the generated class, and the second occurrence found by searching for the
same declarations rather than assumed from the first.
