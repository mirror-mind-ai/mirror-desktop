import { describe, expect, it } from "vitest";
import { inferMessageSpeaker, stripMessageSpeakerSignature, withCertifiedPersona } from "../app/conversationPresentation";

describe("conversation presentation", () => {
  // CR190: the person's name and initial; "You" and its initial only when no name is known.
  it("uses the person's name for user messages", () => {
    expect(inferMessageSpeaker({ role: "user", content: "Hello" }, { name: "Alisson Vale", initial: "A" }))
      .toEqual({ label: "Alisson Vale", avatar: "A", kind: "user" });
    expect(inferMessageSpeaker({ role: "user", content: "Hello" })).toEqual({ label: "You", avatar: "Y", kind: "user" });
  });

  it("detects persona signatures in assistant messages", () => {
    expect(inferMessageSpeaker({ role: "assistant", content: "✦ software-engineer\n\nEu responderia assim" })).toEqual({
      label: "software-engineer",
      avatar: "SE",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature("✦ software-engineer\n\nEu responderia assim")).toBe("Eu responderia assim");
  });

  it("detects localized persona labels from imported Mirror messages", () => {
    expect(inferMessageSpeaker({ role: "assistant", content: "✦ Persona: estrategista\n\nA proposta" })).toEqual({
      label: "estrategista",
      avatar: "E",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature("✦ Persona: estrategista\n\nA proposta")).toBe("A proposta");
  });

  it("detects persona labels after leading imported box decoration", () => {
    const content = "╭────────────────\n✦ Persona: estrategista\n\nA proposta";

    expect(inferMessageSpeaker({ role: "assistant", content })).toEqual({
      label: "estrategista",
      avatar: "E",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature(content)).toBe("A proposta");
  });

  it("recognizes late durable persona evidence while a live run settles", () => {
    const content = "A resposta.✦ Persona: product-designer";
    expect(inferMessageSpeaker({ role: "assistant", content })).toEqual({
      label: "product-designer",
      avatar: "PD",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature(content)).toBe("A resposta.");
  });

  it("moves late durable persona evidence to the presentation boundary exactly once", () => {
    expect(withCertifiedPersona("A resposta.✦ Persona: product-designer", "product-designer")).toBe(
      "✦ Persona: product-designer\n\nA resposta.",
    );
    expect(withCertifiedPersona("✦ Persona: product-designer\n\nA resposta.", "product-designer")).toBe(
      "✦ Persona: product-designer\n\nA resposta.",
    );
  });

  it("falls back to the generic agent speaker", () => {
    expect(inferMessageSpeaker({ role: "assistant", content: "Plain answer" })).toEqual({ label: "Agent", avatar: "π", kind: "agent" });
  });
});
