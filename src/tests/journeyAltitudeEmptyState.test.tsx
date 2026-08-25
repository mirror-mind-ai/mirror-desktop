import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAltitudeEmptyState } from "../app/JourneyAltitudeEmptyState";

const expected = {
  tactical: {
    label: "Tactical",
    title: "No tactical reading yet",
    detail: "No mission, evidence, or deliverables have been derived for Another Journey.",
  },
  strategic: {
    label: "Strategic",
    title: "No strategic reading yet",
    detail: "No realizations, impacts, or value readings have been derived for Another Journey.",
  },
} as const;

describe("JourneyAltitudeEmptyState", () => {
  it.each(["tactical", "strategic"] as const)(
    "renders an honest inert %s state contextual to the selected Journey",
    (altitude) => {
      const html = renderToStaticMarkup(
        <JourneyAltitudeEmptyState altitude={altitude} journeyName="Another Journey" />,
      );

      expect(html).toContain('role="tabpanel"');
      expect(html).toContain(`aria-label="${expected[altitude].label} workspace"`);
      expect(html).toContain(expected[altitude].title);
      expect(html).toContain(expected[altitude].detail);
      expect(html).not.toMatch(/<(button|form|input|textarea|select)\b/);
      expect(html).not.toMatch(/preview|sample|representative/i);
    },
  );
});
