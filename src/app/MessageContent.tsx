import type { ReactNode } from "react";
import { LinkifiedText } from "./LinkifiedText";

type MessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }
  | { type: "code"; language?: string; text: string };

type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "emphasis"; text: string }
  | { type: "code"; text: string };

export function MessageContent({
  content,
  basePath,
  onLocalPathClick,
}: {
  content: string;
  basePath?: string;
  onLocalPathClick?: (path: string) => void;
}) {
  const blocks = parseMessageBlocks(content);

  return (
    <div className="message-content">
      {blocks.map((block, index) => renderBlock(block, index, basePath, onLocalPathClick))}
    </div>
  );
}

export function parseMessageBlocks(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];
  let index = 0;

  function flushParagraph() {
    const text = paragraph.join(" ").trim();
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
