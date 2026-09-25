import { describe, expect, it } from "vitest";
import {
  MODEL_INTENTS_MAX,
  MODEL_INTENT_LABEL_MAX_LENGTH,
  addModelIntent,
  createEmptyModelIntents,
  createModelIntentId,
  matchModelIntent,
  normalizeModelIntentLabel,
  parseModelIntents,
  removeModelIntent,
  reorderModelIntent,
  serializeModelIntents,
  updateModelIntent,
  type ModelIntent,
  type ModelIntents,
} from "../domain/modelIntents";

const everyday: ModelIntent = {
  id: "intent-everyday",
  label: "Para tarefas cotidianas",
  model: { provider: "openai-codex", model: "gpt-5.5" },
  thinkingLevel: "medium",
};

const hardest: ModelIntent = {
  id: "intent-hardest",
  label: "Para as implementações mais difíceis",
  model: { provider: "anthropic", model: "claude-fable-5-1" },
  thinkingLevel: "high",
};

function storeWith(...entries: ModelIntent[]): ModelIntents {
  return entries.reduce((store, entry) => addModelIntent(store, entry), createEmptyModelIntents());
}

describe("model intents", () => {
  it("starts empty and round-trips through its serialized form", () => {
    const empty = createEmptyModelIntents();
    expect(empty).toEqual({ schemaVersion: "1.0.0", intents: [] });
    const store = storeWith(everyday, hardest);
    expect(parseModelIntents(JSON.parse(serializeModelIntents(store)))).toEqual(store);
  });

  // The whole point of a separate store: agent-settings.json admits neither spaces nor
  // accents, so it cannot hold a label a person would actually write.
  it("accepts the human labels the agent settings value rule cannot express", () => {
    const store = storeWith(hardest);
    expect(store.intents[0].label).toBe("Para as implementações mais difíceis");
    expect(parseModelIntents(JSON.parse(serializeModelIntents(store))).intents[0].label)
      .toBe("Para as implementações mais difíceis");
  });

  it("normalizes surrounding and repeated whitespace in a label", () => {
    expect(normalizeModelIntentLabel("  Para   tarefas\tcotidianas  ")).toBe("Para tarefas cotidianas");
    expect(addModelIntent(createEmptyModelIntents(), { ...everyday, label: "  Rápido  " }).intents[0].label)
      .toBe("Rápido");
  });

  it("refuses a label that carries no words, exceeds the bound, or hides control characters", () => {
    expect(() => addModelIntent(createEmptyModelIntents(), { ...everyday, label: "   " }))
      .toThrow("Model intent label is invalid.");
    expect(() => addModelIntent(createEmptyModelIntents(), {
      ...everyday, label: "a".repeat(MODEL_INTENT_LABEL_MAX_LENGTH + 1),
    })).toThrow("Model intent label is invalid.");
    expect(() => addModelIntent(createEmptyModelIntents(), { ...everyday, label: "linha\nquebrada" }))
      .toThrow("Model intent label is invalid.");
  });

  it("keeps identity unique and the collection bounded", () => {
    expect(() => addModelIntent(storeWith(everyday), everyday)).toThrow("Model intent identity is already used.");
    let store = createEmptyModelIntents();
    for (let index = 0; index < MODEL_INTENTS_MAX; index += 1) {
      store = addModelIntent(store, { ...everyday, id: `intent-${index}`, label: `Intent ${index}` });
    }
    expect(store.intents).toHaveLength(MODEL_INTENTS_MAX);
    expect(() => addModelIntent(store, { ...everyday, id: "intent-extra", label: "Extra" }))
      .toThrow("Model intents reached their limit.");
  });

  it("renames and rebinds an intent in place", () => {
    const store = storeWith(everyday, hardest);
    const renamed = updateModelIntent(store, "intent-everyday", {
      label: "Para o dia a dia",
      thinkingLevel: "low",
    });
    expect(renamed.intents[0]).toEqual({
      ...everyday, label: "Para o dia a dia", thinkingLevel: "low",
    });
    expect(renamed.intents[1]).toEqual(hardest);
    expect(() => updateModelIntent(store, "missing", { label: "x" })).toThrow("Model intent does not exist.");
  });

  it("reorders within bounds and leaves the ends alone", () => {
    const store = storeWith(everyday, hardest);
    expect(reorderModelIntent(store, "intent-hardest", "up").intents.map((intent) => intent.id))
      .toEqual(["intent-hardest", "intent-everyday"]);
    expect(reorderModelIntent(store, "intent-everyday", "up")).toEqual(store);
    expect(reorderModelIntent(store, "intent-hardest", "down")).toEqual(store);
  });

  it("removes an intent without disturbing the others", () => {
    expect(removeModelIntent(storeWith(everyday, hardest), "intent-everyday").intents).toEqual([hardest]);
    expect(removeModelIntent(storeWith(everyday), "missing").intents).toEqual([everyday]);
  });

  // The footer names the active intent only on an exact binding; a partial match would
  // claim a purpose the configuration does not actually serve.
  it("matches a profile only when both the model and the thinking level agree", () => {
    const store = storeWith(everyday, hardest);
    expect(matchModelIntent(store, { model: everyday.model, thinkingLevel: "medium" })).toEqual(everyday);
    expect(matchModelIntent(store, { model: everyday.model, thinkingLevel: "high" })).toBeUndefined();
    expect(matchModelIntent(store, {
      model: { provider: "openai-codex", model: "gpt-5.6-sol" }, thinkingLevel: "medium",
    })).toBeUndefined();
  });

  it("refuses a payload with an unexpected shape", () => {
    expect(() => parseModelIntents({ schemaVersion: "2.0.0", intents: [] }))
      .toThrow("Model intents schema version is unsupported.");
    expect(() => parseModelIntents({ schemaVersion: "1.0.0", intents: [], extra: true }))
      .toThrow(/Model intents root/);
    expect(() => parseModelIntents({
      schemaVersion: "1.0.0",
      intents: [{ ...everyday, thinkingLevel: "turbo" }],
    })).toThrow("Model intent thinking level is invalid.");
    expect(() => parseModelIntents({
      schemaVersion: "1.0.0",
      intents: [{ ...everyday, model: { provider: "open ai", model: "gpt" } }],
    })).toThrow("Model intent provider is invalid.");
  });

  // Identity is derived from the label so the stored file stays readable, and stays stable
  // afterwards: renaming an intent must not orphan the row the Navigator is editing.
  it("derives a readable identity from the label and disambiguates collisions", () => {
    const empty = createEmptyModelIntents();
    expect(createModelIntentId("Para tarefas cotidianas", empty)).toBe("para-tarefas-cotidianas");
    expect(createModelIntentId("Para as implementações mais difíceis", empty))
      .toBe("para-as-implementacoes-mais-dificeis");
    expect(createModelIntentId("  Rápido!!  ", empty)).toBe("rapido");

    const taken = addModelIntent(empty, { ...everyday, id: "rapido", label: "Rápido" });
    expect(createModelIntentId("Rápido", taken)).toBe("rapido-2");
    expect(createModelIntentId("Rápido", addModelIntent(taken, { ...everyday, id: "rapido-2", label: "Outro" })))
      .toBe("rapido-3");
  });

  it("always derives an identity the parser accepts, whatever the label", () => {
    const empty = createEmptyModelIntents();
    // Labels that slug to nothing, to one character, or past the identity bound still have to
    // produce a usable identity; the label's own bound is a separate rule.
    for (const label of ["!!!", "日本語", "a", "-", "x".repeat(200)]) {
      const id = createModelIntentId(label, empty);
      expect(() => addModelIntent(empty, { ...everyday, id, label: "Fallback" })).not.toThrow();
    }
  });
});
