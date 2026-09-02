import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneySearchControl } from "../app/JourneySearchControl";

const ignoreQueryChange = (_query: string) => undefined;

function renderSearch(query: string, resultCount: number): string {
  return renderToStaticMarkup(
    <JourneySearchControl
      query={query}
      resultCount={resultCount}
      onQueryChange={ignoreQueryChange}
      onClear={() => undefined}
    />,
  );
}

describe("Journey search control", () => {
  it("keeps an active filter conspicuous with its query, result count, and clear action", () => {
    const html = renderSearch("mirror", 3);

    expect(html).toContain('data-search-active="true"');
    expect(html).toContain("3 Journeys for “mirror”");
    expect(html).toContain('aria-label="Clear Journey search"');
  });

  it("uses an honest singular result label", () => {
    expect(renderSearch("nautilus", 1)).toContain("1 Journey for “nautilus”");
  });

  it("does not render filtered-mode status when the query is empty", () => {
    const html = renderSearch("", 9);

    expect(html).toContain('data-search-active="false"');
    expect(html).not.toContain("Clear Journey search");
    expect(html).not.toContain("Journeys for");
  });
});
