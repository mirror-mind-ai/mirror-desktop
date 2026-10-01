import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentTurn, type AgentRunTrailPart } from "../app/AgentTurn";
import { projectTranscriptRenderItems } from "../app/agentRunGrouping";
import type { AgentTurnPresentation } from "../app/conversationTurnPresentation";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

const NOTE_ONE = "Leitura 1/4: vou ler o primeiro arquivo.";
const NOTE_TWO = "A leitura 1/4 foi truncada; vou continuar.";
const ANSWER = "Concluído. Li os quatro arquivos.";

function presentation(comment: string, extra: Partial<AgentTurnPresentation> = {}): AgentTurnPresentation {
  return { systemSurfaces: [], remainingActivity: [], agentComment: comment, ...extra };
}

function trailPart(messageId: string, comment: string, model?: AgentRunTrailPart["model"]): AgentRunTrailPart {
  return { messageId, presentation: presentation(comment), ...(model ? { model } : {}) };
}

describe("CR111 — grouping a run's assistant messages", () => {
  it("groups consecutive assistant messages and lets a request close the run", () => {
    const items = projectTranscriptRenderItems([
      { id: "u1", role: "user" },
      { id: "a1", role: "assistant" },
      { id: "a2", role: "assistant" },
      { id: "a3", role: "assistant" },
      { id: "u2", role: "user" },
      { id: "a4", role: "assistant" },
    ]);

    expect(items).toEqual([
      { kind: "message", messageId: "u1" },
      { kind: "agent_run", messageIds: ["a1", "a2", "a3"] },
      { kind: "message", messageId: "u2" },
      { kind: "agent_run", messageIds: ["a4"] },
    ]);
  });

  it("breaks a run at a chapter divider, which is a real boundary in the transcript", () => {
    const items = projectTranscriptRenderItems(
      [
        { id: "a1", role: "assistant" },
        { id: "a2", role: "assistant" },
        { id: "a3", role: "assistant" },
      ],
      { chapterDividerMessageIds: new Set(["a2"]) },
    );

    expect(items).toEqual([
      { kind: "agent_run", messageIds: ["a1"] },
      { kind: "agent_run", messageIds: ["a2", "a3"] },
    ]);
  });

  it("treats a lone assistant message as a run of one, so nothing is special-cased", () => {
    expect(projectTranscriptRenderItems([{ id: "a1", role: "assistant" }]))
      .toEqual([{ kind: "agent_run", messageIds: ["a1"] }]);
    expect(projectTranscriptRenderItems([])).toEqual([]);
  });
});

describe("CR111 — a settled run reads as one trail", () => {
  const message = { id: "a3", role: "assistant" as const, content: ANSWER, createdAt: "2026-09-30T00:00:00.000Z" };
  const speaker = { label: "Agent", avatar: "π", kind: "agent" as const };

  it("renders one card holding every comment of the run, in order", () => {
    const html = renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation(ANSWER)}
        trailParts={[trailPart("a1", NOTE_ONE), trailPart("a2", NOTE_TWO)]}
        proximity="historical"
      />,
    );

    // One card, one conductor, every comment on it.
    expect(html.match(/agent-comment-trail/g)).toHaveLength(1);
    expect(html.match(/class="message assistant/g)).toHaveLength(1);
    expect(html.indexOf(NOTE_ONE)).toBeLessThan(html.indexOf(NOTE_TWO));
    expect(html.indexOf(NOTE_TWO)).toBeLessThan(html.indexOf(ANSWER));
    // The closing answer keeps its own weight rather than becoming another note.
    expect(html.slice(html.indexOf("agent-comment-trail"), html.indexOf(ANSWER))).toContain("</ol>");
  });

  it("keeps every grouped message addressable, so search can still reach a note", () => {
    const html = renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation(ANSWER)}
        trailParts={[trailPart("a1", NOTE_ONE), trailPart("a2", NOTE_TWO)]}
        proximity="historical"
        activeSearchMessageId="a2"
      />,
    );

    expect(html).toContain('data-conversation-message-id="a1"');
    expect(html).toContain('data-conversation-message-id="a2"');
    expect(html).toContain('data-conversation-message-id="a3"');
    expect(html).toContain("conversation-message-search-current");
  });

  it("annotates a point where the model changed instead of breaking the run", () => {
    const html = renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation(ANSWER)}
        trailParts={[
          trailPart("a1", NOTE_ONE),
          trailPart("a2", NOTE_TWO, { label: "anthropic/claude", changed: true }),
        ]}
        proximity="historical"
      />,
    );

    // Still one run, with the change named at the point it happened.
    expect(html.match(/agent-comment-trail/g)).toHaveLength(1);
    expect(html).toContain("anthropic/claude");
  });

  it("does not annotate a point where the model simply continued", () => {
    const html = renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation(ANSWER)}
        trailParts={[trailPart("a2", NOTE_TWO, { label: "openai-codex/gpt-5.5", changed: false })]}
        proximity="historical"
      />,
    );

    expect(html).not.toContain("openai-codex/gpt-5.5");
  });

  it("collects the whole run's detail into one disclosure", () => {
    const withAction = (comment: string, name: string) => presentation(comment, {
      agentActions: {
        status: "completed",
        operations: [{ id: `op-${name}`, name, status: "completed" }],
        reasoningSummaries: [],
        activityOrder: [{ type: "operation", id: `op-${name}` }],
      },
    });
    const html = renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={withAction(ANSWER, "third")}
        trailParts={[
          { messageId: "a1", presentation: withAction(NOTE_ONE, "first") },
          { messageId: "a2", presentation: presentation(NOTE_TWO) },
        ]}
        proximity="historical"
      />,
    );

    expect(html.match(/<details/g)).toHaveLength(1);
    expect(html).toContain("Show turn details · 2 actions");
  });

  it("leaves a single-message turn exactly as it was", () => {
    const render = (trailParts?: AgentRunTrailPart[]) => renderToStaticMarkup(
      <AgentTurn
        message={message}
        speaker={speaker}
        presentation={presentation(`${NOTE_ONE}\n\n${ANSWER}`, { commentTrail: [NOTE_ONE], closingComment: ANSWER })}
        proximity="latest_completed"
        {...(trailParts ? { trailParts } : {})}
      />,
    );

    expect(render()).toBe(render([]));
    expect(render()).toContain(NOTE_ONE);
    expect(render()).toContain(ANSWER);
  });

  it("builds the transcript from grouped runs rather than one card per message", () => {
    expect(transcriptSource).toContain("projectTranscriptRenderItems(");
    expect(transcriptSource).toContain("trailParts");
  });
});
