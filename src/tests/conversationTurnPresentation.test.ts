import { describe, expect, it } from "vitest";
import {
  projectAgentTurnPresentation,
  type AgentTurnPresentationInput,
} from "../app/conversationTurnPresentation";
import type { ImportedConversationActivityEvent } from "../domain/persistedJourneyConversation";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";

const event = (input: Partial<ImportedConversationActivityEvent> & { id: string }): ImportedConversationActivityEvent => ({
  kind: "metadata",
  timestamp: "2026-09-11T00:00:00.000Z",
  title: "Imported record",
  source: { system: "mirror", table: "messages", id: input.id },
  ...input,
});

function project(overrides: Partial<AgentTurnPresentationInput> = {}) {
  return projectAgentTurnPresentation({
    messageId: "assistant-1",
    content: "Final comment.",
    createdAt: "2026-09-11T00:00:00.000Z",
    linkedActivity: [],
    ...overrides,
  });
}

describe("agent turn semantic projection", () => {
  it("composes exact runtime actions, canonical surfaces, and the stripped comment", () => {
    const repeatedSurface = "<<<ARIAD:PLAN>>>\ncanonical plan\n<<<END:PLAN>>>";
    const toolSurface = "[[MIRROR_REQUIRED_SURFACE_BEGIN:CHECKPOINT]]\ncheckpoint body\n[[MIRROR_REQUIRED_SURFACE_END:CHECKPOINT]]";
    const runtimeProjection: RuntimeProjectionState = {
      status: "working",
      operations: [{ id: "read-1", name: "read", status: "completed", output: toolSurface }],
      reasoningSummaries: [{ id: "reasoning-1", content: "Checking sources", status: "completed" }],
      activityOrder: [
        { type: "reasoning_summary", id: "reasoning-1" },
        { type: "operation", id: "read-1" },
      ],
    };

    const presentation = project({
      content: `${repeatedSurface}\n\n✦ Persona: product-designer\n\nFinal comment.`,
      linkedActivity: [
        event({ id: "persisted-plan", kind: "ariad_surface", title: "Ariad surface: PLAN", content: repeatedSurface }),
        event({ id: "metadata", kind: "metadata" }),
      ],
      runtimeProjection,
    });

    expect(presentation.agentComment).toBe("Final comment.");
    expect(presentation.agentActions).toBe(runtimeProjection);
    expect(presentation.systemSurfaces.map((surface) => surface.title)).toEqual([
      "Ariad surface: PLAN",
      "Ariad surface: CHECKPOINT",
    ]);
    expect(presentation.systemSurfaces[0].content).toBe(repeatedSurface);
    expect(presentation.systemSurfaces[1].content).toBe("checkpoint body");
    expect(presentation.remainingActivity.map((item) => item.id)).toEqual(["metadata"]);
  });

  it("does not create Agent Actions from a successful terminal status alone", () => {
    const presentation = project({
      runtimeProjection: {
        status: "completed",
        operations: [],
        reasoningSummaries: [],
        activityOrder: [],
      },
    });

    expect(presentation.agentActions).toBeUndefined();
  });

  it("retains failed and cancelled terminal outcomes as meaningful action evidence", () => {
    for (const status of ["failed", "cancelled"] as const) {
      expect(project({
        runtimeProjection: {
          status,
          operations: [],
          reasoningSummaries: [],
          activityOrder: [],
          terminalMessage: `${status} outcome`,
        },
      }).agentActions?.status).toBe(status);
    }
  });

  it("projects persisted evidence without inventing runtime actions", () => {
    const presentation = project({
      content: "Persisted answer",
      linkedActivity: [event({
        id: "persisted-surface",
        kind: "ariad_surface",
        title: "Ariad surface: STATUS",
        content: "<<<ARIAD:STATUS>>>\nstable\n<<<END:STATUS>>>",
      })],
    });

    expect(presentation.agentActions).toBeUndefined();
    expect(presentation.agentComment).toBe("Persisted answer");
    expect(presentation.systemSurfaces).toHaveLength(1);
  });

  it("classifies Mirror mode output as a System Surface and omits empty groups", () => {
    const mode = "│ ■ BUILDER MODE ACTIVE │";
    const presentation = project({ content: `${mode}\n\n✦ Persona: software-engineer` });

    expect(presentation.agentComment).toBe("");
    expect(presentation.agentActions).toBeUndefined();
    expect(presentation.systemSurfaces).toMatchObject([{ kind: "mirror_mode", content: mode }]);
    expect(presentation.remainingActivity).toEqual([]);
  });
});
