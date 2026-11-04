/**
 * CV-012.DS-001: the functions that left the app's canonical set and wait, as switches, for the
 * extension mechanism still being built. Both are off until the person turns them on in
 * Settings › Extensions.
 */
export type AppExtensions = { agentField: boolean; agentCanvas: boolean };

export const DEFAULT_APP_EXTENSIONS: Readonly<AppExtensions> = Object.freeze({ agentField: false, agentCanvas: false });

/** Each switch degrades to off on its own, so one bad value cannot turn the other off. */
export function parseAppExtensions(value: unknown): AppExtensions {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    agentField: record.agentField === true,
    agentCanvas: record.agentCanvas === true,
  };
}
