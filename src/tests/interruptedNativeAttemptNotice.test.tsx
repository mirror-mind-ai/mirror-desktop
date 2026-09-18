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
  });
});
