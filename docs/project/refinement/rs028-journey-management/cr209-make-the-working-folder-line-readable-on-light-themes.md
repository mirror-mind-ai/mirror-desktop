[< RS028](index.md)

# CR209: Make the Working Folder Line Readable on Light Themes

**Status:** done
**Driver:** assistant
**Delivery:** `main` (`75382d16`)
**Group:** follow-up to CR202, found 2026-11-06

## Friction

On a light theme the header's "Working in ~/…" path was nearly invisible: white on white (Navigator,
2026-11-06, screenshot on v0.4.0-alpha.4).

## Cause

The path is a `<button>`, and the light families paint every button not on their exclusion list
white (the rule CR105 and CR151 already met). The prefix kept a fixed dark-theme grey (`#7f9095`),
the underline a white tint, the hover a pale grey and the unavailable-folder state a pale amber.

## Change

`.active-journey-folder-path` joins the exclusion list. The line uses `--text-muted`, the hover
`--text`, the underline a tint of the current colour, and on light themes the unavailable state is
`#9a5b13` (4.8 to 5.4:1 on the three light canvases), its hover `#6f3f0b`.

## Check

On Daylight, Mist and Parchment, and on a dark theme: the "Working in" line and its path are
readable; hovering the path darkens it on light themes; a Journey whose folder is missing shows a
readable amber line.

## Validation

Validated by the Navigator on 2026-11-06 in the development app. Ships in v0.4.0-alpha.5.
