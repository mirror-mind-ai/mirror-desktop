import type { PiInvocationAdmission } from "./piInvocationOccupancy";

export type AdmissionRefusalReason = Exclude<PiInvocationAdmission, { allowed: true }>["reason"];

export type AdmissionOccupant = {
  threadId: string;
};

export type AdmissionRefusalContext = {
  /** The live authorities holding this Journey's share, in inspection order. */
  occupants?: readonly AdmissionOccupant[];
  /** The Journey's own workspace thread, so its own run is not described as a conversation. */
  rootThreadId?: string;
  /** CR133's per-Journey catalog, for naming a conversation by its title rather than its id. */
  conversationTitleOfThread?: (threadId: string) => string | undefined;
};

export type AdmissionRefusal = {
  title: string;
  sentence: string;
  /** True while the obstacle is expected to clear without the Navigator doing anything. */
  waiting: boolean;
};

/**
 * CR140: one place that turns a refusal into words.
 *
 * Two surfaces answer the same question — `journeyStartAvailability` for a Journey that has not
 * been started, and the Composer of one that has — and before this they answered it separately.
 * They had already drifted: the not-started surface explained all four reasons while the started
 * one explained two, so a Navigator whose Journey was occupied by a conversation inside it saw
 * Send disabled with no sentence at all. That silence is what this module removes.
 *
 * Pure, and total by `switch` over the reason union: a new refusal cannot compile without a
 * sentence, which is the property the old arrangement lacked.
 */
export function describeAdmissionRefusal(
  reason: AdmissionRefusalReason,
  context: AdmissionRefusalContext = {},
): AdmissionRefusal {
  switch (reason) {
    case "inspection_unknown":
      // Bounded and self-resolving. Naming it as waiting keeps a transient check from reading
      // like a permanent refusal.
      return {
        title: "Checking native operation occupancy",
        sentence: "Checking native operation occupancy before starting.",
        waiting: true,
      };
    case "same_workspace_occupied":
      return {
        title: "This conversation is already working",
        sentence: "This conversation already has native work in progress.",
        waiting: true,
      };
    // Restored after the field attempt. The pre-CR140 sentence was *"This Journey already has
    // native work in progress."*; this keeps that meaning and adds what CR140 brought, which is
    // naming the work that is in the way. More specific than what it replaces, not less.
    case "same_journey_occupied":
      return {
        title: "This Journey is already working",
        sentence: describeJourneyOccupied(context),
        waiting: true,
      };
    case "journey_share_exceeded":
      return {
        title: "This Journey is running all it can at once",
        sentence: describeShareExceeded(context),
        waiting: true,
      };
    case "global_capacity_reached":
      return {
        title: "Global Pi capacity occupied",
        sentence: "All native Pi slots are in use. Starting becomes available once one is free."
          + " Native admission remains the atomic capacity authority.",
        waiting: true,
      };
  }
}

/**
 * One run per Journey, because the Pi event transport carries one route per Journey. Singular
 * phrasing, because at this grain exactly one workspace can be in the way.
 */
function describeJourneyOccupied(context: AdmissionRefusalContext): string {
  const named = describeOccupants(context);
  const opening = "This Journey already has native work in progress";
  const closing = "Send becomes available when it finishes.";
  return named ? `${opening} — ${named}. ${closing}` : `${opening}. ${closing}`;
}

/**
 * The share refusal is the only one whose cause is plural, so it is the only one that names who
 * holds it. Naming them is what separates this from the generic busy state RS024 set out to
 * remove: the Navigator can go to the work that is in the way.
 */
function describeShareExceeded(context: AdmissionRefusalContext): string {
  const named = describeOccupants(context);
  const opening = "This Journey is already running as much work as it can at once";
  const closing = "Send becomes available when one of them finishes.";
  return named
    ? `${opening} — ${named}. ${closing}`
    // No occupant list is a thinner sentence, not a wrong one. It stays specific about the
    // constraint even when the inspection cannot say which workspaces hold it.
    : `${opening}. ${closing}`;
}

function describeOccupants(context: AdmissionRefusalContext): string | undefined {
  const occupants = context.occupants ?? [];
  if (occupants.length === 0) return undefined;
  const names = occupants.map((occupant) => describeOccupant(occupant, context));
  if (names.length === 1) return names[0];
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}

function describeOccupant(occupant: AdmissionOccupant, context: AdmissionRefusalContext): string {
  if (context.rootThreadId && occupant.threadId === context.rootThreadId) {
    return "this Journey's own workspace";
  }
  const title = context.conversationTitleOfThread?.(occupant.threadId);
  // Falling back to the thread id is deliberate. It is not a nice name, but it is a true one, and
  // a catalog that has not been loaded is not a reason to stop saying what is in the way.
  return title ? `“${title}”` : occupant.threadId;
}
