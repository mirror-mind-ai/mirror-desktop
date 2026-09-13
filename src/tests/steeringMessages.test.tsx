import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SteeringMessages } from "../app/SteeringMessages";
import type { SteeringEvidence } from "../domain/journeyConversation";

function evidence(status: SteeringEvidence["status"], sequence: number): SteeringEvidence {
  return {
    schemaVersion: "0.1.0",
    requestId: `steer-run-1-${sequence}`,
    sequence,
    journeyId: "journey-one",
    generation: 1,
    runId: "run-1",
    turnId: "turn-1",
    assistantMessageId: "assistant-1",
    text: sequence === 1 ? "Use the safer route" : "Keep the explanation short",
    status,
    createdAt: "2026-09-14T10:00:00Z",
    updatedAt: "2026-09-14T10:00:01Z",
  };
}

describe("Steering message presentation", () => {
  it("keeps ordered corrections and evidence-backed statuses visible", () => {
    const html = renderToStaticMarkup(<SteeringMessages evidence={[
      evidence("accepted", 1),
      evidence("applied", 2),
    ]} />);

    expect(html).toContain('aria-label="Steering messages"');
    expect(html).toContain("Correction queued");
    expect(html).toContain("Correction applied");
    expect(html.indexOf("Use the safer route")).toBeLessThan(html.indexOf("Keep the explanation short"));
  });

  it("does not overclaim a terminally unconsumed correction", () => {
    const html = renderToStaticMarkup(<SteeringMessages evidence={[evidence("terminally_unconsumed", 1)]} />);
    expect(html).toContain("Correction not applied");
    expect(html).not.toContain("Correction applied");
  });
});
