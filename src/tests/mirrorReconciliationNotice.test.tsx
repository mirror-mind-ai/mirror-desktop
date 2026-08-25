import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MirrorReconciliationNotice } from "../app/MirrorReconciliationNotice";
import type { MirrorReconciliationReview } from "../domain/mirrorOnlyReconciliation";
import appSource from "../app/App.tsx?raw";

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
  it("blocks new invocations while reconciliation needs attention", () => {
    expect(appSource).toContain('!["uninitialized", "in_sync"].includes(conversation.reconciliation.classification)');
    expect(appSource).toContain("reconciliationBlocksInvocation || providerErrors.length > 0");
  });

  it("renders an inert bounded preview with an explicit eligible action", () => {
    const html = renderToStaticMarkup(createElement(MirrorReconciliationNotice, {
      review: eligible, disabled: false, onApply: () => undefined,
    }));
    expect(html).toContain("Mirror has newer conversation turns");
    expect(html).toContain("new fact");
    expect(html).toContain("Create reconciled Pi branch");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("offers an explicit human-reviewed convergence action for independent advancement", () => {
    const html = renderToStaticMarkup(createElement(MirrorReconciliationNotice, {
      review: { ...eligible, status: "conflicted", reasonCode: "independent_pi_advancement" },
      disabled: false, onApply: () => undefined,
    }));
    expect(html).toContain("Pi and Mirror advanced independently");
    expect(html).toContain("Create reviewed convergence branch");
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
