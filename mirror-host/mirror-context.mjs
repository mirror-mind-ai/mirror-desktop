// CV-010.DS-005 slice 3d: Mirror's context, handed to Pi for one turn.
//
// The app asks the Mirror host for the turn's context before it starts Pi (Core's
// `deliverMirrorContext`, the terminal's doorman as a call), writes the block to a file of its own,
// owner-only, and starts Pi with this extension and `MIRROR_DESKTOP_CONTEXT_FILE` naming that file.
// Pi's RPC has no command that adds a hidden message, and an extension's `before_agent_start` can.
//
// On the turn's first run this extension reads the file, removes it, and returns the block as the
// hidden user-role message the terminal's Mirror extension sends (`customType: "mirror-context"`,
// not displayed). Pi stores it as a `custom_message` entry, which Mirror Desktop's transcript and
// its record of the turn do not read. A run that a custom message started, a missing file and a
// file that is not a small regular file give nothing: the turn goes on without context.
//
// If Pi compacts the session during the turn, the folder leaves the transcript; the extension leaves
// `<file>.compacted` beside the file, and the app tells the host so the next turn is full again.

import { lstatSync, readFileSync, rmSync, writeFileSync } from "node:fs";

/** A block larger than this is not one the doorman rendered. */
export const MAX_CONTEXT_BYTES = 1_048_576;
export const CONTEXT_TYPE = "mirror-context";

/** The block in `file`, read once and removed; null when there is none to give. */
export function takeContext(file) {
  if (typeof file !== "string" || file.length === 0) return null;
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    return null;
  }
  try {
    if (!stat.isFile() || stat.size === 0 || stat.size > MAX_CONTEXT_BYTES) return null;
    return readFileSync(file, "utf8");
  } catch {
    return null;
  } finally {
    try {
      rmSync(file, { force: true });
    } catch {
      // Not a file this extension can remove; it was not read either.
    }
  }
}

export default function mirrorDesktopContext(pi, environment = process.env) {
  const file = environment.MIRROR_DESKTOP_CONTEXT_FILE;
  if (!file) return;

  pi.on("before_agent_start", async (event) => {
    // A run a custom message started answers no prompt of the person's. The file is removed when
    // it is read, so a later run of the same turn (a correction) finds none: one turn, one block.
    if (event?.messageType !== undefined && event.messageType !== "user") return;
    const content = takeContext(file);
    if (!content) return;
    return { message: { customType: CONTEXT_TYPE, content, display: false } };
  });

  pi.on("session_compact", async () => {
    try {
      writeFileSync(`${file}.compacted`, "", { mode: 0o600 });
    } catch {
      // The app then cannot learn of it; the next turn is a delta, as after any lost signal.
    }
  });
}
