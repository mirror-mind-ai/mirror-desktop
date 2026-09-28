import type { PiContextState } from "../app/contextUsageState";

/**
 * CR079: how much the reading can claim. The terminal keeps a number permanently on screen
 * and the Desktop replaced it with sentences, so the Navigator was left with nothing at the
 * moment the reading mattered. An approximation is marked, never withheld.
 */
export type ContextReadingConfidence = "measured" | "approximate" | "unknown" | "absent";

export type ContextReading = {
  /** The one line the Navigator scans. Always `<value>/<window>`, never prose. */
  text: string;
  confidence: ContextReadingConfidence;
  /** The diagnostic sentence, moved off the label and onto the tooltip. */
  detail: string;
  tone?: "warning" | "error";
};

const UNKNOWN = "?";
const ABSENT = "–";

const detailForState: Record<PiContextState, string> = {
  available: "Measured from the Pi session by the selected model.",
  checking: "Reading context stats from the Pi session.",
  waiting: "No usage recorded yet; the reading is an estimate until the model reports.",
  estimated: "Approximate: derived from message sizes or a compaction result, not reported by the model.",
  updating: "A turn is running; the reading updates when it reports usage.",
  not_initialized: "Pi context is not initialized for this Conversation.",
  unknown_after_compaction: "Estimated from the compaction result; approximate until the next response reports usage.",
  session_missing: "The Pi session file for this Conversation is unavailable.",
  model_mismatch: "Measured by another model, so the percentage is indicative under the selected one.",
  inspection_failed: "The Pi session could not be inspected for context stats.",
};

const absentStates: ReadonlySet<PiContextState> = new Set(["not_initialized", "session_missing"]);

export function formatContextTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatPercent(percent: number): string {
  // Rounding a young Conversation to `0%` would read as "nothing is loaded" rather than
  // "barely anything is", so the small end keeps a decimal.
  return percent < 10 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`;
}

export function projectContextReading(input: {
  state: PiContextState;
  tokens: number | null;
  contextWindow: number | null;
  approximate?: boolean;
}): ContextReading {
  const { state, tokens, contextWindow } = input;
  const window = contextWindow === null ? UNKNOWN : formatContextTokens(contextWindow);
  const detail = detailForState[state];

  if (tokens === null) {
    const absent = absentStates.has(state);
    return {
      text: `${absent ? ABSENT : UNKNOWN}/${window}`,
      confidence: absent ? "absent" : "unknown",
      detail,
    };
  }

  // A measurement taken by another model is still the honest token count of this
  // Conversation; only its percentage is indicative, which is what the marker says.
  const approximate = Boolean(input.approximate) || state !== "available";
  const marker = approximate ? "~" : "";

  if (contextWindow === null) {
    return {
      text: `${marker}${formatContextTokens(tokens)}/${UNKNOWN}`,
      confidence: approximate ? "approximate" : "measured",
      detail,
    };
  }

  const percent = (tokens / contextWindow) * 100;
  return {
    text: `${marker}${formatPercent(percent)}/${window}`,
    confidence: approximate ? "approximate" : "measured",
    detail,
    ...(percent > 90 ? { tone: "error" as const } : percent > 70 ? { tone: "warning" as const } : {}),
  };
}
