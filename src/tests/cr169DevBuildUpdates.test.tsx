import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelfUpdatePanel } from "../app/SelfUpdatePanel";
import appSource from "../app/App.tsx?raw";
import channelSource from "../../src-tauri/src/runtime_channel.rs?raw";

// CR169: the development build registers no updater by design. Asked to update, it says so
// instead of failing with "plugin updater not found", and it carries its own name where the
// person looks first.

describe("updates in a build that does not update itself", () => {
  it("say why, and offer no check", () => {
    const html = renderToStaticMarkup(<SelfUpdatePanel runtimeBusy={false} selfUpdates={false} buildName="Nautilus for Mirror Dev" />);
    expect(html).toContain("This build, Nautilus for Mirror Dev, does not update itself; updates reach Nautilus for Mirror.");
    expect(html).not.toContain("Check for updates");
  });

  it("are unchanged in the user build", () => {
    const html = renderToStaticMarkup(<SelfUpdatePanel runtimeBusy={false} />);
    expect(html).toContain(">Check for updates</button>");
    expect(html).not.toContain("does not update itself");
  });

  it("follow the same rule as the native updater", () => {
    expect(channelSource).toContain("pub fn supports_updater(self) -> bool {\n        matches!(self, Self::User)");
    expect(appSource).toContain("selfUpdates={!developmentChannel && !evaluationChannel} buildName={buildName}");
  });
});

describe("the sidebar's name", () => {
  it("is the development build's own, visibly", () => {
    expect(appSource).toContain('const buildName = developmentChannel ? "Nautilus for Mirror Dev" : evaluationChannel ? "Nautilus for Mirror Eval" : "Nautilus for Mirror";');
    expect(appSource).toContain("<strong>{buildName} {developmentChannel");
  });
});
