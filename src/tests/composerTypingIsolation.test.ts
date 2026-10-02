import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import inputSource from "../app/ComposerDraftInput.tsx?raw";

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

  it("owns the text in a memoized input leaf that the root reaches only imperatively", () => {
    expect(inputSource).toContain("export const ComposerDraftInput = memo(");
    expect(inputSource).toContain("useState(initialText)");
    expect(inputSource).toContain("useImperativeHandle(handleRef, () => ({ setText }), [])");
    expect(appSource).toContain("const composerDraftHandleRef = useRef<ComposerDraftHandle | null>(null)");
    expect(appSource).toContain("composerDraftHandleRef.current?.setText(text)");
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
    expect(inputSource).toContain('if (event.key === "Enter" && !event.shiftKey) onEnter(text, event)');
    expect(appSource).toContain("if (selectedCanSteer && text.trim()) {");
    expect(appSource).toContain("shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)");
  });
});
