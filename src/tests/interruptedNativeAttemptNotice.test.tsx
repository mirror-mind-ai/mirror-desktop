import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InterruptedNativeAttemptNotice } from "../app/InterruptedNativeAttemptNotice";

describe("InterruptedNativeAttemptNotice", () => {
  it("explains the ended attempt and names continuation without offering retry", () => {
    const markup = renderToStaticMarkup(<InterruptedNativeAttemptNotice />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Previous attempt was interrupted");
    expect(markup).toContain("ended before producing a response");
    expect(markup).toContain("No retry was started");
    expect(markup).toContain("sending a new message");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("The provider reported");
  });

  it("names the provider failure when durable evidence carries it", () => {
    const markup = renderToStaticMarkup(
      <InterruptedNativeAttemptNotice providerFailure="Error: You have hit your ChatGPT usage limit (plus plan)." />,
    );
    expect(markup).toContain("The provider reported: Error: You have hit your ChatGPT usage limit (plus plan).");
    expect(markup).not.toContain("<button");
  });
});
