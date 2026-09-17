import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationRecoveryNotice } from "../app/ConversationRecoveryNotice";

const routes = [{
  id: "recover_preserved_response" as const,
  label: "Recover preserved response",
  consequence: "Projects the exact response already preserved in the durable turn journal.",
}, {
  id: "preserve_attempt_and_continue" as const,
  label: "Preserve attempt and continue",
  consequence: "Keeps the durable attempt evidence.",
}];

describe("Conversation recovery notice", () => {
  it("names each exact operation and its consequence without generic retry copy", () => {
    const html = renderToStaticMarkup(
      <ConversationRecoveryNotice
        title="Previous response is preserved"
        message="Choose one exact recovery operation."
        routes={routes}
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain("Recover preserved response");
    expect(html).toContain("Projects the exact response");
    expect(html).toContain("Preserve attempt and continue");
    expect(html).not.toContain("Try again");
    expect(html).not.toMatch(/>Retry</);
  });

  it("shows operation-specific progress and a bounded failure", () => {
    const html = renderToStaticMarkup(
      <ConversationRecoveryNotice
        title="Previous response is preserved"
        message="Choose one exact recovery operation."
        routes={routes}
        activeRoute="recover_preserved_response"
        error="Recover preserved response failed. Durable evidence remains preserved."
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain("Recover preserved response…");
    expect(html).toContain("Durable evidence remains preserved");
    expect(html).toContain('role="alert"');
  });
});
