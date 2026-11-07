import { describe, expect, it } from "vitest";
import { stripMessageSpeakerSignature } from "../app/conversationPresentation";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";

// CR211: when the model writes two text blocks in a row, the second opening with its signature,
// the stream joins them into one comment and the signature lands in the middle, where neither
// the first-line nor the last-line rule reaches (production, 2026-11-06, the icon conversion turn).
describe("CR211: a signature between two comments of one answer", () => {
  const joined = "Gerei o `icon.png` em 512 × 512.\n\n◇ software-engineer\n\nConvertido para PNG em:\n\n```text\nicon.png\n```";

  it("is not shown in the answer", () => {
    expect(stripMessageSpeakerSignature(joined)).toBe("Gerei o `icon.png` em 512 × 512.\n\nConvertido para PNG em:\n\n```text\nicon.png\n```");
    const presentation = projectAgentTurnPresentation({ messageId: "m", content: joined, createdAt: "2026-11-06T01:06:38.934Z", linkedActivity: [] });
    expect(presentation.agentComment).not.toContain("◇");
  });

  it("is removed on every line of its own, and only there", () => {
    expect(stripMessageSpeakerSignature("Um.\n◇ ai-engineer\nDois.\n\n◇ estrategista\n\nTrês.")).toBe("Um.\nDois.\n\nTrês.");
    for (const content of ["Usei o ◇ ai-engineer no meio da frase.\n\nFim.", "Lista:\n◇ não é persona\nFim."]) {
      expect(stripMessageSpeakerSignature(content)).toBe(content);
    }
  });

  it("keeps a signature-shaped line written inside a code block", () => {
    const code = "Exemplo:\n\n```text\n◇ software-engineer\n```\n\nFim.";
    expect(stripMessageSpeakerSignature(code)).toBe(code);
  });
});
