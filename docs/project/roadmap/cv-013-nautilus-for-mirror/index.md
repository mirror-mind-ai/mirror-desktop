[< Roadmap](../index.md)

# CV-013 - Nautilus for Mirror

**Status:** ✅ Done. Closed again on 2026-11-05 with DS-007 (the repository, the Journey and the folders), reopened for it the same day; earlier: ✅ Done — started by the Navigator on 2026-11-04 ("comece a CV-013") and closed the same day ("feche a CV-013 e leve a Veronica para o pós-lançamento")

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
- The site keeps "Mirror Desktop" until DS-005 changes it, with the first Nautilus release.

## Closed (2026-11-04)

The Navigator works in Nautilus for Mirror v0.4.0-alpha.1 on the carried state; the Mirror site
names it and links `nautilus.mirrormind.sh`, its own site. The second installation (Veronica's)
moves after the launch, with the same DMG and `scripts/carry_03_state.mjs`, when the Navigator
gives it a date; it is not a Delivery Story of this CV.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-013.DS-001](ds-001-inventory-the-name-and-decide-what-moves/index.md) | Inventory the Name and Decide What Moves | Every place carrying the name is classified as visible (renamed) or a machine coordinate (kept or migrated) | ✅ Done; name and coordinates decided 2026-11-04 |
| [CV-013.DS-002](ds-002-the-nautilus-line/index.md) | The Nautilus Line | Name, identifier `ai.mirrormind.nautilus`, channel, release gate and CR171 move together as line 0.4 | ✅ Done |
| [CV-013.DS-003](ds-003-carry-the-state/index.md) | Carry the State | A dry-run-first, all-or-nothing script copies the 0.3 app's data into Nautilus's folder | ✅ Done |
| [CV-013.DS-004](ds-004-the-navigators-cutover/index.md) | The Navigator's Cutover | Nautilus installed from the DMG, state carried and checked, Mirror Desktop TS kept as the way back | ✅ Done |
| [CV-013.DS-005](ds-005-the-mirror-site-points-to-nautilus/index.md) | The Mirror Site Points to Nautilus | The Mirror site names Nautilus as its desktop front end and links its download | ✅ Done |
| [CV-013.DS-006](ds-006-nautilus-gets-its-own-site/index.md) | Nautilus Gets Its Own Site | Nautilus gets a site of its own at `nautilus.mirrormind.sh` | ✅ Done |
| [CV-013.DS-007](ds-007-the-nautilus-family-in-place/index.md) | The Nautilus Family in Place | Folders, Journeys and GitHub say Nautilus is a family of a framework, an app and a protocol | ✅ Done |
