import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SteeringMessages } from "../app/SteeringMessages";
import type { SteeringEvidence } from "../domain/journeyConversation";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";
import transcriptModelSource from "../app/conversationTranscriptModel.ts?raw";
import agentTurnSource from "../app/AgentTurn.tsx?raw";

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
    // CR117: the block is a region of the agent's card now, not an addendum to the prompt.
    expect(html).toContain('class="steering-messages agent-run-corrections"');
    expect(html).toContain("Correction during response");
    expect(html).toContain("Correction queued");
    expect(html).toContain("Correction applied");
    expect(html.indexOf("Use the safer route")).toBeLessThan(html.indexOf("Keep the explanation short"));
  });

  /**
   * CR117 slice 4 moved corrections out of the prompt's cluster and into the run card. This test
   * used to guard the old placement; it now guards that the move was complete. Its ordering
   * assertion was also passing vacuously once the element was gone — `indexOf` returned -1, which
   * is below any real position — so the replacement asserts presence explicitly.
   */
  it("keeps corrections out of the prompt cluster and resolves them from the turn index", () => {
    const promptBranch = transcriptSource.slice(
      transcriptSource.indexOf("const renderTimeActivity"),
      transcriptSource.indexOf("export const ConversationTranscript"),
    );
    expect(promptBranch).toContain("<ImportedActivity events={messageActivity}");
    expect(promptBranch).not.toContain("SteeringMessages");
    // The turn index still ties a correction to the turn that owns it.
    expect(transcriptModelSource).toContain("turnByUserMessageId.set(turn.harness.userMessageId, turn)");
    expect(transcriptModelSource).toContain("steeringByAssistantMessageId");
    // And the card the Navigator is actually looking at is what renders them.
    expect(agentTurnSource).toContain("<SteeringMessages evidence={corrections} />");
  });

  it("does not overclaim a terminally unconsumed correction", () => {
    const html = renderToStaticMarkup(<SteeringMessages evidence={[evidence("terminally_unconsumed", 1)]} />);
    expect(html).toContain("Correction not applied");
    expect(html).not.toContain("Correction applied");
  });
});
