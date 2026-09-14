import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConcurrentTurnCapacityNotice } from "../app/ConcurrentTurnCapacityNotice";

describe("ConcurrentTurnCapacityNotice", () => {
  it("shows bounded aggregate occupancy and available slots", () => {
    const html = renderToStaticMarkup(<ConcurrentTurnCapacityNotice presentation={{
      used: 1,
      limit: 4,
      available: 3,
      full: false,
      label: "Concurrent turns: 1 / 4",
    }} />);
    expect(html).toContain("Concurrent turns: 1 / 4");
    expect(html).toContain("3 available concurrent turns.");
    expect(html).toContain('aria-live="polite"');
  });

  it("states when all supported slots are occupied", () => {
    const html = renderToStaticMarkup(<ConcurrentTurnCapacityNotice presentation={{
      used: 4,
      limit: 4,
      available: 0,
      full: true,
      label: "Concurrent turns: 4 / 4",
    }} />);
    expect(html).toContain("No concurrent turns are available until an admitted Journey finishes recording.");
  });
});
