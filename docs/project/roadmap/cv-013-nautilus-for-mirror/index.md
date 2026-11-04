[< Roadmap](../index.md)

# CV-013 - Nautilus for Mirror

**Status:** 🔵 In progress — started by the Navigator on 2026-11-04 ("comece a CV-013")

## Outcome

The app is renamed from Mirror Desktop to **Nautilus for Mirror**: one front end among others for
the Mirror Core, not the canonical Mirror desktop experience.

## Why (Navigator, 2026-11-03)

A strategic choice already discussed in earlier conversations: Mirror is better as an ecosystem in
which different apps are front ends to the Core than as one canonical desktop experience. The app
returns to the Nautilus name it was incubated under (Nautilus Harness, see the
[transfer record](../../history/nautilus-harness-transfer.md)).

## Affects

- [CR171 Retire the nautilus_harness Interface Label](../../refinement/rs026-after-the-0-3-cutover/cr171-retire-the-nautilus-harness-interface-label.md):
  the label it would have renamed is decided by the new name.
- Every coordinate that carries the name: the bundle name and identifier
  (`ai.mirrormind.desktop.ts`), the app-data folder, the update channel
  (`updates.mirrormind.sh/mirror-desktop/ts`), the GitHub repository, release notes, the site's
  install guides (another Journey's repository), and this Journey's own name.
- CV-005.DS-001 drew the line between product identity and Nautilus method semantics; the inventory
  it asked for is where this CV starts.

## Open Before Planning

- Which coordinates change and which stay as compatibility, so that an installed app keeps updating
  and keeps its data.
- Whether the bundle identifier changes at all; changing it makes macOS treat it as a new app.
- Order against CV-009 (signing): signing under the final name avoids doing it twice.
- The site keeps "Mirror Desktop" until the Navigator says otherwise.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-013.DS-001](ds-001-inventory-the-name-and-decide-what-moves/index.md) | Inventory the Name and Decide What Moves | Every place carrying the name is classified as visible (renamed) or a machine coordinate (kept or migrated) | 🔵 In progress, awaiting decisions |
