import { describe, expect, it } from "vitest";
import script from "../../scripts/mirror_conversation_catalog.py?raw";
import stableConfig from "../../src-tauri/tauri.conf.json";

describe("Mirror conversation catalog resource", () => {
  it("uses released MemoryClient services behind exact Journey and full-id checks", () => {
    expect(script).toContain("mem.conversations.list_recent(");
    expect(script).toContain("journey=args.journey_id");
    expect(script).toContain("conversation.id != args.conversation_id");
    expect(script).toContain("conversation.journey != args.journey_id");
    expect(script).toContain("mem.conversations.update_title(");
    expect(script).not.toContain("sqlite3");
    expect(script).not.toContain("mem.store.conn");
  });

  it("is packaged with the application", () => {
    expect(JSON.stringify(stableConfig.bundle)).toContain("scripts/mirror_conversation_catalog.py");
  });
});
