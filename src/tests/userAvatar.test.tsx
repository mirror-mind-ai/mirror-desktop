import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { MessageSpeakerAvatar, UserAvatarSettings } from "../app/UserAvatar";
import { validateUserAvatarDataUrl } from "../app/userAvatarStorage";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const avatar = "data:image/png;base64,aGVsbG8=";

describe("channel-local user avatar", () => {
  it("accepts only bounded normalized PNG presentation data", () => {
    expect(validateUserAvatarDataUrl(avatar)).toBe(avatar);
    expect(validateUserAvatarDataUrl("data:image/svg+xml,<svg/>")).toBeUndefined();
    expect(validateUserAvatarDataUrl("https://example.com/avatar.png")).toBeUndefined();
    expect(validateUserAvatarDataUrl(null)).toBeUndefined();
  });

  it("offers accessible choose, replace, remove, preview, and fallback states", () => {
    const empty = renderToStaticMarkup(<UserAvatarSettings avatar={undefined} busy={false} onChoose={vi.fn()} onRemove={vi.fn()} />);
    const configured = renderToStaticMarkup(<UserAvatarSettings avatar={avatar} busy={false} message="Avatar saved." onChoose={vi.fn()} onRemove={vi.fn()} />);

    expect(empty).toContain('aria-label="User avatar"');
    expect(empty).toContain("Choose photo…");
    expect(empty).toContain("Remove photo");
    expect(empty).toContain("disabled");
    expect(configured).toContain('alt="Current user avatar"');
    expect(configured).toContain("Replace photo…");
    expect(configured).toContain('role="status"');
  });

  it("uses the custom photo only for user-authored message avatars", () => {
    const user = renderToStaticMarkup(<MessageSpeakerAvatar speakerKind="user" fallback="N" userAvatar={avatar} />);
    const agent = renderToStaticMarkup(<MessageSpeakerAvatar speakerKind="agent" fallback="N" userAvatar={avatar} />);

    expect(user).toContain('alt="User avatar"');
    expect(user).toContain(avatar);
    expect(agent).not.toContain("<img");
    expect(agent).toContain(">N</span>");
    expect(appSource).toContain("<MessageSpeakerAvatar");
    expect(appSource).toContain("<UserAvatarSettings");
    expect(cssSource).toContain("/* Channel-local user avatar contract. */");
    expect(cssSource).toContain("object-fit: cover");
    expect(cssSource).toContain("background: #f2f4f7");
  });
});
