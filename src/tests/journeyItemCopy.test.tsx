import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyItemCopy } from "../app/JourneyItemCopy";

describe("Journey item copy", () => {
  it("exposes identity, hierarchy context, and runtime status as independent layout rows", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy
        journeyName="Venda de Livros"
        description="Empreendedora / Software Zen"
        runtimePhase="running"
      />,
    );

    expect(html).toContain('class="journey-name"');
    expect(html).toContain('class="journey-context"');
    expect(html).toContain("journey-runtime-state running");
    expect(html.indexOf("journey-name")).toBeLessThan(html.indexOf("journey-context"));
    expect(html.indexOf("journey-context")).toBeLessThan(html.indexOf("journey-runtime-state"));
  });

  it("omits the runtime row when the Journey has no exact active owner phase", () => {
    const html = renderToStaticMarkup(
      <JourneyItemCopy journeyName="Amplia" description="Vida Criativa" />,
    );

    expect(html).not.toContain("journey-runtime-state");
  });
});
