import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";

const appStyles = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const rustSource = readFileSync(new URL("../../src-tauri/src/main.rs", import.meta.url), "utf8");
const catalogScript = readFileSync(
  new URL("../../scripts/mirror_conversation_catalog.py", import.meta.url), "utf8",
);

// CR093: the Desktop defends the Journey binding of Conversations it provisioned, because
// Mirror core can rewrite it and is not available for correction. These assertions pin the
// wiring that the pure unit tests cannot reach: which routes repair, which route writes, and
// what the Navigator is told.

describe("journey binding defence wiring", () => {
  it("routes both outbox delivery commands through the binding repair", () => {
    expect(rustSource).toContain("fn run_mirror_append_with_binding_repair<A>");
    const deliveries = rustSource.match(/run_mirror_append_with_binding_repair\(&app, &item,/g);
    expect(deliveries).toHaveLength(3);
    // No delivery command may reach Mirror without the defence in front of it.
    expect(rustSource).not.toMatch(/\n    run_pi_backed_mirror_append\(&item\)\n}/);
  });

  it("proves ownership from durable thread authority before rebinding", () => {
    const repair = rustSource.slice(
      rustSource.indexOf("fn repair_mirror_conversation_journey_binding"),
      rustSource.indexOf("fn run_mirror_append_with_binding_repair<A>"),
    );
    expect(repair).toContain("validate_outbox_generation_authority(app, item)");
    expect(repair).toContain("mirror_append_journey_binding_not_owned");
    expect(repair).toContain('"rebind-journey"');
    // The repair must confirm Mirror answered about the Conversation it was asked about.
    expect(repair).toContain('response.get("conversationId")');
  });

  it("keeps the repair bounded to a single attempt in the delivery path", () => {
    const routine = rustSource.slice(
      rustSource.indexOf("fn run_mirror_append_with_binding_repair_using"),
      rustSource.indexOf("/// Restore the Journey binding"),
    );
    expect(routine).toContain("R: FnOnce(&Value) -> Result<bool, String>");
    expect(routine).toContain("mirror_append_journey_binding_unrepaired");
  });

  it("restores only the Journey column through the bundled support script", () => {
    expect(catalogScript).toContain('"rebind-journey"');
    const operation = catalogScript.slice(
      catalogScript.indexOf('elif args.operation == "rebind-journey"'),
      catalogScript.indexOf('"previousJourneyId": previous_journey_id'),
    );
    expect(operation).toContain("update_conversation(conversation.id, journey=args.journey_id)");
    expect(operation).not.toContain("persona");
    expect(operation).not.toContain("title");
    expect(operation).toContain("persistence_failure");
    // The repair lookup must not require the binding it exists to restore.
    expect(catalogScript).toContain("def owned_conversation(");
  });

  // CR095: the repair writes a Mirror column, so it must leave provenance behind — without
  // ever being able to fail the repair it is recording.
  it("records a performed rebind only after Mirror confirms the restore", () => {
    const repair = rustSource.slice(
      rustSource.indexOf("fn repair_mirror_conversation_journey_binding"),
      rustSource.indexOf("fn run_mirror_append_with_binding_repair<A>"),
    );
    // The confirmation must be read before the record is written.
    expect(repair.indexOf('response.get("rebound")'))
      .toBeLessThan(repair.indexOf("record_mirror_append_journey_rebind"));
    expect(repair).toContain("if rebound {");
    // Best-effort: an unresolvable outbox path must not turn into a repair failure.
    expect(repair).toContain("if let Ok(outbox_path) = mirror_append_outbox_path(app)");
    expect(repair).not.toContain("mirror_append_outbox_path(app)?");
  });

  it("keeps rebind evidence bounded, readable and separate from conflict evidence", () => {
    expect(rustSource).toContain('const MIRROR_APPEND_REBINDS_FILE: &str = "mirror-append-rebinds.jsonl"');
    expect(rustSource).toContain("const MIRROR_APPEND_REBIND_MAX_RECORDS: usize");
    expect(rustSource).toContain("fn list_mirror_append_rebinds");
    // The read command must be registered, or the evidence is unreachable from the app.
    expect(rustSource).toContain("            list_mirror_append_rebinds,");
    const recorder = rustSource.slice(
      rustSource.indexOf("fn record_mirror_append_journey_rebind"),
      rustSource.indexOf("fn read_mirror_append_rebinds"),
    );
    // Provenance about a binding, never a copy of the turn.
    expect(recorder).not.toContain('"messages"');
    expect(recorder).toContain('"previousJourneyId"');
    // A recorder that can return an error could be made to fail the repair later.
    expect(recorder).not.toContain("-> Result");
  });

  it("names the cause of a bounded rejection in the synchronization notices", () => {
    expect(appSource).toContain("describeMirrorAppendRejection");
    expect(appSource).toContain("const mirrorCommitExplanation = mirrorCommitError");
    const occurrences = appSource.match(/className="sync-attention-cause"/g);
    expect(occurrences).toHaveLength(2);
    expect(appStyles).toContain(".dedicated-turn-notice p.sync-attention-cause");
    // Both themes must keep the named cause readable above the muted notice body.
    const lightContract = appStyles.slice(appStyles.indexOf("CR093 light contract"));
    expect(lightContract).toContain('[data-application-theme="daylight"]');
    expect(lightContract).toContain("var(--light-text)");
  });
});
