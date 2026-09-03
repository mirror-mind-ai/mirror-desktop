import type { ReactNode } from "react";
import { parseInlineTokens, parseMessageBlocks, type MessageBlock } from "./MessageContent";

export function ArtifactMarkdown({ content }: { content: string }) {
  return (
    <div className="artifact-markdown">
      {parseMessageBlocks(content).map((block, index) => renderArtifactBlock(block, index))}
    </div>
  );
}

function renderArtifactBlock(block: MessageBlock, index: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const Heading = block.level === 2 ? "h2" : "h3";
      return <Heading key={index}>{renderArtifactInline(block.text)}</Heading>;
    }
    case "unordered_list":
      return (
        <ul key={index}>
          {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderArtifactInline(item)}</li>)}
        </ul>
      );
    case "ordered_list":
      return (
        <ol key={index}>
          {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderArtifactInline(item)}</li>)}
        </ol>
      );
    case "code":
      return <pre className="artifact-markdown-code" key={index}><code>{block.text}</code></pre>;
    case "copy_ready_quote":
      return (
        <blockquote className="artifact-markdown-blockquote" key={index}>
          {block.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>{renderArtifactInline(paragraph)}</p>
          ))}
        </blockquote>
      );
    case "table":
      return (
        <div className="artifact-markdown-table-scroll" key={index}>
          <table>
            <thead>
              <tr>
                {block.headers.map((header, columnIndex) => (
                  <th scope="col" style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>
                    {renderArtifactInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, columnIndex) => (
                    <td style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>
                      {renderArtifactInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "paragraph":
      return <p key={index}>{renderArtifactInline(block.text)}</p>;
  }
}

function renderArtifactInline(text: string): ReactNode[] {
  return parseInlineTokens(text).map((token, index) => {
    switch (token.type) {
      case "strong":
        return <strong key={index}>{token.text}</strong>;
      case "emphasis":
        return <em key={index}>{token.text}</em>;
      case "code":
        return <code key={index}>{token.text}</code>;
      case "text":
        return token.text;
    }
  });
}
