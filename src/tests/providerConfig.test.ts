import { describe, expect, it } from "vitest";
import {
  configuredModelContextWindow,
  createProviderConfig,
  defaultPiProviderConfig,
  describeProviderMode,
  parseProviderArgs,
  providerConfigToArgsText,
  providerModelLabel,
  projectAgentProfile,
  safeTestProviderConfig,
  validateProviderConfig,
} from "../agent/providerConfig";

describe("agent provider configuration", () => {
  it("defines safe default Pi invocation settings", () => {
    expect(defaultPiProviderConfig).toEqual({
      command: "pi",
      args: [
        "--print",
        "--provider",
        "openai-codex",
        "--model",
        "gpt-5.4-mini",
      ],
      useStdin: false,
      safeTestMode: false,
      invocationMode: "mirror",
    });
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
