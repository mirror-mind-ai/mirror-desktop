import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRef } from "react";
import { ComposerDraftInput, type ComposerDraftHandle } from "../app/ComposerDraftInput";

/**
 * CR149: the Composer textarea is uncontrolled, so a keystroke is painted by the browser and never
 * waits for a React commit.
 *
 * **The bound of this file, stated rather than implied.** This suite runs in Node with no DOM —
 * component tests here use `renderToStaticMarkup` — so *"a keystroke renders nothing"* cannot be
 * exercised. That claim is held by the source guards in `composerTypingIsolation.test.ts`, which
 * assert the absence of any state in the component and the presence of `defaultValue`. What this
 * file covers is the half that is reachable: that the uncontrolled wiring still produces the markup
 * the controlled version produced, which is where a silent regression would show up — a restored
 * draft rendering empty.
 */
const base = {
  textareaRef: createRef<HTMLTextAreaElement>(),
  handleRef: createRef<ComposerDraftHandle>(),
  ariaLabel: "Natural-language intention",
  placeholder: "Describe the intention",
  maxLength: 8_000,
  onTextChange: () => {},
  onBlur: () => {},
  onEnter: () => {},
};

describe("CR149: the uncontrolled Composer textarea", () => {
  it("still shows a draft that was restored before the input existed", () => {
    const html = renderToStaticMarkup(
      <ComposerDraftInput {...base} initialText="a draft that survived a reload" />,
    );
    expect(html).toContain("a draft that survived a reload");
  });

  it("renders an empty textarea when there is no draft", () => {
    const html = renderToStaticMarkup(<ComposerDraftInput {...base} initialText="" />);
    expect(html).toContain("<textarea");
    expect(html).toContain('aria-label="Natural-language intention"');
  });

  it("keeps the length cap on the element, which is where it already was", () => {
    const html = renderToStaticMarkup(<ComposerDraftInput {...base} initialText="" />);
    // Measured, not predicted: React 19's static renderer emits the camelCase attribute. My first
    // expectation here was the lowercased HTML spelling and it was wrong.
    expect(html).toContain('maxLength="8000"');
  });

  it("keeps the placeholder and the reload disable intact", () => {
    const open = renderToStaticMarkup(<ComposerDraftInput {...base} initialText="" />);
    expect(open).toContain('placeholder="Describe the intention"');
    expect(open).not.toContain("disabled");
    const closed = renderToStaticMarkup(<ComposerDraftInput {...base} initialText="" disabled />);
    expect(closed).toContain("disabled");
  });

  /**
   * A controlled textarea would emit a `value` attribute here. Its absence is the rendered
   * signature of the repair, which is a different witness from reading the source.
   */
  it("emits no value attribute, which is what a controlled textarea would do", () => {
    const html = renderToStaticMarkup(<ComposerDraftInput {...base} initialText="typed" />);
    expect(html).not.toContain('value="typed"');
    expect(html).toContain(">typed</textarea>");
  });
});
