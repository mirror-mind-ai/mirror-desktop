import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationSyncNotice, LegacyMirrorGapNotice } from "../app/ConversationSyncNotice";

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

  it("renders an honest terminal legacy gap without offering retry", () => {
    const html = renderToStaticMarkup(<LegacyMirrorGapNotice />);
    expect(html).toContain("was not saved to Mirror");
    expect(html).toContain("exact message payload was not preserved");
    expect(html).toContain("You can continue this conversation");
    expect(html).not.toContain("Retry");
    expect(html).not.toContain("committed");
  });
});
