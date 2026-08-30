import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useRef, useState } from "react";

type ClipboardWriter = (text: string) => Promise<void>;
type CopyResult = "copied" | "failed";
type CopyState = "idle" | CopyResult;

export async function copyMessageBody(body: string, writeClipboardText: ClipboardWriter = writeText): Promise<CopyResult> {
  try {
    await writeClipboardText(body);
    return "copied";
  } catch {
    return "failed";
  }
}

interface MessageCopyActionProps {
  body: string;
  writeClipboardText?: ClipboardWriter;
  resetAfterMs?: number;
}

export function MessageCopyAction({
  body,
  writeClipboardText = writeText,
  resetAfterMs = 2_000,
}: MessageCopyActionProps) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    const result = await copyMessageBody(body, writeClipboardText);
    setState(result);
    resetTimer.current = setTimeout(() => {
      setState("idle");
      resetTimer.current = null;
    }, resetAfterMs);
  };

  const accessibleLabel = state === "copied"
    ? "Message text copied"
    : state === "failed"
      ? "Copy message text failed; retry"
      : "Copy message text";

  const icon = state === "copied" ? (
    <path d="m5 12 4 4L19 6" />
  ) : state === "failed" ? (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ) : (
    <>
      <rect x="8" y="4" width="11" height="14" rx="2" />
      <path d="M16 18v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
    </>
  );

  return (
    <button
      type="button"
      className={`message-copy-action ${state !== "idle" ? `is-${state}` : ""}`.trim()}
      aria-label={accessibleLabel}
      aria-live="polite"
      title={accessibleLabel}
      onClick={() => { void handleCopy(); }}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        {icon}
      </svg>
    </button>
  );
}
