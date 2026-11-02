import { describe, expect, it } from "vitest";
import { parseMessageBlocks } from "../app/MessageContent";

// CR179: GitHub-flavoured Markdown asks a delimiter cell for one hyphen or more; the reader asked
// for three, so a model's `|--:|` table was drawn as one paragraph of pipes.

const typesOf = (content: string) => parseMessageBlocks(content).map((block) => block.type);

describe("a table delimiter", () => {
  it("is one hyphen or more, with an optional colon on either side", () => {
    for (const delimiter of ["| - | - |", "|:-|-:|", "|:-:|---|", "|--:|----|", "| :---: | --- |"]) {
      expect(typesOf(`| # | CR |\n${delimiter}\n| 1 | x |`), delimiter).toEqual(["table"]);
    }
    const [table] = parseMessageBlocks("| a | b | c |\n|:-|-:|:-:|\n| 1 | 2 | 3 |");
    expect(table).toMatchObject({ type: "table", alignments: ["left", "right", "center"] });
  });

  it("is not a colon alone, text, or hyphens with a space between them", () => {
    for (const delimiter of ["|:|:|", "| a | b |", "| - - | - |"]) {
      expect(typesOf(`| # | CR |\n${delimiter}\n| 1 | x |`), delimiter).not.toContain("table");
    }
  });

  it("reads the RS026 queue answer of 2026-11-02 as a table, and the text after it apart", () => {
    const answer = [
      "| # | CR | Status | O que é |",
      "|--:|----|--------|---------|",
      "| 1 | **CR166** (RS025) | 🟡 metade feita | O botão não fazia nada. |",
      "| 3c2 | **CR177** | ⚪ captured | As skills `mm-*` chamam a CLI `mirror`. |",
      "",
      "Fora da fila, à espera.",
    ].join("\n");
    const blocks = parseMessageBlocks(answer);
    expect(blocks.map((block) => block.type)).toEqual(["table", "paragraph"]);
    expect(blocks[0]).toMatchObject({ rows: [expect.any(Array), expect.any(Array)] });
  });

  it("is read the same way when the table arrives on one line", () => {
    expect(typesOf("| # | CR | |--:|---| | 1 | x |")).toEqual(["table"]);
  });
});
