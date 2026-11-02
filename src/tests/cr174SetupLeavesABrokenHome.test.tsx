import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MirrorHomeSetup } from "../app/MirrorHomeSetup";
import appSource from "../app/App.tsx?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";

// CR174: setup leaves a binding to a home that no longer opens. The sentence about that home says
// it is about the home opened before, and goes once the person makes a choice; the two folder
// pickers say what each is for.

const handlers = () => ({ onCreate: vi.fn(), onChooseFolder: vi.fn(async () => undefined), onChoose: vi.fn() });

describe("setup with a home that no longer opens", () => {
  it("says the sentence is about the home opened before", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding={false} brokenHome="/Users/ana/Mirror Homes/old is not a marked 0.3 home." {...handlers()} />);
    expect(html).toContain("The Mirror home this app opened before can no longer be opened: /Users/ana/Mirror Homes/old is not a marked 0.3 home.");
    expect(html).toContain("Create a new one, or open another.");
    expect(html).not.toContain('role="alert"');
  });

  it("drops that sentence once the person chooses anything", () => {
    expect(appSource).toContain("brokenHome={runtimeHomeChosen ? undefined : runtimeChannel?.status === \"invalid\" ? runtimeChannel.message : undefined}");
    expect(appSource).toContain("error={runtimeChannelError}");
    for (const name of ["chooseHomeFolder", "chooseAndBindMirrorHome"]) {
      const start = appSource.indexOf(`async function ${name}(`);
      const body = appSource.slice(start, appSource.indexOf("\n  }\n", start));
      expect(body).toContain("setRuntimeHomeChosen(true)");
    }
  });

  it("names each folder picker by what it is for", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding={false} {...handlers()} />);
    expect(html).toContain(">Create it in another folder…</button>");
    expect(html).not.toContain("Choose another place");
    expect(mainSource).toContain('"mirrorHome" => "Open an existing Mirror home"');
    expect(mainSource).toContain('"homeFolder" => "Choose the folder your new Mirror home is created in"');
  });
});
