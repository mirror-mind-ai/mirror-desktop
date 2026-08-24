import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationSyncNotice } from "../app/ConversationSyncNotice";

describe("conversation sync notice", () => {
  it("renders only the bounded incomplete state and retry action", () => {
    const html = renderToStaticMarkup(
      <ConversationSyncNotice retrying={false} error="mirror_cli_failed" onRetry={() => undefined} />,
    );
    expect(html).toContain("Mirror conversation commit incomplete: mirror_cli_failed");
    expect(html).toContain("Retry");
    expect(html).not.toContain("turn-");
    expect(html).not.toContain("session.jsonl");
  });
});
