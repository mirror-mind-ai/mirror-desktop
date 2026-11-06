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
  /** The native sentence, shown only when the turn is not working where it should. */
  detail: string | undefined;
  kind: "registered" | "fallback";
};

export function describeWorkingFolder(
  preview: JourneyWorkspacePreview | undefined,
  homeDirectory: string | undefined,
): WorkingFolderDescription | undefined {
  // Nothing is said until the folder is known. A guessed path would be worse than silence: CR197
  // exists because the Navigator trusted a folder nobody had shown them.
  if (!preview?.path) return undefined;
  const detail = preview.note?.trim() ? preview.note.trim() : undefined;
  return {
    label: `Working in ${abbreviateHomePath(preview.path, homeDirectory)}`,
    detail,
    kind: detail ? "fallback" : "registered",
  };
}
