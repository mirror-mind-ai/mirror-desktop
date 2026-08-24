import { describe, expect, it } from "vitest";
import { normalizePiResponse } from "../agent/piResponseNormalizer";

describe("Pi response normalizer", () => {
  it("extracts assistant prose and grammar projection from fenced JSON", () => {
    const normalized = normalizePiResponse(
      '```json\n{"missionDraft":{"status":"underspecified","title":null,"purpose":null,"intention":"Saudação sem missão.","openQuestions":["Qual jornada?"],"safety":{"execution":"not_executed","filesMutated":false,"mirrorInvoked":false}},"assistantMessage":"Oi! Ainda não há missão clara."}\n```',
      ["Starting local Pi command"],
    );

    expect(normalized.assistantMessage).toBe("Oi! Ainda não há missão clara.");
    expect(normalized.missionDraft).toEqual({
      id: undefined,
      title: undefined,
      purpose: "Saudação sem missão.",
      status: "draft",
    });
    expect(normalized.openQuestions).toEqual(["Qual jornada?"]);
    expect(normalized.safety).toEqual({ execution: "not_executed", filesMutated: false, mirrorInvoked: false });
    expect(normalized.diagnostics).toEqual(["Starting local Pi command"]);
  });

  it("falls back to plain text when JSON is malformed or absent", () => {
    const normalized = normalizePiResponse("Resposta livre do Pi.");

    expect(normalized.assistantMessage).toBe("Resposta livre do Pi.");
    expect(normalized.missionDraft).toBeUndefined();
    expect(normalized.openQuestions).toEqual([]);
  });

  it("adds readable breaks to generic numbered lists without domain-specific headings", () => {
    const normalized = normalizePiResponse(
      "A resposta pode ser longa. 1) definir usuário; 2) testar fluxo; 3) observar resultado.",
    );

    expect(normalized.assistantMessage).toContain("\n1) definir usuário;");
    expect(normalized.assistantMessage).toContain("\n2) testar fluxo;");
    expect(normalized.assistantMessage).toContain("\n3) observar resultado.");
  });

  it("preserves existing Markdown-style line breaks from the agent", () => {
    const normalized = normalizePiResponse("Resumo\n\n- primeiro ponto\n- segundo ponto");

    expect(normalized.assistantMessage).toBe("Resumo\n\n- primeiro ponto\n- segundo ponto");
  });
});
