export type ActionDisclosureState = {
  manuallyOpen: boolean;
  wasActive: boolean;
};

export type ActionDisclosureEvent =
  | { type: "activity_changed"; active: boolean }
  | { type: "toggle_requested"; open: boolean };

export function resolveActionOpen(input: { manuallyOpen: boolean; active: boolean }): boolean {
  return input.active || input.manuallyOpen;
}

export function reduceActionDisclosure(
  state: ActionDisclosureState,
  event: ActionDisclosureEvent,
): ActionDisclosureState {
  if (event.type === "activity_changed") {
    return {
      manuallyOpen: event.active || state.wasActive ? false : state.manuallyOpen,
      wasActive: event.active,
    };
  }
  if (state.wasActive) return state;
  return { ...state, manuallyOpen: event.open };
}
