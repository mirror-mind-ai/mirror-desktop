import { describe, expect, it } from "vitest";
import mainSource from "../../src-tauri/src/main.rs?raw";

// CR186: `venda-de-livros` registered `~/Code/szen_play`; the turn refused it as not absolute and
// worked in `~/Mirror Journeys/`. The behaviour is tested in Rust (`cr186_*`); this guards that every
// reader of the registered path, the turn's folder and the Journey's documents alike, expands it.
describe("CR186: one reading of the registered project path", () => {
  it("expands it where the registry is read, against the same home folder as the turn", () => {
    const root = mainSource.slice(mainSource.indexOf("fn registered_journey_root("));
    const body = root.slice(0, root.indexOf("\n}\n"));
    expect(body).toContain("registered_project_path(&path, &user_home)");
    expect(body).toContain("app.path().home_dir()");
    expect(body).not.toContain(".map(PathBuf::from)");
  });
});
