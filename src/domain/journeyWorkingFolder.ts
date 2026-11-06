import { abbreviateHomePath } from "./journeyRegistry";

/**
 * RS028 group B: what the native side says about the folder the next turn in a Journey would run
 * in. Resolved by the same function the turn uses (`resolved_journey_workspace`), so the line on
 * the surface cannot disagree with the folder Pi receives.
 */
export type JourneyWorkspacePreview = {
  path: string;
  /** CR176's sentence, present only when the Journey's registered folder could not be used. */
  note?: string;
};

export type WorkingFolderDescription = {
  label: string;
  /** The words before the path, which are not part of the clickable target. */
  prefix: string;
  /** The native sentence, shown only when the turn is not working where it should. */
  detail: string | undefined;
  kind: "registered" | "fallback";
  /** CR202, after the Navigator: the path as a target that opens the folder in Finder. */
  action: { label: string; title: string };
};

export function describeWorkingFolder(
  preview: JourneyWorkspacePreview | undefined,
  homeDirectory: string | undefined,
): WorkingFolderDescription | undefined {
  // Nothing is said until the folder is known. A guessed path would be worse than silence: CR197
  // exists because the Navigator trusted a folder nobody had shown them.
  if (!preview?.path) return undefined;
  const detail = preview.note?.trim() ? preview.note.trim() : undefined;
  const shown = abbreviateHomePath(preview.path, homeDirectory);
  const prefix = "Working in";
  return {
    label: `${prefix} ${shown}`,
    prefix,
    detail,
    kind: detail ? "fallback" : "registered",
    // Offered even on a fallback: that folder is the one the turn is using, so it is the one the
    // Navigator needs to look at.
    action: { label: shown, title: `Open ${shown} in Finder` },
  };
}
