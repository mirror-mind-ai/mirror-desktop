import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

// The App shell returns early while runtime onboarding is visible. A hook declared after
// that return runs on some renders and not others, and React tears the whole tree down the
// moment the condition flips — a black window on launch, with nothing failing in the suite.
// CR080 shipped exactly that mistake, so the ordering is pinned here.
describe("App hook order", () => {
  it("declares every hook before the runtime onboarding early return", () => {
    const earlyReturn = appSource.indexOf("if (runtimeSetupVisible) {");
    expect(earlyReturn).toBeGreaterThan(0);

    const hooks = [...appSource.matchAll(/\buse(?:State|Effect|Memo|Callback|Ref|LayoutEffect|Reducer|Context)\s*\(/g)];
    expect(hooks.length).toBeGreaterThan(50);
    const afterReturn = hooks.filter((hook) => hook.index! > earlyReturn);
    expect(afterReturn.map((hook) => appSource.slice(hook.index!, hook.index! + 40))).toEqual([]);
  });
});
