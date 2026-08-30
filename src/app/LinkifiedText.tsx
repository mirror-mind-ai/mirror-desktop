import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export type LinkifiedTextPart =
  | { type: "text"; text: string }
  | { type: "url"; text: string; href: string }
  | { type: "local_path_candidate"; text: string }
  | { type: "local_path"; text: string };

const linkPattern = /(https?:\/\/[^\s<>()]+|(?<![\w])\/[\w .@~+-][^\s<>()]*|(?:\.\.?\/)?(?:docs|src|scripts|src-tauri|agentic-method|agentic-protocol|mirror-extension|harness|artifacts)\/[^\s<>()]+|(?:[\w.@~+-]+\/)+[\w .@~+-]+\.[A-Za-z0-9]+|[\w.@~+-]+\.(?:md|yml|yaml|html|json|ts|tsx|py|rs|toml|css))/g;
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
      parts.push({ type: "local_path_candidate", text: trimmedMatch });
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

export function applyVerifiedLocalPaths(
  parts: LinkifiedTextPart[],
  verifiedPaths: ReadonlySet<string>,
): LinkifiedTextPart[] {
  return parts.map((part) => {
    if (part.type !== "local_path_candidate") return part;
    return verifiedPaths.has(part.text)
      ? { type: "local_path", text: part.text }
      : { type: "text", text: part.text };
  });
}

export function LinkifiedText({ text, basePath }: { text: string; basePath?: string }) {
  const parsedParts = useMemo(() => parseLinkifiedText(text), [text]);
  const candidates = useMemo(() => [...new Set(parsedParts
    .filter((part): part is Extract<LinkifiedTextPart, { type: "local_path_candidate" }> => part.type === "local_path_candidate")
    .map((part) => part.text))], [parsedParts]);
  const [verifiedPaths, setVerifiedPaths] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setVerifiedPaths(new Set());
    if (candidates.length === 0) return () => { cancelled = true; };

    void invoke<string[]>("inspect_local_references", { paths: candidates, basePath })
      .then((paths) => {
        if (!cancelled) setVerifiedPaths(new Set(paths));
      })
      .catch(() => {
        if (!cancelled) setVerifiedPaths(new Set());
      });

    return () => { cancelled = true; };
  }, [basePath, candidates]);

  return <>{renderLinkifiedText(applyVerifiedLocalPaths(parsedParts, verifiedPaths), basePath)}</>;
}

export function renderLinkifiedText(parts: LinkifiedTextPart[], basePath?: string): ReactNode[] {
  return parts.map((part, index) => {
    if (part.type === "url") {
      return (
        <a
          key={index}
          href={part.href}
          className="inline-link"
          onClick={(event) => {
            event.preventDefault();
            void invoke("open_external_url", { url: part.href });
          }}
          title="Open external URL"
        >
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
