[< RS028](index.md)

# CR205: Make the Deletion List Legible and Name the Journey in the Title

**Status:** captured
**Driver:** @alissonvale
**Delivery:** —
**Group:** D, follow-up to CR204

## Friction

In v0.4.0-alpha.4, on a light theme, the Delete Journey dialog's list is almost unreadable: "Will be
deleted from Mirror:", its items, the paragraph about Nautilus's files and the project-folder line
are pale grey on white (Navigator, 2026-11-06, screenshot of deleting the Journey `nova`). The
Journey being deleted appears only inside the sentence "Permanently delete Journey nova and
everything that belongs to it", with the same weight as the rest, so the one thing the person must
check before an irreversible act is the easiest to miss.

## First Investigation

`.journey-deletion-list` in `src/styles/app.css` sets `color: #b9cbd0`, a fixed colour chosen
against the dark theme, instead of a theme variable; the light themes inherit it unchanged. The
dialog's `<h2>` in `App.tsx` reads only "Delete Journey" for the delete mode.

## Outcome

- The list uses the theme's text colours (`--text` for what will go, `--text-muted` for secondary
  lines), legible on every light and dark theme.
- The Journey's name is the dialog's emphasis, likely in the title: "Delete Journey *nova*" or the
  name as the heading with "Delete Journey" above it. The exact form is decided at build.

## Acceptance

- On each light theme and each dark theme, every line of the deletion list is readable (contrast
  checked, not only by eye).
- The title names the Journey that will be deleted; a long name wraps instead of being cut.
- No other Journey dialog changes its title.
- A test fails if `.journey-deletion-list` goes back to a fixed colour.
