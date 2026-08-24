export type AgentInvocationMode = "raw" | "mirror";

export type AgentProviderConfig = {
  command: string;
  args: string[];
  useStdin: boolean;
  safeTestMode: boolean;
  invocationMode: AgentInvocationMode;
};

export const defaultPiProviderConfig: AgentProviderConfig = {
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
};

export const safeTestProviderConfig: AgentProviderConfig = {
  command: "cat",
  args: [],
  useStdin: true,
  safeTestMode: true,
  invocationMode: "raw",
};

export function createProviderConfig(input: {
  command: string;
  argsText: string;
  useStdin: boolean;
  safeTestMode: boolean;
  invocationMode?: AgentInvocationMode;
}): AgentProviderConfig {
  if (input.safeTestMode) {
    return safeTestProviderConfig;
  }

  return {
    command: normalizeCommand(input.command),
    args: parseProviderArgs(input.argsText),
    useStdin: input.useStdin,
    safeTestMode: false,
    invocationMode: input.invocationMode ?? defaultPiProviderConfig.invocationMode,
  };
}

export function parseProviderArgs(value: string): string[] {
  return value
    .split(/\s+/)
    .map((arg) => arg.trim())
    .filter(Boolean);
}

export function providerConfigToArgsText(config: AgentProviderConfig): string {
  return config.args.join(" ");
}

export function describeProviderMode(config: AgentProviderConfig): string {
  if (config.safeTestMode) {
    return "Safe test command";
  }
  const transport = config.useStdin ? "stdin" : "prompt argument";
  return config.invocationMode === "mirror" ? `Mirror runtime Pi via ${transport}` : `Raw local Pi via ${transport}`;
}

export function providerModelLabel(config: AgentProviderConfig): string {
  if (config.safeTestMode) {
    return "safe-test/cat";
  }

  const provider = argValue(config.args, "--provider") ?? "default-provider";
  const model = argValue(config.args, "--model") ?? "default-model";
  return `${provider}/${model}`;
}

// Supported-model snapshot from @earendil-works/pi-ai 0.84.2.
// Unknown models remain honest by projecting only Pi-reported token usage.
const PI_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "openai-codex/gpt-5": 400000,
  "openai-codex/gpt-5-codex": 400000,
  "openai-codex/gpt-5.1-codex": 400000,
  "openai-codex/gpt-5.1-codex-max": 400000,
  "openai-codex/gpt-5.1-codex-mini": 400000,
  "openai-codex/gpt-5.2": 400000,
  "openai-codex/gpt-5.2-codex": 400000,
  "openai-codex/gpt-5.3-codex": 400000,
  "openai-codex/gpt-5.4": 1050000,
  "openai-codex/gpt-5.4-mini": 400000,
  "openai-codex/gpt-5.4-nano": 400000,
  "openai-codex/gpt-5.4-pro": 1050000,
};

export function configuredModelContextWindow(config: AgentProviderConfig): number | undefined {
  return PI_MODEL_CONTEXT_WINDOWS[providerModelLabel(config)];
}

export function validateProviderConfig(config: AgentProviderConfig): string[] {
  const errors: string[] = [];
  if (!config.command.trim()) {
    errors.push("Provider command is required.");
  }
  if (config.command.includes("/") && config.command.includes("..")) {
    errors.push("Provider command must not contain parent-directory traversal.");
  }
  if (config.args.some((arg) => arg.includes("\0"))) {
    errors.push("Provider arguments must not contain null bytes.");
  }
  if (!['raw', 'mirror'].includes(config.invocationMode)) {
    errors.push("Provider invocation mode is unsupported.");
  }
  return errors;
}

function normalizeCommand(command: string): string {
  const trimmed = command.trim();
  return trimmed || defaultPiProviderConfig.command;
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}
