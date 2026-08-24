import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MirrorReconciliationNotice } from "../app/MirrorReconciliationNotice";
import type { MirrorReconciliationReview } from "../domain/mirrorOnlyReconciliation";

const eligible: MirrorReconciliationReview = {
  status: "eligible",
  fingerprint: { conversationId: "mirror-conversation", messageCount: 4, lastMessageId: "a" },
  completeTurnCount: 1,
  messages: [
    { id: "u", role: "user", content: "new fact", createdAt: "now" },
    { id: "a", role: "assistant", content: "accepted", createdAt: "later" },
  ],
};

describe("Mirror reconciliation notice", () => {
  it("renders an inert bounded preview with an explicit eligible action", () => {
    const html = renderToStaticMarkup(createElement(MirrorReconciliationNotice, {
      review: eligible, disabled: false, onApply: () => undefined,
    }));
    expect(html).toContain("Mirror has newer conversation turns");
    expect(html).toContain("new fact");
    expect(html).toContain("Create reconciled Pi branch");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("offers no apply action for unsupported observations", () => {
    const html = renderToStaticMarkup(createElement(MirrorReconciliationNotice, {
      review: { ...eligible, status: "unsupported", reasonCode: "truncated" },
      disabled: false, onApply: () => undefined,
    }));
    expect(html).toContain("Reconciliation unavailable: truncated");
    expect(html).not.toContain("Create reconciled Pi branch");
  });
});
