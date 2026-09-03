import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import {
  MessageContent,
  messageInlinePlainText,
  parseInlineTokens,
  parseMessageBlocks,
} from "../app/MessageContent";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

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

  it("parses canonical Markdown tables with declared column alignment", () => {
    expect(parseMessageBlocks([
      "Antes da tabela.",
      "",
      "| Episódio | Program ID | Vimeo ID | Título |",
      "|---|---:|:---:|---|",
      "| 3 | 6939 | 1174216449 | Versão Full |",
      "| 4 | 7140 | 1176290947 | Versão Full |",
      "",
      "Depois da tabela.",
    ].join("\n"))).toEqual([
      { type: "paragraph", text: "Antes da tabela." },
      {
        type: "table",
        headers: ["Episódio", "Program ID", "Vimeo ID", "Título"],
        alignments: ["left", "right", "center", "left"],
        rows: [
          ["3", "6939", "1174216449", "Versão Full"],
          ["4", "7140", "1176290947", "Versão Full"],
        ],
      },
      { type: "paragraph", text: "Depois da tabela." },
    ]);
  });

  it("recovers the reported provider-compacted table without guessing at ordinary pipes", () => {
    const compact = "Episódio | Program ID | Vimeo ID | Título | |---|---:|---:|---| | 3 | 6939 | 1174216449 | Versão Full | | 4 | 7140 | 1176290947 | Versão Full | | 5 | 7175 | 1178565695 | Versão Full |";
    expect(parseMessageBlocks(compact)).toEqual([{
      type: "table",
      headers: ["Episódio", "Program ID", "Vimeo ID", "Título"],
      alignments: ["left", "right", "right", "left"],
      rows: [
        ["3", "6939", "1174216449", "Versão Full"],
        ["4", "7140", "1176290947", "Versão Full"],
        ["5", "7175", "1178565695", "Versão Full"],
      ],
    }]);

    expect(parseMessageBlocks("Use alpha | beta in ordinary prose.")).toEqual([
      { type: "paragraph", text: "Use alpha | beta in ordinary prose." },
    ]);
    expect(parseMessageBlocks("A | B\n--|---\n1 | 2")).toEqual([
      { type: "paragraph", text: "A | B --|--- 1 | 2" },
    ]);
  });

  it("bounds table shape and renders safe semantic markup", () => {
    const oversizedHeader = Array.from({ length: 17 }, (_, index) => `H${index}`).join(" | ");
    const oversizedDelimiter = Array.from({ length: 17 }, () => "---").join(" | ");
    expect(parseMessageBlocks(`${oversizedHeader}\n${oversizedDelimiter}\n${oversizedHeader}`)).toEqual([
      { type: "paragraph", text: `${oversizedHeader} ${oversizedDelimiter} ${oversizedHeader}` },
    ]);

    const html = renderToStaticMarkup(MessageContent({
      content: "Name | Value\n---|---:\n<script> | **safe**",
    }));
    expect(html).toContain('class="message-table-scroll"');
    expect(html).toContain("<table>");
    expect(html).toContain('<th scope="col" style="text-align:left">Name</th>');
    expect(html).toContain('<th scope="col" style="text-align:right">Value</th>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong>safe</strong>");
    expect(html).not.toContain("<script>");
    expect(cssSource).toContain(".message-table-scroll");
    expect(cssSource).toContain("overflow-x: auto");
    expect(cssSource).toContain("background: var(--light-surface)");
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

  it("recovers paragraph boundaries from compact inline quote separators", () => {
    expect(parseMessageBlocks("> Primeiro parágrafo. > > Segundo parágrafo. > > Terceiro parágrafo.")).toEqual([
      {
        type: "copy_ready_quote",
        paragraphs: ["Primeiro parágrafo.", "Segundo parágrafo.", "Terceiro parágrafo."],
        copyText: "Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro parágrafo.",
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
