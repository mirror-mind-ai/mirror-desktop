# Nautilus for Mirror Icon

**Status:** approved for Nautilus for Mirror (CV-013.DS-002, 2026-11-04)

## Design intent

A luminous violet nautilus spiral on a dark plum rounded square. It is the last icon the app carried
as Nautilus Harness (`0c4684cb`, 2026-09-02). When the app became Mirror Desktop it took an oval
mirror instead (`da611ab8`, 2026-09-04); when the app took the Nautilus name back, the Navigator
chose to bring the spiral back with it.

The stable source is `src-tauri/icons/icon.svg`. The development variant, `src-tauri/icons/dev/icon.svg`,
adds a violet `DEV` badge in the lower-right corner. The evaluation variant, `src-tauri/icons/eval/icon.svg`,
puts a green `EVAL` badge in the same place, so that a build running on production data cannot be
mistaken for Stable or Dev.

The stable and development PNGs are the files of `0c4684cb`, restored byte for byte. The evaluation
PNG is rendered from its SVG at 512 by 512 pixels with `resvg -w 512 -h 512`.

## Review criteria

The spiral reads at Dock size, the violet family matches the interface, and the badge is the only
difference between the channels' icons.

## History

The mirror artwork's brief and image-generation prompt are in Git, in this file's previous name,
`docs/product/mirror-desktop-icon.md`.
