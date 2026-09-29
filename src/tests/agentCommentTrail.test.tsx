import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reduceStreamedAssistantMessage } from "../agent/agentStream";
import { mapPiProcessEventToStreamEvents } from "../agent/piProcessStream";
import { AgentTurn } from "../app/AgentTurn";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";
import { initialRuntimeProjectionState, reduceRuntimeProjection } from "../app/runtimeActivityModel";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";

const FIRST = "Vou rodar os smokes públicos agora.";
const SECOND = "Produção está saudável na release nova.";

function projectionWith(comments: string[], status: RuntimeProjectionState["status"]): RuntimeProjectionState {
  return { ...initialRuntimeProjectionState, status, agentComments: comments };
}

function presentationFor(content: string, runtimeProjection?: RuntimeProjectionState) {
  return projectAgentTurnPresentation({
    messageId: "assistant-1",
    content,
    createdAt: "2026-09-29T00:00:00.000Z",
    linkedActivity: [],
    ...(runtimeProjection ? { runtimeProjection } : {}),
  });
}

describe("CR083 agent comment trail", () => {
  it("closes a comment at the assistant message boundary instead of gluing the next one", () => {
    const boundary = mapPiProcessEventToStreamEvents({
      kind: "stdout",
      content: `${JSON.stringify({ type: "message_end", message: { role: "assistant" } })}\n`,
    });
    expect(boundary).toContainEqual({ type: "agent_comment_boundary" });

    let content = reduceStreamedAssistantMessage("", { type: "message_delta", content: FIRST });
    content = reduceStreamedAssistantMessage(content, { type: "agent_comment_boundary" });
    content = reduceStreamedAssistantMessage(content, { type: "message_delta", content: SECOND });

    expect(content).toBe(`${FIRST}\n\n${SECOND}`);
    expect(content).not.toContain("agora.Produção");
  });

  it("keeps the comments of one run as an ordered list, ignoring silent tool-only steps", () => {
    const events = [
      { type: "message_delta", content: FIRST },
      { type: "agent_comment_boundary" },
      { type: "agent_comment_boundary" },
      { type: "message_delta", content: SECOND },
      { type: "agent_comment_boundary" },
    ] as const;
    const projection = events.reduce(reduceRuntimeProjection, initialRuntimeProjectionState);

    expect(projection.agentComments).toEqual([FIRST, SECOND]);
  });

  it("promotes the last comment to the answer only once the run has closed", () => {
    const working = presentationFor(`${FIRST}\n\n${SECOND}`, projectionWith([FIRST, SECOND], "working"));
    expect(working.commentTrail).toEqual([FIRST, SECOND]);
    expect(working.closingComment).toBeUndefined();

    const completed = presentationFor(`${FIRST}\n\n${SECOND}`, projectionWith([FIRST, SECOND], "completed"));
    expect(completed.commentTrail).toEqual([FIRST]);
    expect(completed.closingComment).toBe(SECOND);
  });

  it("never promotes an anticipation to an answer when the run was cancelled or failed", () => {
    for (const status of ["cancelled", "failed"] as const) {
      const presentation = presentationFor(FIRST, projectionWith([FIRST], status));
      expect(presentation.commentTrail).toEqual([FIRST]);
      expect(presentation.closingComment).toBeUndefined();
    }
  });

  it("leaves a single-comment answer exactly as it reads today", () => {
    const restored = presentationFor("Consolidated answer");
    expect(restored.commentTrail).toBeUndefined();
    expect(restored.agentComment).toBe("Consolidated answer");

    const live = presentationFor("Consolidated answer", projectionWith(["Consolidated answer"], "completed"));
    expect(live.commentTrail).toBeUndefined();
    expect(live.closingComment).toBe("Consolidated answer");
  });

  it("preserves the whole turn text for copying, boundaries included", () => {
    const presentation = presentationFor(`${FIRST}\n\n${SECOND}`, projectionWith([FIRST, SECOND], "completed"));
    expect(presentation.agentComment).toBe(`${FIRST}\n\n${SECOND}`);
  });

  it("marks a restored mid-run comment as a note, so reloading does not change the register", () => {
    const midRun = projectAgentTurnPresentation({
      messageId: "assistant-1",
      content: FIRST,
      createdAt: "2026-09-29T00:00:00.000Z",
      linkedActivity: [],
      commentRole: "trail",
    });
    expect(midRun.commentTrail).toEqual([FIRST]);
    expect(midRun.closingComment).toBeUndefined();

    const closing = projectAgentTurnPresentation({
      messageId: "assistant-2",
      content: SECOND,
      createdAt: "2026-09-29T00:00:00.000Z",
      linkedActivity: [],
    });
    expect(closing.commentTrail).toBeUndefined();
  });

  it("renders the trail visibly, never behind a disclosure the Navigator must open", () => {
    const html = renderToStaticMarkup(
      <AgentTurn
        message={{ id: "assistant-1", role: "assistant", content: "ignored", createdAt: "2026-09-29T00:00:00.000Z" }}
        speaker={{ label: "Agent", avatar: "π", kind: "agent" }}
        presentation={{
          systemSurfaces: [],
          remainingActivity: [],
          agentComment: `${FIRST}\n\n${SECOND}`,
          commentTrail: [FIRST],
          closingComment: SECOND,
        }}
        proximity="latest_completed"
      />,
    );

    expect(html).toContain("agent-comment-trail");
    expect(html).toContain(FIRST);
    expect(html).toContain(SECOND);
    expect(html.indexOf(FIRST)).toBeLessThan(html.indexOf(SECOND));
    const trailStart = html.indexOf("agent-comment-trail");
    expect(html.slice(trailStart, html.indexOf(SECOND))).not.toContain("<details");
  });
});
