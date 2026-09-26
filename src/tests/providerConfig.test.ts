import { describe, expect, it } from "vitest";
import {
  configuredModelContextWindow,
  createProviderConfig,
  defaultPiProviderConfig,
  describeProviderMode,
  parseProviderArgs,
  profileOwnedArgumentFlags,
  providerConfigToArgsText,
  describeComposerModelSelection,
  providerModelLabel,
  projectAgentProfile,
  safeTestProviderConfig,
  validateProviderConfig,
} from "../agent/providerConfig";

describe("agent provider configuration", () => {
  it("defines safe default Pi invocation settings without model literals", () => {
    expect(defaultPiProviderConfig).toEqual({
      command: "pi",
      args: ["--print"],
      useStdin: false,
      safeTestMode: false,
      invocationMode: "mirror",
    });
  });

  it("names the profile-owned flags a user typed into the arguments field", () => {
    expect(profileOwnedArgumentFlags("--print --no-session")).toEqual([]);
    expect(profileOwnedArgumentFlags("--print --model gpt-5.5 --thinking high"))
      .toEqual(["--model", "--thinking"]);
    expect(profileOwnedArgumentFlags("--provider openai-codex")).toEqual(["--provider"]);
  });

  it("parses argument text without shell interpretation", () => {
    expect(parseProviderArgs("--print   --no-tools --no-session")).toEqual(["--print", "--no-tools", "--no-session"]);
  });

  it("uses cat and stdin for safe test mode", () => {
    const config = createProviderConfig({
      command: "pi",
      argsText: "--print",
      useStdin: false,
      safeTestMode: true,
      invocationMode: "mirror",
    });

    expect(config).toEqual(safeTestProviderConfig);
    expect(describeProviderMode(config)).toBe("Safe test command");
  });

  it("round-trips args for visible Mirror-mediated configuration", () => {
    const config = createProviderConfig({
      command: "pi",
      argsText: "--print --no-session --provider openai-codex --model gpt-5.4-mini",
      useStdin: false,
      safeTestMode: false,
      invocationMode: "mirror",
    });

    expect(providerConfigToArgsText(config)).toBe("--print --no-session --provider openai-codex --model gpt-5.4-mini");
    expect(providerModelLabel(config)).toBe("openai-codex/gpt-5.4-mini");
    expect(configuredModelContextWindow(config)).toBe(400000);
    expect(describeProviderMode(config)).toBe("Mirror runtime Pi via prompt argument");
    expect(validateProviderConfig(config)).toEqual([]);
  });

  it("projects one effective model and thinking selection without conflicting flags", () => {
    const projected = projectAgentProfile({
      ...defaultPiProviderConfig,
      args: ["--print", "--provider", "old", "--model=old-model", "--thinking", "low", "--no-tools"],
    }, {
      journeyId: "alpha",
      model: { provider: "anthropic", model: "claude-sonnet-4-6" },
      thinkingLevel: "high",
      invocationMode: "mirror",
      modelSource: "journey",
      thinkingSource: "journey",
    });

    expect(projected.args).toEqual([
      "--print", "--no-tools", "--provider", "anthropic", "--model", "claude-sonnet-4-6", "--thinking", "high",
    ]);
  });

  it("omits thinking for the native Pi default and never rewrites safe-test mode", () => {
    const effective = {
      journeyId: "alpha",
      model: { provider: "openai-codex", model: "gpt-5.4" },
      thinkingLevel: "pi-default" as const,
      invocationMode: "mirror" as const,
      modelSource: "global" as const,
      thinkingSource: "global" as const,
    };
    expect(projectAgentProfile(defaultPiProviderConfig, effective).args).not.toContain("--thinking");
    expect(projectAgentProfile(safeTestProviderConfig, effective)).toEqual(safeTestProviderConfig);
  });

  it("labels raw local Pi separately", () => {
    const config = createProviderConfig({
      command: "pi",
      argsText: "--print",
      useStdin: true,
      safeTestMode: false,
      invocationMode: "raw",
    });

    expect(describeProviderMode(config)).toBe("Raw local Pi via stdin");
  });

  it("rejects empty command before invocation", () => {
    expect(validateProviderConfig({ command: "", args: [], useStdin: false, safeTestMode: false, invocationMode: "mirror" })).toEqual([
      "Provider command is required.",
    ]);
  });
});

// CR078: the Composer descriptor has to represent the whole selection. Showing only the
// model made a thinking-level change invisible: the Navigator chose `high` and the footer
// read the same as before.
describe("Composer model descriptor", () => {
  const config = projectAgentProfile(defaultPiProviderConfig, {
    journeyId: "journey-a",
    model: { provider: "openai-codex", model: "gpt-5.5" },
    thinkingLevel: "high",
    invocationMode: "mirror",
    modelSource: "journey",
    thinkingSource: "journey",
  });

  it("names the thinking level the selection actually carries", () => {
    expect(describeComposerModelSelection(config, "high")).toBe("openai-codex/gpt-5.5 · high");
  });

  it("stays quiet when the thinking level is Pi's own default", () => {
    expect(describeComposerModelSelection(config, "pi-default")).toBe("openai-codex/gpt-5.5");
  });

  it("claims no thinking level in safe test mode, where none is passed", () => {
    const safe = { ...config, safeTestMode: true };
    expect(describeComposerModelSelection(safe, "high")).toBe("safe-test/cat");
  });
});
