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
    "hides the redundant altitude control for stale %s selection",
    (selected) => {
      const html = renderToStaticMarkup(
        <JourneyAltitudeSwitcher value={selected} onChange={vi.fn()} />,
      );

      expect(html).toBe("");
    },
  );

  it("does not leave a disabled Operational control in the interface", () => {
    const html = renderToStaticMarkup(
      <JourneyAltitudeSwitcher value="operational" onChange={vi.fn()} disabled />,
    );

    expect(html).toBe("");
  });

  it("keeps the presentation contract free from runtime ownership dependencies", () => {
    for (const dependency of forbiddenRuntimeDependencies) {
      expect(switcherSource).not.toContain(dependency);
      expect(previewSource).not.toContain(dependency);
    }
    expect(switcherSource).toContain("onChange(altitude.id)");
  });
});
