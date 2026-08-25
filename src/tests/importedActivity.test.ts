import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  activityKindLabel,
  extractAriadSurfaceEventsFromContent,
  extractMirrorModeEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  groupImportedActivityByMessage,
  ImportedActivity,
  isMirrorModeActivity,
  isTerminalLikeActivity,
  mergeImportedActivityEvents,
  mirrorModeIcon,
  mirrorModeLabel,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
  stripAriadSurfaceBlocks,
} from "../app/ImportedActivity";
import type { ImportedConversationActivityEvent } from "../domain/persistedJourneyConversation";
import appSource from "../app/App.tsx?raw";

const activity = (input: Partial<ImportedConversationActivityEvent> & { id: string }): ImportedConversationActivityEvent => ({
  kind: "metadata",
  timestamp: "2026-08-23T00:00:00.000Z",
  title: "Activity",
  source: { system: "mirror", table: "messages", id: input.id },
  ...input,
});

describe("imported activity rendering helpers", () => {
  it("groups imported activity by related message id with an unlinked fallback", () => {
    const grouped = groupImportedActivityByMessage([
      activity({ id: "a", related: { messageId: "message-1" } }),
      activity({ id: "b" }),
      activity({ id: "c", related: { messageId: "message-1" } }),
    ]);

    expect(grouped.byMessageId.get("message-1")?.map((event) => event.id)).toEqual(["a", "c"]);
    expect(grouped.unlinked.map((event) => event.id)).toEqual(["b"]);
  });

  it("collapses unlinked imported context into one quiet disclosure by default", () => {
    const html = renderToStaticMarkup(createElement(ImportedActivity, {
      variant: "summary",
      events: [
        activity({ id: "a", title: "LLM call: extraction" }),
        activity({ id: "b", title: "LLM call: embedding" }),
      ],
    }));

    expect(html).toContain("Imported context");
    expect(html).toContain("2 records");
    expect(html).toContain("LLM call: extraction");
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|>)/);
  });

  it("places old unlinked imported context at the historical boundary before chat messages", () => {
    const boundary = appSource.indexOf('<ImportedActivity events={importedActivity.unlinked} variant="summary"');
    const messages = appSource.indexOf("{messages.map((message) => {");

    expect(boundary).toBeGreaterThan(0);
    expect(messages).toBeGreaterThan(boundary);
  });

  it("labels known activity kinds for compact UI rendering", () => {
    expect(activityKindLabel("ariad_surface")).toBe("Ariad");
    expect(activityKindLabel("tool_call")).toBe("Tool");
    expect(activityKindLabel("unknown_kind")).toBe("Activity");
  });

  it("treats Ariad surfaces and tool-like events as inert terminal-like text", () => {
    expect(isTerminalLikeActivity("ariad_surface")).toBe(true);
    expect(isTerminalLikeActivity("command")).toBe(true);
    expect(isTerminalLikeActivity("metadata")).toBe(false);
  });

  it("extracts inline Ariad surfaces that appear inside imported message content", () => {
    const content = [
      "before",
      "<<<ARIAD:DELIVERY_STORY_PLAN_CHECKPOINT>>> Delivery Flow: ✓ Pull",
      "approved body",
      "<<<END:DELIVERY_STORY_PLAN_CHECKPOINT>>>",
      "after",
    ].join("\n");

    expect(extractAriadSurfaceEventsFromContent({ content, messageId: "mirror-message", createdAt: "2026-08-23T00:00:00.000Z" })).toMatchObject([
      {
        kind: "ariad_surface",
        title: "Ariad surface: DELIVERY_STORY_PLAN_CHECKPOINT",
        content: expect.stringContaining("approved body"),
      },
    ]);
    expect(stripAriadSurfaceBlocks(content)).toBe("before\n\nafter");
  });

  it("does not render Ariad documentation placeholders as product surfaces", () => {
    const template = "<<<ARIAD:<SURFACE_ID>>>\n...\n<<<END:<SURFACE_ID>>>";
    expect(extractAriadSurfaceEventsFromContent({ content: template, messageId: "tool-result", createdAt: "now" })).toEqual([]);
    expect(extractMirrorSurfaceEventsFromContent({ content: template, messageId: "tool-result", createdAt: "now" })).toEqual([]);
    expect(stripAriadSurfaceBlocks(template)).toBe(template);
  });

  it("captures required and unwrapped Explorer surfaces generically in source order", () => {
    const resumed = [
      "Mirror",
      "╭────────────────╮",
      "│ △ EXPLORATORY STORY RESUMED │",
      "│ current story │",
      "╰────────────────╯",
    ].join("\n");
    const thickened = [
      "[[MIRROR_REQUIRED_SURFACE_BEGIN:story_thickened]]",
      "Mirror",
      "╭────────────────╮",
      "│ △ STORY THICKENED │",
      "│ what changed │",
      "╰────────────────╯",
      "[[MIRROR_REQUIRED_SURFACE_END:story_thickened]]",
    ].join("\n");
    const content = `before\n${resumed}\nbetween\n${thickened}\nafter`;

    const events = extractMirrorSurfaceEventsFromContent({
      content,
      messageId: "explorer-message",
      createdAt: "2026-08-23T00:00:00.000Z",
    });

    expect(events.map((event) => event.title)).toEqual([
      "Ariad surface: EXPLORATORY_STORY_RESUMED",
      "Ariad surface: STORY_THICKENED",
    ]);
    expect(events[1].content).not.toContain("MIRROR_REQUIRED_SURFACE");
    expect(stripMirrorSurfaceBlocks(content)).toBe("before\nbetween\n\nafter");
  });

  it("does not capture ordinary Explorer prose or mode-owned boxes as Ariad surfaces", () => {
    const content = [
      "The story thickened after this conversation.",
      "Mirror",
      "╭────────────────╮",
      "│ △ EXPLORER MODE ACTIVE │",
      "╰────────────────╯",
    ].join("\n");

    expect(extractMirrorSurfaceEventsFromContent({
      content,
      messageId: "ordinary-message",
      createdAt: "2026-08-23T00:00:00.000Z",
    })).toEqual([]);
  });

  it("extracts and strips Mirror mode activation surfaces from imported message text", () => {
    const content = [
      "Mirror",
      "",
      "╭────────────────",
      "| ◌ MIRROR MODE ACTIVE | active journey | amplia |",
      "╰────────────────",
      "",
      "✦ Persona: estrategista",
      "A proposta começa aqui.",
    ].join("\n");

    expect(extractMirrorModeEventsFromContent({ content, messageId: "mirror-message", createdAt: "2026-08-23T00:00:00.000Z" })).toMatchObject([
      { kind: "mirror_mode", title: "Mirror Mode Active", content: expect.stringContaining("| ◌ MIRROR MODE ACTIVE | active journey | amplia |") },
    ]);
    expect(stripMirrorModeBlocks(content)).toBe("✦ Persona: estrategista\nA proposta começa aqui.");
  });

  it("recognizes Mirror mode activation surfaces", () => {
    const event = activity({
      id: "mode",
      kind: "ariad_surface",
      title: "Ariad surface: MIRROR_MODE_ACTIVE",
      content: "| ◌ MIRROR MODE ACTIVE | active journey | mirror-dev |",
    });

    expect(isMirrorModeActivity(event)).toBe(true);
    expect(mirrorModeLabel(event)).toBe("Mirror Mode");
    expect(mirrorModeIcon(event)).toBe("◌");
    expect(mirrorModeIcon(activity({
      id: "builder",
      title: "Builder Mode Active",
      content: "│ ■ BUILDER MODE ACTIVE │",
    }))).toBe("■");
    expect(mirrorModeIcon(activity({
      id: "explorer",
      title: "Explorer Mode Active",
      content: "│ △ EXPLORER MODE ACTIVE │",
    }))).toBe("△");
    expect(mirrorModeIcon(activity({
      id: "soul",
      title: "Soul Mode Active",
      content: "│ ☾ SOUL MODE ACTIVE │",
    }))).toBe("☾");
  });

  it("deduplicates render-time Ariad fallbacks already imported from disk", () => {
    const imported = activity({ id: "imported", kind: "ariad_surface", title: "Ariad surface: PLAN", content: "surface" });
    const fallback = activity({ id: "fallback", kind: "ariad_surface", title: "Ariad surface: PLAN", content: "surface" });

    expect(mergeImportedActivityEvents([imported], [fallback]).map((event) => event.id)).toEqual(["imported"]);
  });
});
