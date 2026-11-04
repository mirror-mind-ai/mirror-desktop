import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";
import setupSource from "../app/MirrorHomeSetup.tsx?raw";
import {
  claimOnboardingName,
  forgetOnboardingName,
  rememberOnboardingName,
  type NameHandoffStorage,
} from "../app/onboardingNameHandoff";
import { MirrorHomeSetup } from "../app/MirrorHomeSetup";

/**
 * CR190: the setup screen asks "What should your Mirror call you?" and then kept only the user name
 * derived from the answer, so "José Ávila" came back as "Jose Avila". A home has its own
 * preferences and the app reloads into the new home right after creating it, so the typed name is
 * handed across that reload and claimed by the home it was typed for.
 */
function memoryStorage(): NameHandoffStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
}

describe("CR190 the name typed at setup", () => {
  it("is claimed once by the home it was typed for", () => {
    const storage = memoryStorage();
    rememberOnboardingName(storage, "jose-avila", "  José   Ávila ");

    expect(claimOnboardingName(storage, "jose-avila")).toBe("José Ávila");
    expect(claimOnboardingName(storage, "jose-avila")).toBeUndefined();
  });

  it("is not claimed by another home", () => {
    const storage = memoryStorage();
    rememberOnboardingName(storage, "jose-avila", "José Ávila");

    expect(claimOnboardingName(storage, "ana")).toBeUndefined();
    expect(claimOnboardingName(storage, undefined)).toBeUndefined();
    expect(claimOnboardingName(storage, "jose-avila")).toBe("José Ávila");
  });

  it("is forgotten when creation fails, and a blank or broken one is never claimed", () => {
    const storage = memoryStorage();
    rememberOnboardingName(storage, "jose-avila", "José Ávila");
    forgetOnboardingName(storage);
    expect(claimOnboardingName(storage, "jose-avila")).toBeUndefined();

    rememberOnboardingName(storage, "x", "   ");
    expect(storage.items.size).toBe(0);
    storage.setItem("mirror-desktop:onboarding-name:v1", "{not json");
    expect(claimOnboardingName(storage, "x")).toBeUndefined();
  });

  it("survives a storage that refuses", () => {
    const refusing: NameHandoffStorage = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    };
    expect(() => rememberOnboardingName(refusing, "a", "A")).not.toThrow();
    expect(claimOnboardingName(refusing, "a")).toBeUndefined();
  });
});

describe("CR190 setup wiring", () => {
  it("hands the typed name to creation alongside the user name", () => {
    const onCreate = vi.fn();
    renderToStaticMarkup(<MirrorHomeSetup binding={false} onCreate={onCreate} onChooseFolder={vi.fn(async () => undefined)} onChoose={vi.fn()} initialName="José Ávila" />);
    expect(setupSource).toMatch(/onCreate\(userName, folder, name\)/);
    expect(appSource).toContain("onCreate={(userName, folder, typedName) => void createAndBindMirrorHome(userName, folder, typedName)}");
  });

  it("remembers before creating, forgets on failure, and claims for the bound home", () => {
    const create = appSource.slice(appSource.indexOf("async function createAndBindMirrorHome("), appSource.indexOf("function reloadForBoundHome()"));
    expect(create.indexOf("rememberOnboardingName(")).toBeLessThan(create.indexOf("await createMirrorHome("));
    expect(create).toMatch(/catch \(error\) \{[\s\S]*forgetOnboardingName\(/);
    expect(appSource).toMatch(/claimOnboardingName\(window\.localStorage, runtimeChannel\?\.mirrorUser\)/);
  });
});
