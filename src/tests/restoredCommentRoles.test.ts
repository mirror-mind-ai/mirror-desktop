import { describe, expect, it } from "vitest";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";

function entry(entryId: string, role: string, visibleText: string) {
  return { entryId, role, visibleText, timestamp: "2026-09-29T10:00:00Z", nativeContent: {} };
}

function project(entries: ReturnType<typeof entry>[]) {
  return projectPiBackedConversationSurface(
    {
      id: "c1",
      journeyId: "j1",
      title: "t",
      createdAt: "2026-09-29T10:00:00Z",
      updatedAt: "2026-09-29T10:00:00Z",
      messages: [],
      reconciliation: { turns: [] },
    } as never,
    {
      schemaVersion: "0.1.0",
      activeEntryCount: entries.length,
      compactionCount: 0,
      chapterClosures: [],
      unknownPromptEnvelopeCount: 0,
      entries,
      turns: [],
    } as never,
  );
}

describe("CR083 restored comment roles", () => {
  it("treats every assistant comment before the last one of a turn as a note", () => {
    const surface = project([
      entry("e1", "user", "faça"),
      entry("e2", "assistant", "Vou rodar os smokes agora."),
      entry("e3", "assistant", "Produção está saudável."),
      entry("e4", "assistant", "A release final foi ativada."),
    ]);

    const roles = surface.agentCommentRoles ?? {};
    const assistants = surface.messages.filter((message) => message.role === "assistant");
    expect(assistants).toHaveLength(3);
    expect(roles[assistants[0].id]).toBe("trail");
    expect(roles[assistants[1].id]).toBe("trail");
    // The comment that closed the turn keeps the weight of an answer.
    expect(roles[assistants[2].id]).toBeUndefined();
  });

  it("never marks a lone answer as a note", () => {
    const surface = project([
      entry("e1", "user", "faça"),
      entry("e2", "assistant", "Pronto."),
    ]);

    const assistant = surface.messages.find((message) => message.role === "assistant");
    expect(surface.agentCommentRoles?.[assistant!.id]).toBeUndefined();
  });

  it("closes each turn separately, so an earlier answer stays an answer", () => {
    const surface = project([
      entry("e1", "user", "primeira"),
      entry("e2", "assistant", "Resposta um."),
      entry("e3", "user", "segunda"),
      entry("e4", "assistant", "Vou verificar."),
      entry("e5", "assistant", "Resposta dois."),
    ]);

    const roles = surface.agentCommentRoles ?? {};
    const assistants = surface.messages.filter((message) => message.role === "assistant");
    expect(roles[assistants[0].id]).toBeUndefined();
    expect(roles[assistants[1].id]).toBe("trail");
    expect(roles[assistants[2].id]).toBeUndefined();
  });
});
