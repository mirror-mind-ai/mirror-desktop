import type { JourneyListOrder } from "../domain/journeyRegistry";

export function defaultNewJourneyParentId(
  journeyListOrder: JourneyListOrder,
  pinnedOnly: boolean,
  selectedJourneyId: string,
): string {
  return journeyListOrder === "tree" && !pinnedOnly ? selectedJourneyId : "";
}

export type JourneySidebarViewState = {
  sidebarCompact: boolean;
  journeyListOrder: JourneyListOrder;
  pinnedOnly: boolean;
};

export function toggleJourneySidebar(state: JourneySidebarViewState): JourneySidebarViewState {
  if (!state.sidebarCompact && state.journeyListOrder === "tree" && !state.pinnedOnly) {
    return { sidebarCompact: true, journeyListOrder: "recent", pinnedOnly: false };
  }
  return { ...state, sidebarCompact: !state.sidebarCompact };
}

export function activateJourneyTree(): JourneySidebarViewState {
  return { sidebarCompact: false, journeyListOrder: "tree", pinnedOnly: false };
}

export function sidebarToggleLabel(sidebarCompact: boolean): string {
  return sidebarCompact ? "Expand Journey sidebar" : "Collapse Journey sidebar";
}
