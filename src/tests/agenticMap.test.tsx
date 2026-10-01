import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyDocumentationSurface } from "../app/JourneyDocumentationBrowser";
import type { AdmissionViewState } from "../app/AgenticMapField";
import { deriveAdmittedContext } from "../domain/admittedContext";
import type { AdmittedContextInspection } from "../domain/admittedContext";
import type { DocumentationTree } from "../domain/journeyDocumentation";
import browserSource from "../app/JourneyDocumentationBrowser.tsx?raw";
import fieldSource from "../app/AgenticMapField.tsx?raw";

const JOURNEY_ROOT = "/Users/nav/journeys/mirror-desktop";

const tree: DocumentationTree = {
  status: "ready",
  rootLabel: "mirror-desktop",
  items: [
    {
      relativePath: "docs",
      name: "docs",
      kind: "folder",
      previewKind: "unavailable",
      childrenLoaded: true,
      children: [
        { relativePath: "docs/roadmap.md", name: "roadmap.md", kind: "file", previewKind: "markdown", children: [] },
        { relativePath: "docs/old.md", name: "old.md", kind: "file", previewKind: "markdown", children: [] },
        { relativePath: "docs/untouched.md", name: "untouched.md", kind: "file", previewKind: "markdown", children: [] },
      ],
    },
  ],
};

function prompt(request: string, attachments: { absolutePath: string; displayName: string }[] = []): string {
  const head = "[Mirror Desktop Journey authority]\nThe selected Journey ID for this turn is exactly: mirror-desktop";
  const references = attachments.length
    ? `\n\nFiles explicitly selected by the user\nThe paths below are references.\n\`\`\`json\n${JSON.stringify(attachments)}\n\`\`\``
    : "";
  return `${head}\n\nUser request:\n${request}${references}`;
}

const compactedInspection: AdmittedContextInspection = {
  compactionCount: 1,
  chapterClosures: [{
    firstKeptEntryId: "u2",
    summaryHead: "## Goal\nClose the sidebar progress work",
    closedAt: "2026-10-01T08:00:00Z",
  }],
  entries: [
    {
      entryId: "u1",
      role: "user",
      visibleText: "Measure the prompt packet",
      promptEnvelope: "mirror_desktop",
      timestamp: "2026-10-01T07:00:00Z",
      nativeContent: [{ type: "text", text: prompt("Measure the prompt packet") }],
    },
    {
      entryId: "a1",
      role: "assistant",
      visibleText: "",
      timestamp: "2026-10-01T07:00:01Z",
      nativeContent: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: `${JOURNEY_ROOT}/docs/old.md` } }],
    },
    { entryId: "r1", role: "toolResult", visibleText: "", timestamp: "2026-10-01T07:00:02Z", toolCallId: "call-1", toolName: "read", isError: false },
    {
      entryId: "u2",
      role: "user",
      visibleText: "Shape the first slice",
      promptEnvelope: "mirror_desktop",
      timestamp: "2026-10-01T09:00:00Z",
      nativeContent: [{
        type: "text",
        text: prompt("Shape the first slice", [
          { absolutePath: `${JOURNEY_ROOT}/docs/roadmap.md`, displayName: "roadmap.md" },
          { absolutePath: "/Users/nav/outside/spec.pdf", displayName: "spec.pdf" },
        ]),
      }],
    },
    {
      entryId: "a2",
      role: "assistant",
      visibleText: "",
      timestamp: "2026-10-01T09:00:01Z",
      nativeContent: [{ type: "toolCall", id: "call-2", name: "read", arguments: { path: `${JOURNEY_ROOT}/docs/roadmap.md` } }],
    },
    { entryId: "r2", role: "toolResult", visibleText: "", timestamp: "2026-10-01T09:00:02Z", toolCallId: "call-2", toolName: "read", isError: false },
    {
      entryId: "u3",
      role: "user",
      visibleText: "A turn with no authority header",
      promptEnvelope: "raw",
      timestamp: "2026-10-01T09:30:00Z",
      nativeContent: [{ type: "text", text: "A turn with no authority header" }],
    },
  ],
};

const uncompactedInspection: AdmittedContextInspection = {
  compactionCount: 0,
  chapterClosures: [],
  entries: compactedInspection.entries.slice(3),
};

function admission(inspection: AdmittedContextInspection): AdmissionViewState {
  return { status: "ready", context: deriveAdmittedContext({ inspection, journeyRoot: JOURNEY_ROOT }) };
}

function render(overrides: Partial<Parameters<typeof JourneyDocumentationSurface>[0]> = {}): string {
  return renderToStaticMarkup(
    <JourneyDocumentationSurface
      tree={tree}
      journeyName="Mirror Desktop"
      expandedPaths={new Set(["docs"])}
      content={{ status: "idle" }}
      onToggle={vi.fn()}
      onSelect={vi.fn()}
      admission={admission(compactedInspection)}
      conversationName="CR105 scope"
      journeyBriefing="A Journey for the Desktop harness."
      {...overrides}
    />,
  );
}

describe("Agentic Field", () => {
  it("names itself as a partial context of the active Conversation and states its blind spot", () => {
    const markup = render();

    expect(markup).toContain("Agentic Field");
    expect(markup).toContain("CR105 scope");
    expect(markup).toContain("1 item evidenced present now");
    expect(markup).toContain("1 more seen in this Conversation");
    expect(markup).toContain("Reads performed through shell commands are not detected.");
    expect(markup).not.toContain("complete");
  });

  it("explains admitted reads that can carry no marker instead of leaving the count unexplained", () => {
    const withOutsideRead: AdmittedContextInspection = {
      ...compactedInspection,
      entries: [
        ...compactedInspection.entries,
        {
          entryId: "a3",
          role: "assistant",
          visibleText: "",
          timestamp: "2026-10-01T09:40:00Z",
          nativeContent: [{ type: "toolCall", id: "call-3", name: "read", arguments: { path: "docs/elsewhere.md" } }],
        },
        { entryId: "r3", role: "toolResult", visibleText: "", timestamp: "2026-10-01T09:40:01Z", toolCallId: "call-3", toolName: "read", isError: false },
      ],
    };
    const markup = render({ admission: admission(withOutsideRead) });

    expect(markup).toContain("1 of 3 reads name material outside this workspace");
    expect(markup).toContain("carry no marker on the tree");
  });

  it("marks each file by presence with a shape and a text alternative", () => {
    const markup = render();

    expect(markup).toContain('data-presence="present_now"');
    expect(markup).toContain('data-presence="seen_in_conversation"');
    expect(markup).toContain('data-presence="available"');
    expect(markup).toContain("Present now");
    expect(markup).toContain("Seen in this Conversation");
    expect(markup).toContain("No admission evidence");
    // Shape carries the state; the three glyphs must all be on the surface.
    for (const glyph of ["○", "●", "◉"]) expect(markup).toContain(glyph);
  });

  it("says that the two markers coincide when the Conversation has never been compacted", () => {
    const markup = render({ admission: admission(uncompactedInspection) });

    expect(markup).toContain("This Conversation has not been compacted, so everything seen is still present.");
    expect(markup).not.toContain("seen in this Conversation</span>");
  });

  it("lists the four contextual territories beside the workspace", () => {
    const markup = render();

    expect(markup).toContain("Context territories");
    expect(markup).toContain("Journey briefing");
    expect(markup).toContain("Active Conversation");
    expect(markup).toContain("Sources");
    expect(markup).toContain("Instructions");
    expect(markup).toContain("1 of 2 read");
  });

  // The tab is already named Agent's Field, so repeating it on the cards inside it says nothing.
  it("names each card for what it holds rather than repeating the tab", () => {
    const list = render();
    const page = render({ selectedTerritory: "briefing" });

    expect(list).toContain("Context territories");
    expect(list).toContain("Workspace structure");
    expect(page).toContain("Context detail");
    for (const markup of [list, page]) {
      expect(markup).not.toContain("Agent&#x27;s field");
      expect(markup).not.toContain("Agent&#x27;s Field");
    }
  });

  it("declares the briefing as available through Mirror and never as admitted", () => {
    const markup = render({ selectedTerritory: "briefing" });

    expect(markup).toContain("A Journey for the Desktop harness.");
    expect(markup).toContain("Available to the agent through Mirror.");
    expect(markup).toContain("Admission in this Conversation: not evidenced.");
    expect(markup).toContain("Journey registry");
  });

  it("reports the Conversation's own carriage without copying the transcript", () => {
    const markup = render({ selectedTerritory: "conversation" });

    expect(markup).toContain("Close the sidebar progress work");
    expect(markup).toContain("Retained tail");
    expect(markup).toContain("u2");
    expect(markup).not.toContain("Shape the first slice");
  });

  it("separates a referenced source from one the agent actually read", () => {
    const markup = render({ selectedTerritory: "sources" });

    expect(markup).toContain("roadmap.md");
    expect(markup).toContain("spec.pdf");
    expect(markup).toContain("Read");
    expect(markup).toContain("Referenced");
  });

  it("names instruction origin and scope without ever showing envelope text", () => {
    const markup = render({ selectedTerritory: "instructions" });

    expect(markup).toContain("Mirror Desktop Journey authority");
    expect(markup).toContain("2 turns");
    expect(markup).toContain("No authority header");
    expect(markup).not.toContain("The selected Journey ID for this turn is exactly");
  });

  it("shows how a selected artifact entered the field, with its turn and source authority", () => {
    const markup = render({
      selectedNode: { relativePath: "docs/roadmap.md", name: "roadmap.md", kind: "file", previewKind: "markdown", children: [] },
      content: { status: "ready", relativePath: "docs/roadmap.md", previewKind: "markdown", content: "# Roadmap" },
    });

    expect(markup).toContain("Context presence");
    expect(markup).toContain("Read during turn");
    expect(markup).toContain("Shape the first slice");
    expect(markup).toContain("Workspace file");
  });

  it("labels a read lost to compaction by its chapter rather than by a turn that is gone", () => {
    const markup = render({
      selectedNode: { relativePath: "docs/old.md", name: "old.md", kind: "file", previewKind: "markdown", children: [] },
      content: { status: "ready", relativePath: "docs/old.md", previewKind: "markdown", content: "# Old" },
    });

    expect(markup).toContain("Read during chapter");
    expect(markup).toContain("Close the sidebar progress work");
  });

  it("states the absence of evidence for an artifact the agent never opened", () => {
    const markup = render({
      selectedNode: { relativePath: "docs/untouched.md", name: "untouched.md", kind: "file", previewKind: "markdown", children: [] },
      content: { status: "ready", relativePath: "docs/untouched.md", previewKind: "markdown", content: "# Untouched" },
    });

    expect(markup).toContain("No admission evidence in this Conversation");
  });

  it("keeps the whole workspace visible and working when admission evidence cannot be read", () => {
    const markup = render({ admission: { status: "unavailable", reason: "The Journey has no active Conversation." } });

    expect(markup).toContain("Admission evidence unavailable");
    expect(markup).toContain("The Journey has no active Conversation.");
    expect(markup).toContain("untouched.md");
    expect(markup).toContain("Workspace structure");
  });

  it("renders the workspace unchanged when no admission evidence is supplied at all", () => {
    const markup = render({ admission: undefined, conversationName: undefined, journeyBriefing: undefined });

    expect(markup).toContain("Workspace structure");
    expect(markup).toContain("roadmap.md");
    expect(markup).not.toContain("present now");
  });

  it("never claims completeness and never derives admission from a shell command", () => {
    for (const source of [browserSource, fieldSource]) {
      expect(source).not.toMatch(/complete representation/i);
      expect(source).not.toMatch(/\bcat\b|\bsed\b|parseCommand/);
    }
    // Admission is read-only derivation: the map writes nothing and indexes nothing.
    expect(fieldSource).not.toMatch(/invoke\(|writeText|localStorage/);
  });
});
