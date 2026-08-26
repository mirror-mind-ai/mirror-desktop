import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationAuthorityNotice } from "../app/ConversationAuthorityNotice";

describe("ConversationAuthorityNotice", () => {
  it("offers explicit reload while an imported conversation has no baseline", () => {
    const html = renderToStaticMarkup(
      <ConversationAuthorityNotice
        classification="uninitialized"
        checking={false}
        onReview={() => undefined}
      />,
    );

    expect(html).toContain("Conversation not synchronized");
    expect(html).toContain("canonical Pi and Mirror baseline");
    expect(html).toContain("Review and reload");
    expect(html).not.toContain("disabled");
  });

  it("keeps reload inert while canonical inspection is running", () => {
    const html = renderToStaticMarkup(
      <ConversationAuthorityNotice
        classification="mirror_advanced"
        checking
        onReview={() => undefined}
      />,
    );

    expect(html).toContain("Checking the linked Pi session");
    expect(html).toContain('disabled=""');
  });
});
