import type { JourneyListOrder } from "../domain/journeyRegistry";

export type RecentJourneyListPresentation = {
  order: JourneyListOrder;
  pinnedOnly: boolean;
};

type ScrollableRecentJourneyViewport = {
  scrollTo(options: ScrollToOptions): void;
};

export function shouldFollowRecentJourneyAdmission(
  presentation: RecentJourneyListPresentation,
): boolean {
  return presentation.order === "recent" && !presentation.pinnedOnly;
}

export function followRecentJourneyAdmission(
  viewport: ScrollableRecentJourneyViewport | null,
  presentation: RecentJourneyListPresentation,
  prefersReducedMotion: boolean,
): boolean {
  if (!viewport || !shouldFollowRecentJourneyAdmission(presentation)) return false;
  viewport.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  return true;
}
