import { parseReleaseReading, type ReleaseReading } from "./releaseReading";

export type WhatsNewState = {
  schemaVersion: "1.0.0";
  pending?: ReleaseReading;
  installed?: ReleaseReading;
  acknowledgedVersion?: string;
};

export type ResolvedWhatsNewState = WhatsNewState & { reminder: boolean };

export function emptyWhatsNewState(): WhatsNewState {
  return { schemaVersion: "1.0.0" };
}

export function parseWhatsNewState(input: unknown): WhatsNewState {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return emptyWhatsNewState();
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== "1.0.0") return emptyWhatsNewState();
  const pendingVersion = typeof (value.pending as Record<string, unknown> | undefined)?.version === "string"
    ? (value.pending as Record<string, unknown>).version as string
    : "";
  const installedVersion = typeof (value.installed as Record<string, unknown> | undefined)?.version === "string"
    ? (value.installed as Record<string, unknown>).version as string
    : "";
  const pending = pendingVersion ? parseReleaseReading(toWireReading(value.pending), pendingVersion) : undefined;
  const installed = installedVersion ? parseReleaseReading(toWireReading(value.installed), installedVersion) : undefined;
  const acknowledgedVersion = typeof value.acknowledgedVersion === "string" && value.acknowledgedVersion.length <= 100
    ? value.acknowledgedVersion
    : undefined;
  return { schemaVersion: "1.0.0", pending, installed, acknowledgedVersion };
}

function toWireReading(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  const value = input as Record<string, unknown>;
  return {
    schema_version: value.schemaVersion,
    product: value.product,
    version: value.version,
    title: value.title,
    digest: value.digest,
    highlights: value.highlights,
    body: value.body,
    body_sha256: value.bodySha256,
    release_notes_url: value.releaseNotesUrl,
  };
}

export function stagePendingRelease(state: WhatsNewState, reading: ReleaseReading): WhatsNewState {
  return { ...state, schemaVersion: "1.0.0", pending: reading };
}

export function resolveWhatsNewState(state: WhatsNewState, runningVersion: string): ResolvedWhatsNewState {
  const exactPending = state.pending?.version === runningVersion ? state.pending : undefined;
  const installed = exactPending ?? (state.installed?.version === runningVersion ? state.installed : undefined);
  const acknowledgedVersion = state.acknowledgedVersion === runningVersion ? state.acknowledgedVersion : undefined;
  return {
    schemaVersion: "1.0.0",
    installed,
    acknowledgedVersion,
    reminder: Boolean(installed && acknowledgedVersion !== runningVersion),
  };
}

export function acknowledgeWhatsNew(state: WhatsNewState, version: string): WhatsNewState {
  if (state.installed?.version !== version) return state;
  return { ...state, acknowledgedVersion: version };
}
