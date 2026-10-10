import type { PiInvocationAdmission } from "./piInvocationOccupancy";
import { describeAdmissionRefusal, type AdmissionRefusalContext } from "./admissionRefusal";

export type JourneyStartConditions = {
  runtimeBindingReady: boolean;
  /** Native capacity authority for the selected Journey, which is already Journey-aware. */
  nativeAdmission: PiInvocationAdmission;
  /**
   * CR134 passed a locus here so the refusal could say whether the Journey's own workspace or a
   * conversation inside it held the lease. CR140 retired that: with the share spent, *several*
   * workspaces hold it, and a single locus cannot name them. The refusal now carries the
   * occupants themselves and `describeAdmissionRefusal` names each one.
   */
  refusalContext?: AdmissionRefusalContext;
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
  refusalContext,
}: JourneyStartConditions): JourneyStartAvailability {
  if (!runtimeBindingReady) {
    return {
      canStart: false,
      unavailableReason: "Connect and validate a Mirror installation in Runtime Settings to start this Journey.",
      waiting: false,
    };
  }
  if (nativeAdmission.allowed) return { canStart: true };
  // CR140: the sentences live in `describeAdmissionRefusal`, shared with the started Journey's
  // Composer, because two surfaces writing their own words for one refusal is how they came to
  // disagree about which refusals deserve words at all.
  const refusal = describeAdmissionRefusal(nativeAdmission.reason, refusalContext);
  return { canStart: false, unavailableReason: refusal.sentence, waiting: refusal.waiting };
}
