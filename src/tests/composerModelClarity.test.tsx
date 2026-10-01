import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComposerRuntimeFooter } from "../app/ComposerRuntimeFooter";
import { ambiguousBareModelNames, bareModelName, modelDisplayName } from "../domain/modelIdentity";
import { deriveModelSelectionScope } from "../domain/modelAvailability";
import appSource from "../app/App.tsx?raw";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";

const cssSource: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/** The model button's visible text, excluding the attributes that carry the exact binding. */
function buttonText(html: string): string {
  const open = html.indexOf("composer-provider-model");
  return html.slice(html.indexOf(">", open) + 1, html.indexOf("</button>", open));
}

describe("CR103 — naming a model without its provider", () => {
  it("cuts at the first separator, because a model name can itself be prefixed", () => {
    expect(bareModelName("openai-codex/gpt-5.6-sol")).toBe("gpt-5.6-sol");
    // Cutting at the last separator would silently drop `openai/` here.
    expect(bareModelName("openrouter/openai/gpt-4")).toBe("openai/gpt-4");
    expect(bareModelName("gpt-5.6-sol")).toBe("gpt-5.6-sol");
  });

  it("finds the bare names that more than one provider claims", () => {
    const ambiguous = ambiguousBareModelNames([
      { provider: "anthropic", model: "claude-sonnet-4-5" },
      { provider: "bedrock", model: "claude-sonnet-4-5" },
      { provider: "openai-codex", model: "gpt-5.6-sol" },
    ]);
    expect(ambiguous.has("claude-sonnet-4-5")).toBe(true);
    expect(ambiguous.has("gpt-5.6-sol")).toBe(false);
  });

  it("keeps a provider exactly where dropping it would create ambiguity", () => {
    const ambiguous = new Set(["claude-sonnet-4-5"]);
    expect(modelDisplayName("openai-codex/gpt-5.6-sol", ambiguous)).toBe("gpt-5.6-sol");
    expect(modelDisplayName("bedrock/claude-sonnet-4-5", ambiguous)).toBe("bedrock/claude-sonnet-4-5");
  });
});

describe("CR103 — the intent no longer replaces the model", () => {
  const base = { onSelectProviderModel: () => undefined } as const;

  it("names the intent and the model together, instead of one standing for the other", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="openai-codex/gpt-5.6-sol · high"
        modelDisplayName="gpt-5.6-sol"
        activeIntentLabel="Operação confiável"
      />,
    );

    expect(html).toContain("Operação confiável");
    expect(html).toContain("gpt-5.6-sol");
    expect(html).toContain("composer-model-identity");
  });

  it("joins the pair into one phrase instead of two labels side by side", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="openai-codex/gpt-5.6-sol"
        modelDisplayName="gpt-5.6-sol"
        activeIntentLabel="Operação confiável"
      />,
    );

    expect(buttonText(html).replace(/<[^>]+>/g, "")).toContain("Operação confiável with gpt-5.6-sol");
  });

  it("does not invent a connector when no intent is there to connect", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter {...base} providerModel="openai-codex/gpt-5.6-sol" modelDisplayName="gpt-5.6-sol" />,
    );

    expect(buttonText(html)).not.toContain("with");
  });

  it("drops the thinking level a matched intent already encodes, keeping it inspectable", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="openai-codex/gpt-5.6-sol · high"
        modelDisplayName="gpt-5.6-sol"
        thinkingLabel="high"
        activeIntentLabel="Operação confiável"
      />,
    );

    // An intent is a model and a thinking level, so naming the level again says nothing new.
    // Only the visible text is checked: the exact binding stays in the title and accessible name.
    expect(buttonText(html)).not.toContain("high");
    expect(html).toContain('title="openai-codex/gpt-5.6-sol · high"');
  });

  it("names the thinking level when no intent speaks for it", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="openai-codex/gpt-5.6-sol · high"
        modelDisplayName="gpt-5.6-sol"
        thinkingLabel="high"
      />,
    );

    expect(buttonText(html)).toContain("gpt-5.6-sol");
    expect(buttonText(html)).toContain("high");
  });

  it("always offers the exact identity, since the visible name is now abbreviated", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="openai-codex/gpt-5.6-sol"
        modelDisplayName="gpt-5.6-sol"
      />,
    );
    expect(html).toContain('title="openai-codex/gpt-5.6-sol"');
    expect(html).toContain("aria-label=\"Choose model and thinking for openai-codex/gpt-5.6-sol\"");
  });
});

describe("CR103 — which turn a model belongs to", () => {
  const base = { onSelectProviderModel: () => undefined } as const;

  it("names the running turn and the next one as parallel facts", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="claude-bridge/claude-fable-5-1"
        modelDisplayName="claude-fable-5-1"
        liveRunProviderModel="openai-codex/gpt-5.5"
        liveRunModelDisplayName="gpt-5.5"
        selectionScope="applies_to_next_turn"
      />,
    );

    expect(html).toContain("Current turn:");
    expect(html).toContain("Next turn:");
    expect(html).toContain("gpt-5.5");
    expect(html).toContain("claude-fable-5-1");
    // The running turn is named before the preference that has not taken effect yet.
    expect(html.indexOf("Current turn:")).toBeLessThan(html.indexOf("Next turn:"));
    // The old wording named the wrong unit: within a live run the next message still
    // belongs to the current turn.
    expect(html).not.toContain("next message");
    expect(html).not.toContain("running on");
  });

  it("spends no words when there is nothing to disambiguate", () => {
    const html = renderToStaticMarkup(
      <ComposerRuntimeFooter
        {...base}
        providerModel="claude-bridge/claude-fable-5-1"
        modelDisplayName="claude-fable-5-1"
        selectionScope="applies_now"
      />,
    );

    expect(html).not.toContain("Current turn:");
    expect(html).not.toContain("Next turn:");
    expect(html).not.toContain("composer-provider-model-scope");
  });

  it("renames the scope so the code stops contradicting the interface", () => {
    expect(deriveModelSelectionScope({
      liveRunProviderModel: "openai-codex/gpt-5.5",
      selectedProviderModel: "claude-bridge/claude-fable-5-1",
    })).toBe("applies_to_next_turn");
    expect(deriveModelSelectionScope({
      selectedProviderModel: "claude-bridge/claude-fable-5-1",
    })).toBe("applies_now");
  });

  it("styles the role words and the secondary identity", () => {
    expect(cssSource).toContain(".composer-model-turn-label");
    expect(cssSource).toContain(".composer-model-identity");
  });
});

describe("CR103 — App supplies the names from structure", () => {
  it("derives the visible name where the provider and model are still separate", () => {
    expect(appSource).toContain("modelDisplayName={");
    expect(appSource).toContain("liveRunModelDisplayName={");
    expect(appSource).toContain("ambiguousBareModelNames(");
  });

  it("keeps safe test mode legible, where the provider is the mode rather than a vendor", () => {
    // `safe-test/cat` must not read as a model called `cat`.
    const derivation = appSource.slice(
      appSource.indexOf("const selectedModelDisplayName"),
      appSource.indexOf("const modelSelectionScope"),
    );
    expect(derivation).toContain("effectiveProviderConfig.safeTestMode");
    expect(derivation).toContain("selectedProviderModelLabel");
  });
});
