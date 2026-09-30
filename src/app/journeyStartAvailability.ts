import type { PiInvocationAdmission } from "./piInvocationOccupancy";

export type JourneyStartConditions = {
  runtimeBindingReady: boolean;
  /** Native capacity authority for the selected Journey, which is already Journey-aware. */
  nativeAdmission: PiInvocationAdmission;
};

export type JourneyStartAvailability = {
  canStart: boolean;
  unavailableReason?: string;
  /** True while the obstacle is expected to clear without the Navigator doing anything. */
  waiting?: boolean;
};

/**
 * CR107: starting a Journey provisions one dedicated native pair. It used to be gated on a
 * global busy flag, so work in an unrelated Journey made every not-started Journey
 * unstartable — and the action was removed rather than explained, on a surface where no
 * notice can appear. Both halves are corrected here: the guard asks only what genuinely
 * conflicts, and every refusal carries a reason the surface can show.
 *
 * Native admission is the existing capacity authority and already distinguishes this
 * Journey's own work from global capacity, so it is reused rather than duplicated.
 */
export function journeyStartAvailability({
  runtimeBindingReady,
  nativeAdmission,
}: JourneyStartConditions): JourneyStartAvailability {
  if (!runtimeBindingReady) {
    return {
      canStart: false,
      unavailableReason: "Connect and validate a Mirror installation in Runtime Settings to start this Journey.",
      waiting: false,
    };
  }
  if (nativeAdmission.allowed) return { canStart: true };
  return { canStart: false, ...startRefusal(nativeAdmission.reason) };
}

function startRefusal(reason: Exclude<PiInvocationAdmission, { allowed: true }>["reason"]) {
  switch (reason) {
    case "inspection_unknown":
      // Bounded and self-resolving. Naming it as waiting keeps a transient check from
      // reading like a permanent refusal.
      return { unavailableReason: "Checking native operation occupancy before starting.", waiting: true };
    case "same_journey_occupied":
      return { unavailableReason: "This Journey already has native work in progress.", waiting: true };
    case "global_capacity_reached":
      return { unavailableReason: "All native Pi slots are in use. Starting becomes available once one is free.", waiting: true };
  }
}
