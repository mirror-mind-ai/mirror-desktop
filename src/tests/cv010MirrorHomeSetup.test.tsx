import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MirrorHomeSetup } from "../app/MirrorHomeSetup";
import appSource from "../app/App.tsx?raw";
import { homeCreationPreview, isUserName, userNameFrom, userNameProblem } from "../domain/mirrorHomeCreation";

// CV-010.DS-005 slice 3a: the 0.3 setup screen creates a Mirror home made for Mirror Desktop TS,
// and still opens one made earlier. It never offers to find or connect a Python Mirror.

const handlers = () => ({ onCreate: vi.fn(), onChooseFolder: vi.fn(async () => undefined), onChoose: vi.fn() });

describe("the user name a home is created with", () => {
  it("is derived from the typed name the way the core derives a slug", () => {
    expect(userNameFrom("Ana Souza")).toBe("ana-souza");
    expect(userNameFrom("  José da Conceição  ")).toBe("jose-da-conceicao");
    expect(userNameFrom("Ana_Souza!! 2")).toBe("ana-souza-2");
    expect(userNameFrom("—")).toBe("");
    const long = userNameFrom(`${"a".repeat(79)} b`);
    expect(long).toBe("a".repeat(79));
    expect(isUserName(long)).toBe(true);
  });

  it("follows the core's rule, and says what is wrong in plain words", () => {
    for (const valid of ["ana", "ana-souza", "7", "a".repeat(80)]) expect(isUserName(valid)).toBe(true);
    for (const invalid of ["", "Ana", "ana souza", "ana--souza", "-ana", "ana-", "josé", "ana_souza", "a".repeat(81)]) {
      expect(isUserName(invalid)).toBe(false);
    }
    expect(userNameProblem("")).toBe("Type a name for your Mirror.");
    expect(userNameProblem("Ana")).toMatch(/lowercase letters, digits and single hyphens/);
    expect(userNameProblem("ana")).toBeNull();
  });

  it("names the folder the home will be, in ~/Mirror unless another was chosen", () => {
    expect(homeCreationPreview("ana-souza")).toBe("~/Mirror/ana-souza");
    expect(homeCreationPreview("ana", "/Volumes/Notes")).toBe("/Volumes/Notes/ana");
  });
});

describe("the 0.3 setup screen", () => {
  it("offers to create a Mirror, and to open an existing home, and nothing that reaches a Python Mirror", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding={false} {...handlers()} />);
    expect(html).toContain("Mirror Desktop TS");
    expect(html).toContain("Create your Mirror");
    expect(html).toContain("What should your Mirror call you?");
    expect(html).toContain("Choose another place…");
    expect(html).toContain("Open an existing Mirror home…");
    expect(html).toMatch(/<button type="submit" disabled="">Create my Mirror<\/button>/);
    expect(html).not.toContain('role="status"');
    expect(html).not.toMatch(/Find my Mirror|Mirror source directory|dev_ts_home/);
  });

  it("shows the derived name and the folder it will be, and enables creation", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding={false} initialName="Ana Souza" {...handlers()} />);
    expect(html).toContain('value="ana-souza"');
    expect(html).toContain("<code>~/Mirror/ana-souza</code>");
    expect(html).toMatch(/<button type="submit">Create my Mirror<\/button>/);
  });

  it("refuses a name that gives no user name, before asking the app", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding={false} initialName="——" {...handlers()} />);
    expect(html).toContain("Type a name for your Mirror.");
    expect(html).toMatch(/<button type="submit" disabled="">Create my Mirror<\/button>/);
  });

  it("shows a refusal as an alert, and disables every action while creating", () => {
    const html = renderToStaticMarkup(<MirrorHomeSetup binding initialName="ana" error="/Users/ana/Mirror/ana already exists." {...handlers()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("/Users/ana/Mirror/ana already exists.");
    expect(html).toMatch(/<button type="submit" disabled="">Creating…<\/button>/);
    expect(html).toMatch(/disabled="">Choose another place…/);
    expect(html).toMatch(/disabled="">Open an existing Mirror home…/);
  });

  it("is what the app shows when it needs a connection, wired to create, choose a folder and open", () => {
    expect(appSource).toContain("runtimeSetupNeedsConnection ? (\n            <MirrorHomeSetup");
    expect(appSource).toContain("onCreate={(userName, folder) => void createAndBindMirrorHome(userName, folder)}");
    expect(appSource).toContain("onChooseFolder={chooseHomeFolder}");
    expect(appSource).toContain("onChoose={() => void chooseAndBindMirrorHome()}");
    expect(appSource).not.toContain("<ExistingMirrorDiscovery");
    const bodyOf = (name: string) => {
      const start = appSource.indexOf(`async function ${name}(`);
      expect(start).toBeGreaterThan(0);
      return appSource.slice(start, appSource.indexOf("\n  }\n", start));
    };
    const chosen = bodyOf("chooseAndBindMirrorHome");
    expect(chosen).toContain('chooseRuntimeDirectory("mirrorHome")');
    expect(chosen).toContain("bindMirrorHome(");
    expect(chosen).toContain("importJourneysAfterBinding()");
    const created = bodyOf("createAndBindMirrorHome");
    expect(created.indexOf("createMirrorHome(userName, folder)")).toBeLessThan(created.indexOf("importJourneysAfterBinding()"));
    expect(created).toContain('setRuntimeBindingState("idle")');
    expect(bodyOf("chooseHomeFolder")).toContain('chooseRuntimeDirectory("homeFolder")');
  });
});
