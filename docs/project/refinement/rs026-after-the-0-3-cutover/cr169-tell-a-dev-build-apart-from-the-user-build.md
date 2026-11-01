[< RS026](index.md)

# CR169: Tell a Dev Build Apart From the User Build

**Status:** captured
**Line:** 0.3 · Desktop

## Friction

Phase 4c (2026-10-31): the first update attempt failed with "plugin updater not found" because it
ran in the Dev build left in the repository (`Mirror Desktop TS Dev.app`), which registers no updater
by design. The error named a plugin, not the situation, and the two apps look alike.

## Proposed Direction

1. A Dev build answers Check for updates with "this build does not update itself" instead of the
   plugin's error.
2. The Dev and User builds are told apart at a glance (title, icon or a visible badge).
