import type { KeyboardEvent } from "react";

type JourneySearchControlProps = {
  query: string;
  resultCount: number;
  onQueryChange(query: string): void;
  onClear(): void;
};

export function JourneySearchControl({
  query,
  resultCount,
  onQueryChange,
  onClear,
}: JourneySearchControlProps) {
  const activeQuery = query.trim();
  const searchActive = activeQuery.length > 0;
  const resultLabel = resultCount === 1 ? "Journey" : "Journeys";

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape" || !searchActive) return;
    event.preventDefault();
    onClear();
  }

  return (
    <div
      className={`journey-search-control ${searchActive ? "is-active" : ""}`}
      data-search-active={searchActive}
    >
      <input
        className="sidebar-search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search journeys"
        aria-label="Search journeys"
      />
      {searchActive ? (
        <div className="journey-search-summary">
          <span role="status" aria-live="polite">
            {resultCount} {resultLabel} for “{activeQuery}”
          </span>
          <button type="button" onClick={onClear} aria-label="Clear Journey search">
            Clear <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
