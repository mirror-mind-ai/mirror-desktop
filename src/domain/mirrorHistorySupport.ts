/**
 * CR206: Nautilus works only with the conversations it created (Navigator, 2026-11-06).
 *
 * A Journey's Mirror history, the conversations the Mirror Core created elsewhere (the terminal,
 * Pi, Claude Code), used to sit beside its Desktop conversations: listed, opened, continued in a
 * new Desktop conversation or in Terminal, and renamed in Mirror. The code for all of that stays;
 * this switch keeps every route into it closed. Turning it back on is a product decision.
 *
 * Typed as `boolean`, not as the literal, so the guarded code keeps compiling as reachable.
 */
export const MIRROR_HISTORY_SUPPORTED: boolean = false;

export const MIRROR_HISTORY_UNSUPPORTED_MESSAGE =
  "Nautilus works only with the conversations it created.";
