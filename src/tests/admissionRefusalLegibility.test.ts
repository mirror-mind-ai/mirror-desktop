import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import refusalSource from "../app/admissionRefusal.ts?raw";
import availabilitySource from "../domain/conversationAvailability.ts?raw";
import {
  describeAdmissionRefusal,
  type AdmissionRefusalReason,
} from "../app/admissionRefusal";

/**
 * CR140. Written first as a characterisation against unchanged code, where it passed: the started
 * Composer explained one of its four possible refusals, and `same_journey_occupied` disabled Send
 * with no sentence anywhere. The assertions below are the same questions asked of the repair.
 *
 * The defect was never in the native layer. A rejected `start_pi_invocation` already carried its
 * sentence verbatim into the refused workspace's warnings. It was the renderer's own pre-check —
 * which runs first, precisely so a refusal costs no draft — that had somewhere to decide and
 * nowhere to speak.
 */
const REASONS: readonly AdmissionRefusalReason[] = [
  "inspection_unknown",
  "same_workspace_occupied",
  // Restored after the field attempt: the Pi event transport carries one route per Journey, so a
  // sibling is refused here with a sentence rather than throwing after Send. See CR141.
  "same_journey_occupied",
  "journey_share_exceeded",
  "global_capacity_reached",
];

describe("CR140: every admission refusal has one sentence, from one place", () => {
  it("describes every reason the admission type can produce", () => {
    for (const reason of REASONS) {
      const refusal = describeAdmissionRefusal(reason);
      expect(refusal.title.length, reason).toBeGreaterThan(0);
      expect(refusal.sentence.length, reason).toBeGreaterThan(0);
      // Every refusal in this union clears on its own; none asks the Navigator to act.
      expect(refusal.waiting, reason).toBe(true);
    }
  });

  it("gives each reason a distinct sentence, so none degrades into another's", () => {
    const sentences = REASONS.map((reason) => describeAdmissionRefusal(reason).sentence);
    expect(new Set(sentences).size).toBe(REASONS.length);
    const titles = REASONS.map((reason) => describeAdmissionRefusal(reason).title);
    expect(new Set(titles).size).toBe(REASONS.length);
  });

  it("keeps the union and the described set the same size, so neither can grow alone", () => {
    // `describeAdmissionRefusal` is total by `switch` and the compiler proves it; what the compiler
    // cannot prove is that this list is complete. Counting the cases in the source closes that.
    const cases = [...refusalSource.matchAll(/^    case "([a-z_]+)":$/gm)].map((match) => match[1]);
    expect(cases.sort()).toEqual([...REASONS].sort());
  });

  it("never says a Journey is busy where it can say which work is in the way", () => {
    const named = describeAdmissionRefusal("journey_share_exceeded", {
      occupants: [{ threadId: "root" }, { threadId: "desktop-thread-b" }],
      rootThreadId: "root",
      conversationTitleOfThread: () => "Journey card",
    }).sentence;
    expect(named).toContain("this Journey's own workspace");
    expect(named).toContain("Journey card");
    // The generic form still exists, for the case where nothing can be named — and it is still
    // specific about the constraint, which is what separates it from a global busy state.
    const generic = describeAdmissionRefusal("journey_share_exceeded").sentence;
    expect(generic).toContain("as much work as it can at once");
    expect(generic).not.toContain("undefined");
  });

  it("keeps inspection_unknown distinguishable from every refusal, never relabelled as busy", () => {
    const unknown = describeAdmissionRefusal("inspection_unknown");
    expect(unknown.sentence).toBe("Checking native operation occupancy before starting.");
    for (const reason of REASONS.filter((candidate) => candidate !== "inspection_unknown")) {
      expect(describeAdmissionRefusal(reason).sentence).not.toContain("Checking");
    }
  });
});

describe("CR140: the started Composer explains the refusal it is enforcing", () => {
  const noticeRegion = (() => {
    const start = appSource.indexOf("{showNativeOccupancyNotice ? (");
    const end = appSource.indexOf("{showInactiveNativeAttemptNotice ?");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return appSource.slice(start, end);
  })();

  it("renders one notice for every refusal rather than a hand-picked subset", () => {
    // The characterisation pinned this as an allow-list of exactly one reason. There is no
    // per-reason test in the JSX at all now: the notice is driven by whether a refusal exists.
    const explained = [...noticeRegion.matchAll(/piInvocationPresentation\.reason === "([a-z_]+)"/g)]
      .map((match) => match[1]);
    expect(explained).toEqual([]);
    expect(noticeRegion).toContain("{admissionRefusal.title}");
    expect(noticeRegion).toContain("{admissionRefusal.sentence}");
  });

  it("derives that notice from the shared description, with only the unknown case held back", () => {
    const derivation = appSource.slice(
      appSource.indexOf("const admissionRefusal = piInvocationPresentation.allowed"),
      appSource.indexOf("const mirrorCommitError ="),
    );
    expect(derivation).toContain("describeAdmissionRefusal(piInvocationPresentation.reason");
    // `inspection_unknown` keeps its own notice because it is delayed rather than immediate, and
    // showing both would mean two notices for one state.
    expect(derivation).toContain('piInvocationPresentation.reason === "inspection_unknown"');
  });

  it("gives the two surfaces one source for their words", () => {
    expect(appSource).toContain("describeAdmissionRefusal");
    const startAvailability = appSource.slice(
      appSource.indexOf("const journeyStart = journeyStartAvailability({"),
      appSource.indexOf("const admissionRefusal ="),
    );
    expect(startAvailability).toContain("refusalContext: admissionRefusalContext");
    // The not-started surface no longer writes its own sentences: the sentence it used to own
    // lives in the shared module, which is what makes the two surfaces agree.
    expect(appSource).not.toContain("This Journey already has native work in progress");
    expect(refusalSource).toContain("This Journey already has native work in progress");
  });

  it("routes the share refusal to the same availability condition as the workspace one", () => {
    // Both clear only when this Journey's own work finishes, so they share a condition and a route
    // out. They differ in the sentence, which is where the difference belongs.
    expect(availabilitySource).toContain('input.nativeAdmission === "same_workspace_occupied"');
    expect(availabilitySource).toContain('|| input.nativeAdmission === "journey_share_exceeded"');
    expect(availabilitySource).toContain('blocked("journey_lease_occupied", "wait_for_journey_lease")');
  });
});
