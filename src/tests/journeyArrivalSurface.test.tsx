import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyArrivalSurface, journeyConversationStarters } from "../app/JourneyArrivalSurface";

 describe("Journey arrival surface", () => {
  it("offers a model-free situated threshold outside the transcript", () => {
    const html = renderToStaticMarkup(createElement(JourneyArrivalSurface, {
      journeyName: "Livro Liderança Soberana",
      stage: "Manuscrito iniciado",
      onChoose: vi.fn(),
    }));
    expect(html).toContain("Journey context is active");
    expect(html).toContain("Where would you like to begin?");
    expect(html).toContain("Manuscrito iniciado");
    expect(html).toContain("Understand where we are");
    expect(html).not.toContain("message assistant");
    expect(html).not.toContain("textarea");
  });

  it("uses editable first-message suggestions without automatic submission", () => {
    const onChoose = vi.fn();
    const element = JourneyArrivalSurface({ journeyName: "Journey", onChoose });
    const buttons = Array.isArray(element.props.children) ? element.props.children : [];
    expect(JSON.stringify(buttons)).toContain("Explore the current tension");
    expect(journeyConversationStarters).toHaveLength(4);
    expect(journeyConversationStarters[0].message).toContain("current state of this Journey");
    expect(journeyConversationStarters.some((suggestion) => /Onde|Qual tensão|Quero pensar/.test(suggestion.message))).toBe(false);
    expect(onChoose).not.toHaveBeenCalled();
  });
});
