import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyAltitudeSwitcher } from "../app/JourneyAltitudeSwitcher";
import switcherSource from "../app/JourneyAltitudeSwitcher.tsx?raw";
import previewSource from "../app/journeyAltitudePreview.ts?raw";

const forbiddenRuntimeDependencies = [
  "piProcessStream",
  "providerConfig",
  "mirrorReconciliationStorage",
  "journeyConversationStorage",
  "journeyPreferenceStorage",
  "@tauri-apps",
  "node:fs",
];

describe("JourneyAltitudeSwitcher", () => {
  it.each(["operational", "tactical", "strategic"] as const)(
    "renders only Operational and safely normalizes stale %s selection",
    (selected) => {
      const html = renderToStaticMarkup(
        <JourneyAltitudeSwitcher value={selected} onChange={vi.fn()} />,
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-label="Journey altitude"');
      expect(html.match(/role="tab"/g)).toHaveLength(1);
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
      expect(html).toContain('data-altitude="operational"');
      expect(html).toContain("Operational");
      expect(html).not.toContain("Tactical");
      expect(html).not.toContain("Strategic");
      expect(html).not.toContain('data-icon="tactical"');
      expect(html).not.toContain('data-icon="strategic"');
    },
  );

  it("disables every altitude while the operational surface must remain visible", () => {
    const html = renderToStaticMarkup(
      <JourneyAltitudeSwitcher value="operational" onChange={vi.fn()} disabled />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain('aria-disabled="true"');
  });

  it("keeps the presentation contract free from runtime ownership dependencies", () => {
    for (const dependency of forbiddenRuntimeDependencies) {
      expect(switcherSource).not.toContain(dependency);
      expect(previewSource).not.toContain(dependency);
    }
    expect(switcherSource).toContain("onChange(altitude.id)");
  });
});
