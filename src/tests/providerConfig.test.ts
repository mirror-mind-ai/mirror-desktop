import { describe, expect, it } from "vitest";
import {
  configuredModelContextWindow,
  createProviderConfig,
  defaultPiProviderConfig,
  describeProviderMode,
  parseProviderArgs,
  providerConfigToArgsText,
  providerModelLabel,
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
