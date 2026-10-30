import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

// CV-010.DS-005 slice 3c: an effect that sets its own state to "loading" re-runs, because that state
// is one of its dependencies. A cleanup that marks the request cancelled then throws away the answer,
// and setup stayed at "Checking your model providers…" for good (found by the Navigator, 2026-10-30).
// Every effect that moves its own dependency to "loading" must keep the answer.

/** Each `useEffect` body that sets a state to "loading", with that effect's dependency list. */
function loadingEffects(source: string): { body: string; deps: string }[] {
  const effects: { body: string; deps: string }[] = [];
  let from = 0;
  while (true) {
    const start = source.indexOf("useEffect(() => {", from);
    if (start < 0) break;
    const end = source.indexOf("\n  }, [", start);
    const depsEnd = source.indexOf("]);", end);
    const body = source.slice(start, end);
    if (/set\w+State\("loading"\)/.test(body)) effects.push({ body, deps: source.slice(end + 6, depsEnd) });
    from = start + 1;
  }
  return effects;
}

describe("setup's reads keep their answers", () => {
  it("finds the provider and OpenRouter reads", () => {
    const bodies = loadingEffects(appSource).map((effect) => effect.body);
    expect(bodies.some((body) => body.includes("inspectPiProviders()"))).toBe(true);
    expect(bodies.some((body) => body.includes("loadOpenRouterKeyStatus()"))).toBe(true);
  });

  it("never discards an answer when the effect re-runs on its own loading state", () => {
    for (const { body, deps } of loadingEffects(appSource)) {
      const loading = body.match(/set(\w+)State\("loading"\)/)?.[1] ?? "";
      const own = `${loading.charAt(0).toLowerCase()}${loading.slice(1)}State`;
      if (!deps.includes(own)) continue;
      expect(body, own).not.toMatch(/return \(\) => \{[^}]*cancelled = true/);
    }
  });
});
