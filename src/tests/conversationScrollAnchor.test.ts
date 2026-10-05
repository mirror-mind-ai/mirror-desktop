import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import {
  conversationScrollAnchorCorrection,
  selectConversationScrollAnchor,
} from "../app/conversationScrollAnchor";

// Offsets are relative to the top of the visible scroller, so a negative top is a message the
// reader has already scrolled partway past.
const at = (messageId: string, top: number, height: number) =>
  ({ messageId, top, bottom: top + height });

describe("CR125: choosing what the reader is looking at", () => {
  it("anchors on the topmost message still at least partly in view", () => {
    const anchor = selectConversationScrollAnchor([
      at("m1", -900, 400),
      at("m2", -120, 300),
      at("m3", 180, 300),
    ]);
    // m2 straddles the top edge, so it is the first thing the reader can actually see.
    expect(anchor).toEqual({ messageId: "m2", viewportOffset: -120 });
  });

  it("ignores every message that has scrolled entirely above the viewport", () => {
    const anchor = selectConversationScrollAnchor([
      at("m1", -800, 300),
      at("m2", -400, 300),
      at("m3", 40, 300),
    ]);
    expect(anchor).toEqual({ messageId: "m3", viewportOffset: 40 });
  });

  it("has nothing to anchor when no message is measurable", () => {
    expect(selectConversationScrollAnchor([])).toBeUndefined();
  });

  it("has nothing to anchor when the whole transcript sits above the viewport", () => {
    // Possible for one commit while a shrinking transcript is still being clamped.
    expect(selectConversationScrollAnchor([at("m1", -500, 200)])).toBeUndefined();
  });
});

describe("CR125: correcting the travel a settling turn caused", () => {
  const anchor = { messageId: "m2", viewportOffset: 50 };

  it("reports the distance the anchored message travelled upward", () => {
    // The reported defect: the previous turn collapses by 500px above the reader, so the content
    // under their eyes moves up while scrollTop stays where it was.
    const correction = conversationScrollAnchorCorrection(anchor, [at("m2", -450, 300)]);
    // Applied as `scrollTop += correction`, this puts the message back at +50.
    expect(correction).toBe(-500);
  });

  it("reports travel downward just as readily", () => {
    // Height can be added above too — an opened disclosure, an arriving correction.
    expect(conversationScrollAnchorCorrection(anchor, [at("m2", 260, 300)])).toBe(210);
  });

  it("corrects nothing when the reader's place did not move", () => {
    expect(conversationScrollAnchorCorrection(anchor, [at("m2", 50, 300)])).toBeUndefined();
  });

  it("ignores sub-pixel travel rather than fighting layout rounding", () => {
    expect(conversationScrollAnchorCorrection(anchor, [at("m2", 50.4, 300)])).toBeUndefined();
  });

  it("declines to guess when the anchored message is gone", () => {
    // An interrupted turn can drop its answer. Leaving the reader where they are is honest;
    // anchoring onto a different message would move them somewhere they never chose.
    expect(conversationScrollAnchorCorrection(anchor, [at("m1", 10, 300), at("m3", 400, 300)]))
      .toBeUndefined();
  });
});

// The recurring failure in this codebase is a correct domain rule wired into the wrong place, so the
// rule above is worth little without these.
describe("CR125: the Conversation surface wiring", () => {
  const anchorEffect = appSource.slice(
    appSource.indexOf("// CR125:"),
    appSource.indexOf("}, [messages, isStreaming]);"),
  );

  it("applies the correction before paint, not after it", () => {
    // In a useEffect the reader would see the displacement and then see it undone, which is the
    // flicker CR024 spent a whole investigation removing.
    expect(anchorEffect).toContain("useLayoutEffect(() => {");
    expect(appSource).toContain("useLayoutEffect,");
  });

  it("leaves a reader who is following the end to follow-the-end", () => {
    expect(anchorEffect).toContain("chatAutoFollowRef.current");
  });

  it("does no measuring while the turn is still streaming", () => {
    // The live turn grows below the reader, so there is nothing to correct, and measuring on every
    // chunk is exactly the cost CR029 and CR113 were about.
    expect(anchorEffect).toContain("isStreaming");
  });

  it("records where the reader is when the reader says so", () => {
    const scrollHandler = appSource.slice(
      appSource.indexOf("onScroll={(event) => {"),
      appSource.indexOf("setConversationAwayFromEnd(!isConversationNearBottom(metrics));"),
    );
    expect(scrollHandler).toContain("selectConversationScrollAnchor(");
  });

  it("applies the correction to the Conversation scroller itself", () => {
    expect(anchorEffect).toContain("scrollTop +=");
  });
});
