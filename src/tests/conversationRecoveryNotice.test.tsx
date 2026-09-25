import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationRecoveryNotice } from "../app/ConversationRecoveryNotice";

const routes = [{
  id: "retry_mirror_sync" as const,
  label: "Retry Mirror synchronization",
  consequence: "Retries durable Mirror delivery without running the agent again.",
}, {
  id: "start_new_conversation" as const,
  label: "Start new Conversation",
  consequence: "Creates a separate local Conversation without changing this one.",
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
    expect(html).toContain("Retry Mirror synchronization");
    expect(html).toContain("Retries durable Mirror delivery");
    expect(html).toContain("Start new Conversation");
    expect(html).not.toContain("Try again");
    expect(html).not.toMatch(/>Retry</);
  });

  it("shows operation-specific progress and a bounded failure", () => {
    const html = renderToStaticMarkup(
      <ConversationRecoveryNotice
        title="Previous response is preserved"
        message="Choose one exact recovery operation."
        routes={routes}
        activeRoute="retry_mirror_sync"
        error="Retry Mirror synchronization failed. Durable evidence remains preserved."
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain("Retry Mirror synchronization…");
    expect(html).toContain("Durable evidence remains preserved");
    expect(html).toContain('role="alert"');
  });
});
