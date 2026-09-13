import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SteeringMessages } from "../app/SteeringMessages";
import type { SteeringEvidence } from "../domain/journeyConversation";
import appSource from "../app/App.tsx?raw";

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

    expect(html).toContain('aria-label="Corrections sent during response"');
    expect(html).toContain('class="steering-messages user-addenda"');
    expect(html).toContain("Correction during response");
    expect(html).toContain("Correction queued");
    expect(html).toContain("Correction applied");
    expect(html.indexOf("Use the safer route")).toBeLessThan(html.indexOf("Keep the explanation short"));
  });

  it("attaches corrections to the originating user cluster before the Agent box", () => {
    const userBranch = appSource.slice(
      appSource.indexOf("const owningTurn = presentedConversation.reconciliation.turns.find"),
      appSource.indexOf("<div ref={chatEndRef}"),
    );
    expect(userBranch).toContain("turn.harness.userMessageId === message.id");
    expect(userBranch.indexOf("<SteeringMessages evidence={steering} />")).toBeLessThan(
      userBranch.indexOf("<ImportedActivity events={messageActivity}"),
    );
    const assistantBranch = appSource.slice(
      appSource.indexOf('if (message.role === "assistant")'),
      appSource.indexOf("const renderTimeActivity"),
    );
    expect(assistantBranch).not.toContain("SteeringMessages");
  });

  it("does not overclaim a terminally unconsumed correction", () => {
    const html = renderToStaticMarkup(<SteeringMessages evidence={[evidence("terminally_unconsumed", 1)]} />);
    expect(html).toContain("Correction not applied");
    expect(html).not.toContain("Correction applied");
  });
});
