import { invoke } from "@tauri-apps/api/core";
import type { ReactNode } from "react";

type LinkifiedTextPart =
  | { type: "text"; text: string }
  | { type: "url"; text: string; href: string }
  | { type: "local_path"; text: string };

const linkPattern = /(https?:\/\/[^\s<>()]+|(?:\/[\w .@~+-][^\s<>()]*|(?:\.\.?\/)?(?:docs|src|scripts|src-tauri|agentic-method|agentic-protocol|mirror-extension|harness|artifacts)\/[^\s<>()]+|(?:[\w.@~+-]+\/)+[\w .@~+-]+\.[A-Za-z0-9]+|[\w.@~+-]+\.(?:md|yml|yaml|html|json|ts|tsx|py|rs|toml|css)))/g;
const trailingPunctuationPattern = /[.,;:!?\]]+$/;

export function parseLinkifiedText(text: string): LinkifiedTextPart[] {
  const parts: LinkifiedTextPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    const rawMatch = match[0];
    const trimmedMatch = rawMatch.replace(trailingPunctuationPattern, "");
    const trailing = rawMatch.slice(trimmedMatch.length);

    if (match.index > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, match.index) });
    }

    if (trimmedMatch.startsWith("http://") || trimmedMatch.startsWith("https://")) {
      parts.push({ type: "url", text: trimmedMatch, href: trimmedMatch });
    } else {
      parts.push({ type: "local_path", text: trimmedMatch });
    }

    if (trailing) {
      parts.push({ type: "text", text: trailing });
    }

    cursor = match.index + rawMatch.length;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: "text", text }];
}

export function LinkifiedText({ text, basePath }: { text: string; basePath?: string }) {
  return <>{renderLinkifiedText(text, basePath)}</>;
}

export function renderLinkifiedText(text: string, basePath?: string): ReactNode[] {
  return parseLinkifiedText(text).map((part, index) => {
    if (part.type === "url") {
      return (
        <a key={index} href={part.href} target="_blank" rel="noreferrer" className="inline-link">
          {part.text}
        </a>
      );
    }

    if (part.type === "local_path") {
      return (
        <a
          key={index}
          href="#"
          className="inline-link inline-local-path"
          onClick={(event) => {
            event.preventDefault();
            void invoke("open_local_reference", { path: part.text, basePath });
          }}
          title="Open local path"
        >
          {part.text}
        </a>
      );
    }

    return part.text;
  });
}
