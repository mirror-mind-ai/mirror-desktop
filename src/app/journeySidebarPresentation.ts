import type { JourneyListOrder } from "../domain/journeyRegistry";

export function defaultNewJourneyParentId(
  journeyListOrder: JourneyListOrder,
  pinnedOnly: boolean,
  selectedJourneyId: string,
): string {
  return journeyListOrder === "tree" && !pinnedOnly ? selectedJourneyId : "";
}

export function sidebarToggleLabel(sidebarCompact: boolean): string {
  return sidebarCompact ? "Expand Journey sidebar" : "Collapse Journey sidebar";
}
