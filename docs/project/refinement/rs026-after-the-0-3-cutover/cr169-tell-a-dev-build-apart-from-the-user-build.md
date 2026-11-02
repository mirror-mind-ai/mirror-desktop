[< RS026](index.md)

# CR169: Tell a Dev Build Apart From the User Build

**Status:** done
**Line:** 0.3 · Desktop

## Friction

Phase 4c (2026-10-31): the first update attempt failed with "plugin updater not found" because it
ran in the Dev build left in the repository (`Mirror Desktop TS Dev.app`), which registers no updater
by design. The error named a plugin, not the situation, and the two apps look alike.

## Proposed Direction

1. A Dev build answers Check for updates with "this build does not update itself" instead of the
   plugin's error.
2. The Dev and User builds are told apart at a glance (title, icon or a visible badge).

## Delivered on `main` (`27c9e13`)

- Already true before this CR: the window title ("Mirror Desktop TS Dev") and a "DEV" badge on the
  sidebar's icon.
- Settings › Updates in a build without an updater (development, evaluation; the same rule as
  `supports_updater`) says "This build, Mirror Desktop TS Dev, does not update itself; updates reach
  Mirror Desktop TS." and offers no check, so "plugin updater not found" is no longer reachable there.
- The sidebar's name is the build's own ("Mirror Desktop TS Dev"), visibly; it was "Mirror Desktop
  TS" in every build, with the channel only for screen readers.
- Not done: a separate icon for the development build. The badge and the name were judged enough;
  reopen if the Dock still confuses.
- Spec first; 3 mutation controls applied and caught. Full suite: 2498 TypeScript.
- Checked with group B's script ([RS026](index.md#group-b-check)).

Then (2026-11-02): the Navigator confirmed steps 1 and 2 in development: the sidebar reads
"Mirror Desktop TS Dev", and Updates says the build does not update itself, with no check. Closed.
