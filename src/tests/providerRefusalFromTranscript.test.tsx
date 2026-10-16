import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_FAILURE_MAX_CHARS,
  deriveInactiveNativeAttemptCandidate,
} from "../domain/inactiveNativeAttempt";
import { InterruptedNativeAttemptNotice } from "../app/InterruptedNativeAttemptNotice";
import type { DedicatedPiTranscriptEntry } from "../app/journeyThreadStorage";
import appSource from "../app/App.tsx?raw";

/**
 * CR159 (RS025 Batch A): say why the provider refused a turn.
 *
 * Field, 2026-10-16, production alpha.50, Journey alissonvale-com: two turns died as
 * `process_died` with `terminalEvidence.piExecution: null` and no provider detail, while the Pi
 * session held eight assistant entries, each `content: []`, zero usage, `stopReason: "error"` and
 * an `errorMessage` naming the provider's refusal. CR054 reads a provider failure from the stream
 * `type: "error"` event into the journal; this failure never took that path. It arrived as a
 * transcript entry, and after the fourth attempt that entry is the leaf of the active branch — Pi
 * removes each failed attempt with a `context_edit` before retrying, but not the last one.
 *
 * The repair reads the leaf. The candidate that already identifies the failed leaf carries the
 * provider's words, and the notice that already knows how to show a provider failure shows them.
 */

const authority = { journeyId: "alissonvale-com", threadId: "desktop-thread-alissonvale-com-18de8c5db6b02b50", generation: 1, piSessionId: "session" };
const fieldMessage = "Codex error: An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists.";

function entry(partial: Partial<DedicatedPiTranscriptEntry> & Pick<DedicatedPiTranscriptEntry, "entryId" | "role">) {
  return { visibleText: "", stopReason: null, ...partial };
}

describe("CR159: the candidate carries the provider's own words from an error leaf", () => {
  it("reads errorMessage from an assistant error leaf, in the field's exact shape", () => {
    const candidate = deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "968faaab",
      incompleteUserEntryId: "91d345f8",
      entries: [
        entry({ entryId: "91d345f8", role: "user", visibleText: "Eu faria assim:" }),
        entry({ entryId: "968faaab", role: "assistant", visibleText: "", stopReason: "error", errorMessage: fieldMessage }),
      ],
    });
    expect(candidate).toEqual({ ...authority, userEntryId: "91d345f8", leafEntryId: "968faaab", providerFailure: fieldMessage });
  });

  it("bounds the message and marks the cut", () => {
    const long = "x".repeat(PROVIDER_FAILURE_MAX_CHARS + 50);
    const candidate = deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "err",
      incompleteUserEntryId: "u",
      entries: [entry({ entryId: "u", role: "user", visibleText: "q" }), entry({ entryId: "err", role: "assistant", stopReason: "error", errorMessage: long })],
    });
    expect(candidate?.providerFailure).toHaveLength(PROVIDER_FAILURE_MAX_CHARS + 1);
    expect(candidate?.providerFailure?.endsWith("…")).toBe(true);
  });

  it("carries nothing when the error leaf has no message, or the message is blank", () => {
    for (const errorMessage of [undefined, null, "   "]) {
      const candidate = deriveInactiveNativeAttemptCandidate(authority, {
        leafEntryId: "err",
        incompleteUserEntryId: "u",
        entries: [entry({ entryId: "u", role: "user", visibleText: "q" }), entry({ entryId: "err", role: "assistant", stopReason: "error", errorMessage })],
      });
      expect(candidate).toBeDefined();
      expect(candidate && "providerFailure" in candidate).toBe(false);
    }
  });

  // Control: an incomplete user leaf is still a candidate and carries no provider words.
  it("carries nothing from a plain incomplete user leaf", () => {
    const candidate = deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "u",
      incompleteUserEntryId: "u",
      entries: [entry({ entryId: "u", role: "user", visibleText: "q" })],
    });
    expect(candidate && "providerFailure" in candidate).toBe(false);
  });

  /**
   * The absence assert the CR scope demands: the error entry is still not an answer. If it ever
   * counted as one, an empty turn would be smuggled into the transcript as completed.
   */
  it("still refuses to treat an error entry as a completed answer", () => {
    const candidate = deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "err",
      incompleteUserEntryId: "u",
      entries: [entry({ entryId: "u", role: "user", visibleText: "q" }), entry({ entryId: "err", role: "assistant", stopReason: "error", errorMessage: fieldMessage })],
    });
    expect(candidate).toBeDefined();
    expect(() => deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "ok",
      incompleteUserEntryId: "u",
      entries: [entry({ entryId: "u", role: "user", visibleText: "q" }), entry({ entryId: "ok", role: "assistant", visibleText: "answer", stopReason: "stop" })],
    })).toThrow("inactive_native_attempt_evidence_invalid");
  });
});

describe("CR159: the notice shows the provider's words, and the App hands them over", () => {
  it("renders the transcript-derived failure through the existing provider line", () => {
    const html = renderToStaticMarkup(<InterruptedNativeAttemptNotice providerFailure={fieldMessage} />);
    expect(html).toContain("The provider reported: Codex error: An error occurred");
    expect(html).not.toContain("<button");
  });

  /**
   * CR054's journal detail stays first — it is the durable, run-correlated source. The transcript
   * leaf is the fallback for the failure that never reached the journal.
   */
  it("prefers the journal's provider detail and falls back to the candidate's", () => {
    const wiring = /<InterruptedNativeAttemptNotice\s+providerFailure=\{interruptedProviderFailure\s*\?\?\s*inactiveNativeAttempt\?\.providerFailure\}/;
    expect(appSource).toMatch(wiring);
    expect((appSource.match(/<InterruptedNativeAttemptNotice\b/g) ?? []).length).toBe(1);
  });
});
