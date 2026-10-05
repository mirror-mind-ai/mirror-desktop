import { describe, expect, it } from "vitest";
import tauriSource from "../../src-tauri/src/main.rs?raw";

/**
 * CR123: the arithmetic lives in Rust and is unit-tested there. These are the guards that cannot be
 * expressed as a unit test, because the two defects were a refusal and a gate inside a Tauri command
 * that needs an AppHandle. Both are structural, so a source assertion is the honest instrument.
 */
// The guard looks at the production code only. CR121's own test carries that error string as
// realistic sample data, which is worth keeping, so a whole-file assertion would fail for the wrong
// reason — and a guard that fails for the wrong reason gets relaxed rather than fixed.
const productionSource = tauriSource.slice(0, tauriSource.indexOf("\nmod tests {"));

describe("CR123: a Journey can mint its first publication receipt", () => {
  it("no longer refuses to publish for the lack of a receipt it could never write", () => {
    // Two production Journeys failed every ordinary turn on exactly this error.
    expect(productionSource).not.toContain("Conversation Segment completion receipt is unavailable.");
    expect(productionSource.length).toBeGreaterThan(1000); // the slice actually found the boundary
  });

  it("no longer gates the receipt on every Segment the manifest declares having a file", () => {
    // `all_present` conflated the Pi session's compaction structure with the set of published files.
    // A manifest legitimately declares chapters from before publication existed, so the gate was
    // unreachable and the receipt was never written.
    expect(tauriSource).not.toContain("let all_present =");
    expect(tauriSource).not.toContain("if all_present {");
  });

  it("computes the historical total through the function that has the three cases", () => {
    expect(tauriSource).toContain("let historical_message_count = receipt_historical_message_count(");
    // and the scan runs only when there is nothing to carry forward, so it costs once per generation
    expect(tauriSource).toContain("if includes_all_segments || prior_historical_count.is_some() {");
    expect(tauriSource).toContain("published_closed_message_count(&projection_dir, manifest_segments, &counted_closed_ids)");
  });

  it("keeps CR118's delta rule, which is what stops a skipped chapter being erased", () => {
    expect(tauriSource).toContain(
      "let includes_all_segments = projections.len() == manifest_segments.len() && !skipped_published_closed;",
    );
  });

  it("remembers which closed chapters the bundle counted, so the scan cannot double count", () => {
    expect(tauriSource).toContain("counted_closed_ids.insert(projection.segment_id.clone());");
  });
});
