import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";
import { displayNameFromMirrorUser, normalizeDisplayName, resolvePerson } from "../domain/personName";
import { inferMessageSpeaker } from "../app/conversationPresentation";
import { PersonButton, UserNameSettings } from "../app/UserAvatar";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";

/**
 * CR190: the person is shown at the top right and named on their own turns. The Mirror Core does
 * not hand its host the person's written name, so the app derives it from the home's user
 * (`alisson-vale` reads "Alisson Vale") and lets the person correct it in Settings › You.
 */
describe("CR190 the person's name", () => {
  it("reads a home's user as a name", () => {
    expect(displayNameFromMirrorUser("alisson-vale")).toBe("Alisson Vale");
    expect(displayNameFromMirrorUser("ana")).toBe("Ana");
    expect(displayNameFromMirrorUser("")).toBeUndefined();
    expect(displayNameFromMirrorUser(undefined)).toBeUndefined();
  });

  it("prefers the name the person wrote, then the home's user, then You", () => {
    expect(resolvePerson("  Ana   Clara ", "alisson-vale")).toEqual({ name: "Ana Clara", initial: "A" });
    expect(resolvePerson(undefined, "alisson-vale")).toEqual({ name: "Alisson Vale", initial: "A" });
    expect(resolvePerson("", "bruno")).toEqual({ name: "Bruno", initial: "B" });
    expect(resolvePerson(undefined, undefined)).toEqual({ name: "You", initial: "Y" });
    expect(resolvePerson("élio", undefined).initial).toBe("É");
  });

  it("bounds a written name", () => {
    expect(normalizeDisplayName("   ")).toBeUndefined();
    expect(normalizeDisplayName("a".repeat(200))).toHaveLength(80);
    expect(normalizeDisplayName(42)).toBeUndefined();
  });

  it("keeps the written name across a reload, and a bad value costs nothing else", () => {
    const saved = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, userDisplayName: "Ana Clara", sidebarCompact: true });
    expect(parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(saved)))?.preferences.userDisplayName).toBe("Ana Clara");
    const broken = { ...saved, preferences: { ...saved.preferences, userDisplayName: { no: true } } };
    const parsed = parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(broken)));
    expect(parsed?.preferences.sidebarCompact).toBe(true);
    expect(parsed?.preferences.userDisplayName).toBeUndefined();
  });
});

describe("CR190 the person's turns", () => {
  it("carry the person's name and initial instead of You and N", () => {
    expect(inferMessageSpeaker({ role: "user", content: "Oi" }, { name: "Alisson Vale", initial: "A" }))
      .toEqual({ label: "Alisson Vale", avatar: "A", kind: "user" });
    expect(inferMessageSpeaker({ role: "user", content: "Oi" })).toEqual({ label: "You", avatar: "Y", kind: "user" });
  });

  it("reach every place the transcript draws the person", () => {
    expect(transcriptSource).toMatch(/inferMessageSpeaker\(\{ \.\.\.message, content: renderedContent \}, person\)/);
    expect(transcriptSource).not.toMatch(/fallback="N"/);
  });
});

describe("CR190 the header", () => {
  it("draws the person as a round button that shows their name", () => {
    const closed = renderToStaticMarkup(<PersonButton person={{ name: "Alisson Vale", initial: "A" }} open={false} onOpenChange={vi.fn()} />);
    const open = renderToStaticMarkup(<PersonButton person={{ name: "Alisson Vale", initial: "A" }} open onOpenChange={vi.fn()} />);
    const photo = renderToStaticMarkup(<PersonButton person={{ name: "Alisson Vale", initial: "A" }} avatar="data:image/png;base64,aGVsbG8=" open={false} onOpenChange={vi.fn()} />);

    expect(closed).toContain('aria-label="Alisson Vale"');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain(">A<");
    expect(closed).not.toContain("person-popover");
    expect(open).toContain("person-popover");
    expect(open).toContain("Alisson Vale");
    expect(photo).toContain("<img");
  });

  it("puts Chapters in the ⋯ menu, and the person to its right", () => {
    const header = appSource.slice(appSource.indexOf('className="journey-menu-wrap"'), appSource.indexOf('className="journey-altitude-row"'));
    expect(header).toMatch(/role="menuitem"[\s\S]*Chapters…/);
    expect(header).toMatch(/journey-menu-reason">\s*No chapters yet\. This Conversation has not been compacted, so it is still one chapter\./);
    expect(header.indexOf("<PersonButton")).toBeGreaterThan(header.indexOf('className="journey-menu"'));
    expect(appSource).not.toContain("conversation-chapter-shortcut");
  });

  it("lets the person write their name in Settings › You", () => {
    const field = renderToStaticMarkup(<UserNameSettings value="" placeholder="Alisson Vale" onChange={vi.fn()} />);
    expect(field).toContain('aria-label="Your name"');
    expect(field).toContain('placeholder="Alisson Vale"');
    const you = appSource.slice(appSource.indexOf('id="settings-panel-you"'), appSource.indexOf('aria-label="Application appearance"'));
    expect(you).toContain("<UserNameSettings");
  });
});

describe("CR190 the reset dialog", () => {
  it("says plainly that the agent starts over and that the past generation cannot be resumed", () => {
    const dialog = appSource.slice(appSource.indexOf('aria-label="Confirm agent context reset"'), appSource.indexOf("conversationCreateOpen ? ("));
    expect(dialog).toContain("The agent will start with no memory of what was said in this Conversation.");
    expect(dialog).toContain("cannot be made active again from the app");
    expect(dialog).toContain("The Mirror's memories are not affected.");
  });
});

describe("CR190 after the Navigator's review", () => {
  const menu = appSource.slice(appSource.indexOf("CR190: Chapters moved here"), appSource.indexOf("Reset agent context…"));
  const dialog = appSource.slice(appSource.indexOf('aria-label="Confirm agent context reset"'), appSource.indexOf("conversationCreateOpen ? ("));
  const actions = dialog.slice(dialog.indexOf('className="provider-actions"'));

  it("separates Chapters from Reset agent context in the ⋯ menu", () => {
    expect(menu).toMatch(/Chapters…[\s\S]*<div className="journey-menu-separator" role="separator" \/>/);
  });

  it("makes Cancel the default and emphasized action, and Reset the secondary one", () => {
    const cancel = actions.slice(actions.indexOf("<button"), actions.indexOf("Cancel"));
    const reset = actions.slice(actions.indexOf("confirmConversationRestart"), actions.indexOf('"Reset agent context"'));
    expect(actions.indexOf("Cancel")).toBeLessThan(actions.indexOf("confirmConversationRestart"));
    expect(cancel).toContain("autoFocus");
    expect(cancel).not.toContain("secondary-button");
    expect(actions.slice(actions.lastIndexOf("<button", actions.indexOf("confirmConversationRestart")), actions.indexOf("confirmConversationRestart"))).toContain("secondary-button");
    expect(reset).not.toContain("autoFocus");
  });

  it("says why a person would reset, and points to compaction for a merely long context", () => {
    expect(dialog).toContain("When to reset");
    expect(dialog).toContain("Compact now");
  });
});
