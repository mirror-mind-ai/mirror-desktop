import type { ReactNode } from "react";
import { LinkifiedText } from "./LinkifiedText";
import { MessageCopyAction, type MessageCopyLabels } from "./MessageCopyAction";

type TableAlignment = "left" | "center" | "right";

type TableBlock = {
  type: "table";
  headers: string[];
  alignments: TableAlignment[];
  rows: string[][];
};

export type MessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }
  | { type: "code"; language?: string; text: string }
  | { type: "copy_ready_quote"; paragraphs: string[]; copyText: string }
  | TableBlock;

const MAX_TABLE_COLUMNS = 16;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_CELL_LENGTH = 2_048;

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "code"; text: string };

const draftCopyLabels: MessageCopyLabels = {
  idle: "Copy draft text",
  copied: "Draft text copied",
  failed: "Copy draft text failed; retry",
};

export function MessageContent({
  content,
  basePath,
  onLocalPathClick,
  preserveParagraphLineBreaks = false,
}: {
  content: string;
  basePath?: string;
  onLocalPathClick?: (path: string) => void;
  preserveParagraphLineBreaks?: boolean;
}) {
  const blocks = parseMessageBlocks(content, { preserveParagraphLineBreaks });

  return (
    <div className={`message-content${preserveParagraphLineBreaks ? " preserve-line-breaks" : ""}`}>
      {blocks.map((block, index) => renderBlock(block, index, basePath, onLocalPathClick))}
    </div>
  );
}

function parseTableCells(line: string): string[] | undefined {
  const source = line.trim();
  if (!source.includes("|")) return undefined;

  const cells: string[] = [];
  let cell = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\\" && source[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());

  if (source.startsWith("|")) cells.shift();
  if (source.endsWith("|")) cells.pop();
  if (
    cells.length < 2
    || cells.length > MAX_TABLE_COLUMNS
    || cells.some((value) => value.length > MAX_TABLE_CELL_LENGTH)
  ) return undefined;
  return cells;
}

function parseTableAlignments(cells: string[]): TableAlignment[] | undefined {
  const alignments: TableAlignment[] = [];
  for (const cell of cells) {
    const delimiter = cell.match(/^(:)?-{3,}(:)?$/);
    if (!delimiter) return undefined;
    alignments.push(delimiter[1] && delimiter[2] ? "center" : delimiter[2] ? "right" : "left");
  }
  return alignments;
}

function createTableBlock(headerLine: string, delimiterLine: string, rowLines: string[]): TableBlock | undefined {
  const headers = parseTableCells(headerLine);
  const delimiters = parseTableCells(delimiterLine);
  if (!headers || !delimiters || headers.length !== delimiters.length || headers.some((header) => !header)) {
    return undefined;
  }
  const alignments = parseTableAlignments(delimiters);
  if (!alignments || rowLines.length < 1 || rowLines.length > MAX_TABLE_ROWS) return undefined;

  const rows: string[][] = [];
  for (const rowLine of rowLines) {
    const row = parseTableCells(rowLine);
    if (!row || row.length !== headers.length) return undefined;
    rows.push(row);
  }
  return { type: "table", headers, alignments, rows };
}

function parseCanonicalTable(lines: string[], start: number): { block: TableBlock; nextIndex: number } | undefined {
  if (start + 2 >= lines.length) return undefined;
  const headers = parseTableCells(lines[start]);
  const delimiters = parseTableCells(lines[start + 1]);
  if (!headers || !delimiters || headers.length !== delimiters.length || !parseTableAlignments(delimiters)) {
    return undefined;
  }

  const rowLines: string[] = [];
  let nextIndex = start + 2;
  while (nextIndex < lines.length && lines[nextIndex].trim()) {
    const row = parseTableCells(lines[nextIndex]);
    if (!row || row.length !== headers.length) break;
    rowLines.push(lines[nextIndex]);
    nextIndex += 1;
  }
  const block = createTableBlock(lines[start], lines[start + 1], rowLines);
  return block ? { block, nextIndex } : undefined;
}

function parseCompactTable(line: string): TableBlock | undefined {
  const rowLines = line.split(/\|\s+\|/);
  if (rowLines.length < 3 || rowLines.length > MAX_TABLE_ROWS + 2) return undefined;
  return createTableBlock(rowLines[0], rowLines[1], rowLines.slice(2));
}

export function parseMessageBlocks(
  content: string,
  options: { preserveParagraphLineBreaks?: boolean } = {},
): MessageBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];
  let index = 0;

  function flushParagraph() {
    const text = paragraph.join(options.preserveParagraphLineBreaks ? "\n" : " ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraph = [];
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```([^`]*)$/);
    if (fence) {
      flushParagraph();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: "code", language: fence[1]?.trim() || undefined, text: codeLines.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1].length === 1 ? 2 : 3, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const canonicalTable = parseCanonicalTable(lines, index);
    if (canonicalTable) {
      flushParagraph();
      blocks.push(canonicalTable.block);
      index = canonicalTable.nextIndex;
      continue;
    }

    const compactTable = parseCompactTable(trimmed);
    if (compactTable) {
      flushParagraph();
      blocks.push(compactTable);
      index += 1;
      continue;
    }

    if (/^>/.test(trimmed)) {
      flushParagraph();
      const quotedParagraphs: string[] = [];
      const quotedLines: string[] = [];
      const rawQuotedLines: string[] = [];

      function flushQuotedParagraph() {
        const text = quotedLines.join(" ").trim();
        if (text) quotedParagraphs.push(text);
        quotedLines.length = 0;
      }

      while (index < lines.length) {
        const rawQuotedLine = lines[index].trim();
        const quote = rawQuotedLine.match(/^>\s?(.*)$/);
        if (!quote) break;
        rawQuotedLines.push(rawQuotedLine);
        const quotedText = quote[1].trim();
        if (!quotedText) {
          flushQuotedParagraph();
        } else {
          quotedText.split(/\s+>\s*>\s+/).forEach((segment, segmentIndex) => {
            if (segmentIndex > 0) flushQuotedParagraph();
            const text = segment.trim();
            if (text) quotedLines.push(text);
          });
        }
        index += 1;
      }
      flushQuotedParagraph();

      if (quotedParagraphs.length > 0) {
        blocks.push({
          type: "copy_ready_quote",
          paragraphs: quotedParagraphs,
          copyText: quotedParagraphs.map(messageInlinePlainText).join("\n\n"),
        });
      } else {
        paragraph.push(...rawQuotedLines);
      }
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^[-*]\s+(.+)$/);
        if (!item) {
          break;
        }
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ type: "unordered_list", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!item) {
          break;
        }
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ type: "ordered_list", items });
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: content }];
}

export function messageInlinePlainText(text: string): string {
  return parseInlineTokens(text).map((token) => token.text).join("");
}

export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: "text", text: text.slice(cursor, match.index) });
    }
    if (match[2]) {
      tokens.push({ type: "strong", text: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "emphasis", text: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "code", text: match[4] });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ type: "text", text: text.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", text }];
}

function renderBlock(
  block: MessageBlock,
  index: number,
  basePath?: string,
  onLocalPathClick?: (path: string) => void,
) {
  switch (block.type) {
    case "heading": {
      const Heading = block.level === 2 ? "h2" : "h3";
      return <Heading key={index}>{renderInline(block.text, basePath, onLocalPathClick)}</Heading>;
    }
    case "unordered_list":
      return (
        <ul key={index}>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item, basePath, onLocalPathClick)}</li>
          ))}
        </ul>
      );
    case "ordered_list":
      return (
        <ol key={index}>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item, basePath, onLocalPathClick)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre key={index} className="message-code-block">
          <code><LinkifiedText text={block.text} basePath={basePath} onLocalPathClick={onLocalPathClick} /></code>
        </pre>
      );
    case "copy_ready_quote":
      return (
        <blockquote key={index} className="message-copy-ready-block">
          <div className="message-copy-ready-prose">
            {block.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{renderInline(paragraph, basePath, onLocalPathClick)}</p>
            ))}
          </div>
          <MessageCopyAction
            body={block.copyText}
            labels={draftCopyLabels}
            className="message-copy-ready-action"
            visibleLabel="Copy text"
          />
        </blockquote>
      );
    case "table":
      return (
        <div className="message-table-scroll" key={index}>
          <table>
            <thead>
              <tr>
                {block.headers.map((header, columnIndex) => (
                  <th scope="col" style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>
                    {renderInline(header, basePath, onLocalPathClick)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, columnIndex) => (
                    <td style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>
                      {renderInline(cell, basePath, onLocalPathClick)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "paragraph":
      return <p key={index}>{renderInline(block.text, basePath, onLocalPathClick)}</p>;
  }
}

function renderInline(
  text: string,
  basePath?: string,
  onLocalPathClick?: (path: string) => void,
): ReactNode[] {
  return parseInlineTokens(text).map((token, index) => {
    switch (token.type) {
      case "strong":
        return <strong key={index}>{token.text}</strong>;
      case "emphasis":
        return <em key={index}>{token.text}</em>;
      case "code":
        return <code key={index}><LinkifiedText text={token.text} basePath={basePath} onLocalPathClick={onLocalPathClick} /></code>;
      case "text":
        return <LinkifiedText key={index} text={token.text} basePath={basePath} onLocalPathClick={onLocalPathClick} />;
    }
  });
}
