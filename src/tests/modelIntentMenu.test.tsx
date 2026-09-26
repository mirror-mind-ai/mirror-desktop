import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ModelIntentMenu } from "../app/ModelIntentMenu";
import { addModelIntent, createEmptyModelIntents, type ModelIntent } from "../domain/modelIntents";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

const everyday: ModelIntent = {
  id: "everyday",
  label: "Para tarefas cotidianas",
  model: { provider: "openai-codex", model: "gpt-5.5" },
  thinkingLevel: "medium",
};

const hardest: ModelIntent = {
  id: "hardest",
  label: "Para as implementações mais difíceis",
  model: { provider: "retired-bridge", model: "claude-fable-5-1" },
  thinkingLevel: "high",
};

const catalog = [
  { provider: "openai-codex", model: "gpt-5.5", available: true, thinking: true },
  { provider: "retired-bridge", model: "claude-fable-5-1", available: false, thinking: true },
];

const store = addModelIntent(addModelIntent(createEmptyModelIntents(), everyday), hardest);

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <ModelIntentMenu
      intents={store}
      catalog={catalog}
      usingGlobalDefault={false}
      globalModelLabel="openai-codex/gpt-5.4-mini"
      onSelectIntent={() => undefined}
      onUseGlobalDefaults={() => undefined}
      onOpenFullSelector={() => undefined}
      {...overrides}
    />,
  );
}

describe("model intent menu", () => {
  it("lists the intents in the Navigator's order with the binding behind each label", () => {
    const html = render();
    expect(html).toContain('role="menu"');
    expect(html.match(/role="menuitem"/gu)?.length).toBe(4);
    expect(html.indexOf("Para tarefas cotidianas")).toBeLessThan(html.indexOf("Para as implementações"));
    expect(html).toContain("openai-codex/gpt-5.5 · thinking medium");
    expect(cssSource).toContain(".model-intent-menu");
  });

  it("marks the intent the Journey is already using", () => {
    const html = render({ activeIntentId: "everyday" });
    const item = html.indexOf("Para tarefas cotidianas");
    expect(html.slice(0, item)).toContain('aria-current="true"');
  });

  it("refuses an intent whose model can no longer run, and says why", () => {
    const html = render();
    const item = html.indexOf("Para as implementações");
    expect(html.slice(item - 260, item)).toContain("disabled");
    expect(html).toContain("could not load");
  });

  it("always offers the global default and the full selector", () => {
    const html = render({ usingGlobalDefault: true });
    expect(html).toContain("Use global defaults");
    expect(html).toContain("openai-codex/gpt-5.4-mini");
    expect(html).toContain("Open full selector");
  });

  it("points at Settings when no intent has been named yet", () => {
    const html = render({ intents: createEmptyModelIntents() });
    expect(html).toContain("Settings");
    expect(html).toContain("model-intent-menu-empty");
    expect(html).not.toContain("Para tarefas cotidianas");
    // Only the two escape hatches remain, and they stay reachable with nothing configured.
    expect(html.match(/role="menuitem"/gu)?.length).toBe(2);
    expect(html).toContain("Open full selector");
    expect(html).toContain("Use global defaults");
  });

  // The Composer footer disables pointer events for its subtree and re-enables them only on
  // the controls that need them. A popover rendered inside it must claim them back, or it
  // opens and refuses every click.
  it("claims back the pointer events its Composer-footer ancestor disables", () => {
    const footer = cssSource.slice(
      cssSource.indexOf(".composer-runtime-footer {"),
      cssSource.indexOf("}", cssSource.indexOf(".composer-runtime-footer {")),
    );
    expect(footer).toContain("pointer-events: none");

    const menu = cssSource.slice(
      cssSource.indexOf(".model-intent-menu {"),
      cssSource.indexOf("}", cssSource.indexOf(".model-intent-menu {")),
    );
    expect(menu).toContain("pointer-events: auto");
  });

  // Passo 3 of the 2026-09-25 reproduction: with a configuration that matches no intent and
  // is not the global default, nothing in the menu was marked and the Navigator could not
  // tell where they were.
  it("names the current configuration when no entry represents it", () => {
    const html = render({ currentBinding: "openai-codex/gpt-5.5 · high" });
    expect(html).toContain("openai-codex/gpt-5.5 · high");
    expect(html).toContain("model-intent-menu-current");
    expect(html).not.toContain('aria-current="true"');
  });

  it("stays quiet about the current configuration when an entry already carries it", () => {
    expect(render({ activeIntentId: "everyday", currentBinding: "openai-codex/gpt-5.5" }))
      .not.toContain("model-intent-menu-current");
    expect(render({ usingGlobalDefault: true, currentBinding: "openai-codex/gpt-5.4-mini" }))
      .not.toContain("model-intent-menu-current");
  });
});
