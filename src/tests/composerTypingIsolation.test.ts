import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import inputSource from "../app/ComposerDraftInput.tsx?raw";

/**
 * The absence assertions below must read code, not prose. `ComposerDraftInput`'s own doc comment
 * explains the controlled-input history by naming `useState` and `value={text}`, which tripped this
 * guard on the first run — the guard working, on the wrong input.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const inputCode = withoutComments(inputSource);

/**
 * CR113: a keystroke must not re-render the application root.
 *
 * The Composer used to hold its text in `App` state, so every character reconciled the whole
 * non-memoized tree. Measured in a browser against the production-scale transcript, that cost
 * crossed a frame budget as soon as the non-memoized subtree reached a few hundred nodes, while
 * moving the text into the input leaf held flat at roughly 1.5 ms regardless of either the
 * subtree or the conversation size.
 */
describe("CR113 — Composer typing isolation", () => {
  it("keeps the visible draft text out of root state", () => {
    expect(appSource).not.toContain('const [draft, setDraft] = useState("")');
    expect(appSource).not.toContain("value={draft}");
    expect(appSource).not.toContain("draft.trim()");
    expect(appSource).toContain('const draftRef = useRef("")');
  });

  /**
   * Re-aimed by CR149, and the claim got stronger rather than weaker.
   *
   * CR113 asserted the text lives in a memoized leaf instead of the root, which kept a keystroke
   * from reconciling the whole tree. ~~`useState(initialText)`~~ was the expression of that, and it
   * left the input **controlled**: a character still waited for a React commit, just a small one.
   * The field showed that is enough to freeze typing whenever the main thread is saturated.
   *
   * So the invariant is no longer "the keystroke renders only the leaf" but **"the keystroke renders
   * nothing"** — which is what an uncontrolled textarea guarantees. Asserting the *absence* of state
   * in this component is strictly stronger than asserting where the state lives.
   */
  it("owns no typing state at all, so a keystroke renders nothing", () => {
    expect(inputSource).toContain("export const ComposerDraftInput = memo(");
    expect(inputCode).toContain("defaultValue={initialText}");
    // The two spellings that would make the textarea controlled again.
    expect(inputCode).not.toContain("useState");
    expect(inputCode).not.toContain("value={text}");
    // React must not be imported for state here either; only the imperative handle needs it.
    expect(inputCode).toContain("import { memo, useImperativeHandle,");
    expect(appSource).toContain("const composerDraftHandleRef = useRef<ComposerDraftHandle | null>(null)");
    expect(appSource).toContain("composerDraftHandleRef.current?.setText(text)");
  });

  /**
   * The programmatic path is the only writer left, and it has to reach the DOM rather than a
   * setter. If it ever went back through state, typing would start waiting on React again without
   * the controlled-value spellings above reappearing.
   */
  it("sets text programmatically by writing the element, not by setting state", () => {
    expect(inputCode).toContain("textarea.value = text");
    expect(inputCode).toContain("useImperativeHandle(handleRef, () => ({");
  });

  it("never stores the durable draft map in root state", () => {
    expect(appSource).not.toContain("setComposerDrafts(");
    expect(appSource).not.toContain("useState<ComposerDraftMap>");
    // Durability is unchanged: the ref is still scheduled through the coalesced writer.
    expect(appSource).toContain("composerDraftsRef.current = next");
    expect(appSource).toContain("composerDraftPersistence.schedule(next)");
  });

  it("reads the current text from the ref at the send and steering boundaries", () => {
    expect(appSource).toContain("const content = (retryContent ?? draftRef.current).trim()");
    expect(appSource).toContain("const text = draftRef.current.trim()");
  });

  it("keeps control enablement on a blank flag rather than on the text", () => {
    expect(appSource).toContain("const [draftBlank, setDraftBlank] = useState(true)");
    expect(appSource).toContain("disabled={draftBlank || selectedInvocationAdmissionBlocked");
    expect(appSource).toContain("setDraftBlank(!boundedText.trim())");
  });

  it("still sends on Enter and still steers an active turn, using the text it was given", () => {
    // CR149: read from the element, because there is no state to read.
    expect(inputSource).toContain('if (event.key === "Enter" && !event.shiftKey) onEnter(event.currentTarget.value, event)');
    expect(appSource).toContain("if (selectedCanSteer && text.trim()) {");
    expect(appSource).toContain("shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)");
  });
});
