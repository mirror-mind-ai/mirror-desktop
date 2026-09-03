import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MessageContent,
  messageInlinePlainText,
  parseInlineTokens,
  parseMessageBlocks,
} from "../app/MessageContent";

describe("MessageContent rich rendering parser", () => {
  it("parses generic Markdown-style headings, lists, paragraphs, and code blocks", () => {
    const blocks = parseMessageBlocks([
      "## Summary",
      "A short paragraph.",
      "",
      "1. First step",
      "2. Second step",
      "",
      "- one risk",
      "- another risk",
      "",
      "```json",
      '{"safe": true}',
      "```",
    ].join("\n"));

    expect(blocks).toEqual([
      { type: "heading", level: 3, text: "Summary" },
      { type: "paragraph", text: "A short paragraph." },
      { type: "ordered_list", items: ["First step", "Second step"] },
      { type: "unordered_list", items: ["one risk", "another risk"] },
      { type: "code", language: "json", text: '{"safe": true}' },
    ]);
  });

  it("parses the reported Portuguese quoted draft into email-ready paragraphs", () => {
    const content = [
      "Segue uma sugestão:",
      "",
      "> Bom dia, Cleuzilene! Tudo bem?",
      ">",
      "> Muito obrigado por nos avisar.",
      ">",
      "> Verificamos aqui e corrigimos o link dos Slides da Aula 1 do curso Priorização Estratégica do Fluxo de Valor. Esse material já voltou a funcionar normalmente.",
      ">",
      "> Também verificamos o link “Liderança 360: Série Desvendando o Cynefin!”. Ele era um conteúdo externo da i9Flow e saiu do ar, então removemos esse item da lista de materiais do curso para evitar novos acessos quebrados.",
      ">",
      "> Obrigado novamente pelo aviso!",
    ].join("\n");

    expect(parseMessageBlocks(content)).toEqual([
      { type: "paragraph", text: "Segue uma sugestão:" },
      {
        type: "copy_ready_quote",
        paragraphs: [
          "Bom dia, Cleuzilene! Tudo bem?",
          "Muito obrigado por nos avisar.",
          "Verificamos aqui e corrigimos o link dos Slides da Aula 1 do curso Priorização Estratégica do Fluxo de Valor. Esse material já voltou a funcionar normalmente.",
          "Também verificamos o link “Liderança 360: Série Desvendando o Cynefin!”. Ele era um conteúdo externo da i9Flow e saiu do ar, então removemos esse item da lista de materiais do curso para evitar novos acessos quebrados.",
          "Obrigado novamente pelo aviso!",
        ],
        copyText: [
          "Bom dia, Cleuzilene! Tudo bem?",
          "Muito obrigado por nos avisar.",
          "Verificamos aqui e corrigimos o link dos Slides da Aula 1 do curso Priorização Estratégica do Fluxo de Valor. Esse material já voltou a funcionar normalmente.",
          "Também verificamos o link “Liderança 360: Série Desvendando o Cynefin!”. Ele era um conteúdo externo da i9Flow e saiu do ar, então removemos esse item da lista de materiais do curso para evitar novos acessos quebrados.",
          "Obrigado novamente pelo aviso!",
        ].join("\n\n"),
      },
    ]);
  });

  it("renders quoted drafts without markers and escapes untrusted HTML", () => {
    const html = renderToStaticMarkup(
      MessageContent({ content: "> Olá **equipe**\n>\n> <script>alert(1)</script>" }),
    );

    expect(html).toContain('class="message-copy-ready-block"');
    expect(html).toContain("<strong>equipe</strong>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("&gt; Olá");
    expect(html).toContain('aria-label="Copy draft text"');
    expect(html).toContain(">Copy text</span>");
    expect(messageInlinePlainText("Olá **equipe**, use `este texto`.")).toBe("Olá equipe, use este texto.");
  });

  it("keeps quote-only malformed input as inert text", () => {
    expect(parseMessageBlocks(">\n>")).toEqual([{ type: "paragraph", text: "> >" }]);
  });

  it("parses inline emphasis without evaluating HTML", () => {
    const tokens = parseInlineTokens("Use **strong**, *emphasis*, `code`, and <script>alert(1)</script>.");

    expect(tokens).toContainEqual({ type: "strong", text: "strong" });
    expect(tokens).toContainEqual({ type: "emphasis", text: "emphasis" });
    expect(tokens).toContainEqual({ type: "code", text: "code" });
    expect(tokens).toContainEqual({ type: "text", text: ", and <script>alert(1)</script>." });
  });
});
