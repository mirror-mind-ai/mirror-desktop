import { memo, useImperativeHandle, type KeyboardEvent, type RefObject } from "react";

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
 *
 * CR149: and now the textarea really does already show it.
 *
 * CR113 moved the state down but left the input **controlled** — `value={text}` over a local
 * `useState` — so a character still could not appear until React committed, just a smaller commit.
 * That is invisible until the main thread is saturated: while a long synchronous render is running,
 * no commit happens, keystrokes queue, and the characters arrive in a burst when it ends. The
 * Navigator reported exactly that shape four times — *"a digitação para de responder… só volta a
 * liberar o composer quando o finishing termina"* — and a profile of a `Finishing` showed 450 ms
 * script tasks in a row, which is long enough to feel like a freeze per phase.
 *
 * The textarea is now **uncontrolled**: the browser paints each character natively and React is not
 * involved in typing at all. This is the one repair in CR149 whose correctness does not depend on
 * being right about which code is slow — three earlier hypotheses about that were refuted by the
 * field. However heavy a render becomes, it can no longer delay a keystroke's appearance.
 *
 * What is deliberately unchanged: `App` still learns every change through `onTextChange`, so the
 * durable draft map and its coalesced persistence are exactly as before, and `maxLength` is still
 * enforced — by the DOM attribute, which is where it already was.
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
  // The programmatic path writes the DOM value directly. `App` already updates `draftRef` and the
  // blank flag itself at every call site of this handle, so nothing downstream is left stale.
  useImperativeHandle(handleRef, () => ({
    setText: (text: string) => {
      const textarea = textareaRef.current;
      if (textarea) textarea.value = text;
    },
  }), [textareaRef]);

  return (
    <textarea
      ref={textareaRef}
      aria-label={ariaLabel}
      defaultValue={initialText}
      maxLength={maxLength}
      onChange={(event) => {
        onTextChange(event.target.value);
      }}
      onBlur={onBlur}
      onKeyDown={(event) => {
        // Read from the element rather than from state, because there is no state to read.
        if (event.key === "Enter" && !event.shiftKey) onEnter(event.currentTarget.value, event);
      }}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
});
