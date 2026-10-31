import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MirrorHomeAdoption } from "../app/MirrorHomeAdoption";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/runtimeChannelStorage.ts?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";
import bridgeSource from "../../src-tauri/src/mirror_host_bridge.rs?raw";
import { adoptionView, parseHomeAdoptionInspection, type HomeAdoptionInspection } from "../domain/mirrorHomeAdoption";

// CV-010.DS-005 phase 5, slice 5a: *Open an existing Mirror home…* on a home Mirror Desktop TS did
// not create. The app inspects it first and shows what it holds and what will change; only on the
// person's word does it migrate exactly the pending list shown, then mark and bind the home.

const PENDING = ["017_journey_parent_column", "018_drop_hook_injected"];
const HOME = "/Users/ana/.mirror-minds/ana";
const contents = { journeys: 81, conversations: 1204, memories: 3310, personas: 28 };

function report(state: string, extra: Record<string, unknown> = {}) {
  return { state, dbPath: `${HOME}/memory.db`, applied: ["001_project_to_travessia"], pending: [], unknown: [], coreVersion: "0.39.0", ...extra };
}

function parsed(value: unknown): HomeAdoptionInspection {
  const inspection = parseHomeAdoptionInspection(value);
  if (!inspection) throw new Error("did not parse");
  return inspection;
}

/** A home under review: one Mirror Desktop TS did not make. */
function inspected(value: unknown): Extract<HomeAdoptionInspection, { marked: false }> {
  const inspection = parsed(value);
  if (inspection.marked) throw new Error("marked");
  return inspection;
}

const pending = () => inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("pending", { pending: PENDING }), contents });

describe("the inspection the host answers", () => {
  it("parses a pending, a current, a marked and a refused home", () => {
    expect(pending()).toMatchObject({ marked: false, report: { state: "pending", pending: PENDING }, contents });
    expect(parsed({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: true })).toEqual({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: true });
    expect(inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("ahead", { unknown: ["099_x"] }), contents: null }))
      .toMatchObject({ report: { state: "ahead" }, contents: null });
  });

  it("refuses anything else rather than guess", () => {
    for (const bad of [
      null,
      "x",
      { homePath: HOME, dbPath: `${HOME}/memory.db` },
      { homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("pending", { pending: PENDING }) },
      { homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("weird"), contents: null },
      { homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("pending", { pending: [1] }), contents },
      { homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("pending", { pending: PENDING }), contents: { ...contents, journeys: -1 } },
      { homePath: "relative", dbPath: "relative/memory.db", marked: true },
    ]) {
      expect(parseHomeAdoptionInspection(bad)).toBeNull();
    }
  });
});

describe("what the review offers", () => {
  it("migrates a pending home, with the exact list shown", () => {
    expect(adoptionView(pending())).toEqual({ kind: "migrate", expectedPending: PENDING });
  });

  it("only marks a current home", () => {
    const current = inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("current"), contents });
    expect(adoptionView(current)).toEqual({ kind: "mark", expectedPending: [] });
  });

  it("refuses a newer core's home and a file that is not a Mirror database, in words", () => {
    const ahead = adoptionView(inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("ahead", { unknown: ["099_x"] }), contents: null }));
    expect(ahead).toMatchObject({ kind: "refuse" });
    expect(ahead.kind === "refuse" && ahead.reason).toMatch(/newer Mirror.*Update Mirror Desktop TS first/);
    const notMirror = adoptionView(inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("not_mirror"), contents: null }));
    expect(notMirror.kind === "refuse" && notMirror.reason).toMatch(/not a Mirror database/);
  });
});

describe("the review screen", () => {
  const handlers = () => ({ onAdopt: vi.fn(), onCancel: vi.fn() });

  it("shows the folder, what it holds, the changes, and what changing it costs", () => {
    const html = renderToStaticMarkup(<MirrorHomeAdoption inspection={pending()} adopting={false} {...handlers()} />);
    expect(html).toContain(`<code>${HOME}</code>`);
    expect(html).toMatch(/81 Journeys/);
    expect(html).toMatch(/1204 Conversations/);
    expect(html).toMatch(/3310 memories/);
    expect(html).toMatch(/28 personas/);
    for (const id of PENDING) expect(html).toContain(id);
    expect(html).toMatch(/Mirror Desktop 0\.2 and the terminal&#x27;s Python Mirror can no longer open it/);
    expect(html).toMatch(/restoring the copy/);
    expect(html).toContain(`<code>${HOME}/backups</code>`);
    expect(html).toMatch(/<button type="button">Update and open<\/button>/);
    expect(html).toMatch(/Choose another home/);
  });

  it("offers to open a current home without a migration", () => {
    const current = inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("current"), contents });
    const html = renderToStaticMarkup(<MirrorHomeAdoption inspection={current} adopting={false} {...handlers()} />);
    expect(html).toMatch(/already up to date/);
    expect(html).toMatch(/<button type="button">Open this home<\/button>/);
    expect(html).not.toMatch(/Update and open|backups/);
  });

  it("offers nothing but another choice for a home it will not adopt", () => {
    const ahead = inspected({ homePath: HOME, dbPath: `${HOME}/memory.db`, marked: false, report: report("ahead", { unknown: ["099_x"] }), contents: null });
    const html = renderToStaticMarkup(<MirrorHomeAdoption inspection={ahead} adopting={false} {...handlers()} />);
    expect(html).toMatch(/Update Mirror Desktop TS first/);
    expect(html).not.toMatch(/Update and open|Open this home/);
    expect(html).toMatch(/Choose another home/);
  });

  it("shows a refusal as an alert, and disables every action while adopting", () => {
    const html = renderToStaticMarkup(<MirrorHomeAdoption inspection={pending()} adopting error="The home changed since you looked at it." {...handlers()} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("The home changed since you looked at it.");
    expect(html).toMatch(/<button type="button" disabled="">Updating…<\/button>/);
    expect(html).toMatch(/disabled="">Choose another home/);
  });
});

describe("the app's wiring", () => {
  it("inspects a chosen home first, binds a marked one as before, and reviews any other", () => {
    expect(storageSource).toContain('invoke<unknown>("inspect_home_for_adoption", { homePath })');
    expect(storageSource).toContain('invoke<unknown>("adopt_mirror_home", { homePath, expectedPending })');
    const choose = appSource.slice(appSource.indexOf("async function chooseAndBindMirrorHome()"));
    const body = choose.slice(0, choose.indexOf("\n  }\n") + 4);
    expect(body).toContain("await inspectHomeForAdoption(homePath)");
    expect(body).toContain("if (inspection.marked)");
    expect(body).toContain("await bindMirrorHome(homePath)");
    expect(body).toContain("setHomeAdoption(inspection)");
    expect(appSource).toContain("onAdopt={(expectedPending) => void adoptAndBindMirrorHome(expectedPending)}");
  });

  it("registers both commands, serialized, behind the development guard", () => {
    for (const command of ["inspect_home_for_adoption", "adopt_mirror_home"]) {
      expect(mainSource).toContain(`            ${command},`);
      const start = mainSource.indexOf(`fn ${command}(`);
      expect(start, command).toBeGreaterThan(0);
      const body = mainSource.slice(start, mainSource.indexOf("\n}\n", start));
      expect(body).toContain("native_command_serialization::acquire()");
      const guard = body.indexOf("mirror_host_bridge::adoption_channel_refusal(RuntimeChannel::active(), ");
      expect(guard, command).toBeGreaterThan(0);
      expect(guard).toBeLessThan(body.indexOf("mirror_host_bridge::"+(command === "adopt_mirror_home" ? "adopt_home(" : "inspect_home_for_adoption(")));
    }
    const adopt = mainSource.slice(mainSource.indexOf("fn adopt_mirror_home("));
    const adoptBody = adopt.slice(0, adopt.indexOf("\n}\n"));
    expect(adoptBody.indexOf("home_switch_refusal(")).toBeLessThan(adoptBody.indexOf("mirror_host_bridge::adopt_home("));
    expect(adoptBody.indexOf("mirror_host_bridge::adopt_home(")).toBeLessThan(adoptBody.indexOf("bind_marked_home("));
  });

  it("says each refusal in plain words", () => {
    expect(bridgeSource).toContain("pub(crate) fn describe_home_adoption(");
    const words = bridgeSource.slice(bridgeSource.indexOf("pub(crate) fn describe_home_adoption("));
    for (const reason of ["already_marked", "not_adoptable", "no_database", "inside_repository", "invalid_home_path", "pending_changed", "backup_failed"]) {
      expect(words, reason).toContain(`"${reason}" =>`);
    }
  });
});
