import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "../agent/piTaskPacket";
import { preserveDurableConversationHistory } from "../domain/durableConversationHistory";

function message(id: string, role: ConversationMessage["role"] = "user", content = id): ConversationMessage {
  return { id, role, content, createdAt: "2026-10-02T10:00:00.000Z" };
}

// CR114: once the loaded surface is only the current chapter, writing it straight to disk would
// delete the durable record of every earlier message — including attachment provenance, which no
// Pi session can rebuild. The surface owns what it loaded and nothing else.
describe("durable Conversation history outside the loaded window", () => {
  const history = [message("pi-1"), message("pi-2"), message("pi-3"), message("pi-4")];

  it("keeps the messages the loaded window never covered", () => {
    const windowed = [message("pi-3"), message("pi-4"), message("pi-5")];
    expect(preserveDurableConversationHistory(history, windowed).map((item) => item.id))
      .toEqual(["pi-1", "pi-2", "pi-3", "pi-4", "pi-5"]);
  });

  it("lets the window replace the content of the messages it did load", () => {
    const windowed = [message("pi-3", "user", "corrected"), message("pi-4")];
    const merged = preserveDurableConversationHistory(history, windowed);
    expect(merged.find((item) => item.id === "pi-3")?.content).toBe("corrected");
    expect(merged).toHaveLength(4);
  });

  it("honours a removal inside the window, which is how an interrupted silent answer is dropped", () => {
    // CR089 drops an assistant message that produced neither words nor work. That message is
    // inside the window, so the window's opinion about it is the authoritative one.
    const windowed = [message("pi-3"), message("pi-5")];
    expect(preserveDurableConversationHistory(history, windowed).map((item) => item.id))
      .toEqual(["pi-1", "pi-2", "pi-3", "pi-5"]);
  });

  it("replaces history outright when the surface starts where the history starts", () => {
    const complete = [message("pi-1"), message("pi-2")];
    expect(preserveDurableConversationHistory(history, complete)).toEqual(complete);
  });

  it("writes the surface as it is when there is no durable history yet", () => {
    const fresh = [message("pi-1")];
    expect(preserveDurableConversationHistory(undefined, fresh)).toEqual(fresh);
    expect(preserveDurableConversationHistory([], fresh)).toEqual(fresh);
  });

  it("preserves unseen history rather than truncating when the window cannot be located", () => {
    // An id the durable record has never seen leaves the boundary unknowable. Keeping what the
    // surface does not mention is recoverable; deleting attachment provenance is not.
    const detached = [message("fresh-1"), message("fresh-2")];
    expect(preserveDurableConversationHistory(history, detached).map((item) => item.id))
      .toEqual(["pi-1", "pi-2", "pi-3", "pi-4", "fresh-1", "fresh-2"]);
  });

  it("never duplicates a message id", () => {
    const windowed = [message("pi-2"), message("pi-3"), message("pi-4")];
    const merged = preserveDurableConversationHistory(history, windowed);
    expect(new Set(merged.map((item) => item.id)).size).toBe(merged.length);
  });

  it("keeps an empty surface from erasing durable history", () => {
    expect(preserveDurableConversationHistory(history, [])).toEqual(history);
  });
});
