import { memo, useImperativeHandle, useState, type KeyboardEvent, type RefObject } from "react";

/**
 * CR113: the Composer's text lives here rather than in `App`.
 *
 * A keystroke used to set state on the root component, so every character re-rendered the whole
 * application tree and reconciled every non-memoized child — the Journey sidebar, the header, the
 * composer footer and the operational surfaces. Measured in a browser against the production-scale
 * transcript, that cost crossed a frame budget once the non-memoized subtree reached a few hundred
 * nodes, while the transcript itself stayed insulated behind its own memo boundary.
 *
 * `App` keeps authority over the text: it owns the durable draft map, reads the current value from
 * its own ref at send and steering boundaries, and pushes text in through the imperative handle.
 * What it no longer does is re-render itself to show a character the textarea already shows.
 */
export type ComposerDraftHandle = {
  /** Replace the visible text, for restore, destination change, voice, prefill and clearing. */
  setText: (text: string) => void;
};

type ComposerDraftInputProps = {
  handleRef: RefObject<ComposerDraftHandle | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Read once, on mount, so a draft restored before this input existed is not lost. */
  initialText: string;
  ariaLabel: string;
  placeholder: string;
  maxLength: number;
  disabled?: boolean;
  /** Every change, so the durable draft map and its coalesced persistence stay current. */
  onTextChange: (text: string) => void;
  onBlur: () => void;
  /** Enter without Shift; the current text travels with it so no caller re-reads state. */
  onEnter: (text: string, event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const ComposerDraftInput = memo(function ComposerDraftInput({
  handleRef,
  textareaRef,
  initialText,
  ariaLabel,
  placeholder,
  maxLength,
  disabled,
  onTextChange,
  onBlur,
  onEnter,
}: ComposerDraftInputProps) {
  const [text, setText] = useState(initialText);

  useImperativeHandle(handleRef, () => ({ setText }), []);

  return (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      value={text}
      maxLength={maxLength}
      onChange={(event) => {
        setText(event.target.value);
        onTextChange(event.target.value);
      }}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) onEnter(text, event);
      }}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
});
