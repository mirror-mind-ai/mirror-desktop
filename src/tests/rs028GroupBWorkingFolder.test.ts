import { describe, expect, it } from "vitest";
import { describeWorkingFolder, type JourneyWorkspacePreview } from "../domain/journeyWorkingFolder";

// RS028 group B: CR202 says which folder the agent is working in, and CR197 makes the fallback
// visible there. The same native resolution feeds both, so this is only about what it reads like.
const home = "/Users/nav";
const preview = (overrides: Partial<JourneyWorkspacePreview>): JourneyWorkspacePreview => ({
  path: "/Users/nav/code/app",
  ...overrides,
});

describe("CR202: the folder the agent works in", () => {
  it("names the folder, abbreviated to the home", () => {
    expect(describeWorkingFolder(preview({}), home)).toEqual({
      label: "Working in ~/code/app",
      prefix: "Working in",
      detail: undefined,
      kind: "registered",
      action: { label: "~/code/app", title: "Open ~/code/app in Finder" },
    });
  });

  it("shows the full path while the home is not known yet", () => {
    expect(describeWorkingFolder(preview({}), undefined)?.label).toBe("Working in /Users/nav/code/app");
  });

  it("says nothing at all when the folder is not known yet, rather than guessing one", () => {
    expect(describeWorkingFolder(undefined, home)).toBeUndefined();
  });
});

describe("CR197: a fallback the person can see", () => {
  const note = "This Journey's folder /Users/nav/old/app does not exist, so the agent works in /Users/nav/Mirror Journeys/app for this turn.";

  it("marks the line as a fallback and keeps the native sentence as its detail", () => {
    expect(describeWorkingFolder(preview({ path: "/Users/nav/Mirror Journeys/app", note }), home)).toEqual({
      label: "Working in ~/Mirror Journeys/app",
      prefix: "Working in",
      detail: note,
      kind: "fallback",
      action: { label: "~/Mirror Journeys/app", title: "Open ~/Mirror Journeys/app in Finder" },
    });
  });

  it("reads as a fallback whatever the reason is, because the reason is the native sentence's", () => {
    for (const reason of ["is not a folder", "is inside your Mirror home", "is not an absolute path"]) {
      const sentence = `This Journey's folder /x ${reason}, so the agent works in /y for this turn.`;
      expect(describeWorkingFolder(preview({ note: sentence }), home)?.kind).toBe("fallback");
    }
  });

  it("treats a Journey that simply has no folder as ordinary, not as a failure", () => {
    // The native plan has no note for that case: working in the neutral folder is correct there.
    expect(describeWorkingFolder(preview({ path: "/Users/nav/Mirror Journeys/vida", note: undefined }), home)).toEqual({
      label: "Working in ~/Mirror Journeys/vida",
      prefix: "Working in",
      detail: undefined,
      kind: "registered",
      action: { label: "~/Mirror Journeys/vida", title: "Open ~/Mirror Journeys/vida in Finder" },
    });
  });

  it("ignores an empty note rather than showing an empty detail", () => {
    expect(describeWorkingFolder(preview({ note: "   " }), home)).toEqual({
      label: "Working in ~/code/app",
      prefix: "Working in",
      detail: undefined,
      kind: "registered",
      action: { label: "~/code/app", title: "Open ~/code/app in Finder" },
    });
  });
});

describe("CR202, after the Navigator: the folder opens in Finder", () => {
  it("offers the folder as an action with its own words, so the line reads as clickable", () => {
    expect(describeWorkingFolder(preview({}), home)?.action).toEqual({
      label: "~/code/app",
      title: "Open ~/code/app in Finder",
    });
  });

  it("still offers it when the turn fell back, because that folder is the one in use", () => {
    const note = "This Journey's folder /Users/nav/old/app does not exist, so the agent works in /Users/nav/Mirror Journeys/app for this turn.";
    const described = describeWorkingFolder(preview({ path: "/Users/nav/Mirror Journeys/app", note }), home);
    expect(described?.action?.label).toBe("~/Mirror Journeys/app");
    expect(described?.kind).toBe("fallback");
  });

  it("keeps the prefix out of the clickable part, so only the path is a target", () => {
    const described = describeWorkingFolder(preview({}), home);
    expect(described?.prefix).toBe("Working in");
    expect(described?.label).toBe("Working in ~/code/app");
  });
});
