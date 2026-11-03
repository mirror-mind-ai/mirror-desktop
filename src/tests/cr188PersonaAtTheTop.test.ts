import { describe, expect, it } from "vitest";
import { mapPiProcessEventToStreamEvents } from "../agent/piProcessStream";
import { inferMessageSpeaker, stripMessageSpeakerSignature, withCertifiedPersona } from "../app/conversationPresentation";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";
import mainSource from "../../src-tauri/src/main.rs?raw";
import contextSource from "../../src-tauri/src/mirror_context.rs?raw";

// CR188: on 0.3 the Core asks the model to `sign ◇ <persona>` and the model signs last (94 of 126
// answers in production since the cutover; none first). The speaker row read only a first-line
// signature, so it said "Agent" and the signature trailed the answer.
describe("CR188: the persona at the top of the answer", () => {
  const signedLast = "A resposta, em dois parágrafos.\n\nO segundo.\n\n◇ ai-engineer";

  it("names the persona of an answer signed last, and leaves no signature in the body", () => {
    expect(inferMessageSpeaker({ role: "assistant", content: signedLast })).toEqual({
      label: "ai-engineer",
      avatar: "AE",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature(signedLast)).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
    expect(stripMessageSpeakerSignature("Feito.\n◇ software-engineer\n")).toBe("Feito.");
  });

  it("does not take a diamond inside the text, or a last line that is not a persona id, for a signature", () => {
    for (const content of ["Usei o ◇ como marcador no fim ◇ ai-engineer", "Fim.\n\n◇ não é persona"]) {
      expect(inferMessageSpeaker({ role: "assistant", content }).kind).toBe("agent");
      expect(stripMessageSpeakerSignature(content)).toBe(content);
    }
  });

  it("shows the delivered persona from the start of a live turn, and the model's own signature once it comes is not shown", () => {
    const live = withCertifiedPersona("", "ai-engineer");
    expect(inferMessageSpeaker({ role: "assistant", content: live }).label).toBe("ai-engineer");
    const settled = `${live}${signedLast}`;
    expect(inferMessageSpeaker({ role: "assistant", content: settled }).label).toBe("ai-engineer");
    expect(stripMessageSpeakerSignature(settled)).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
    const presentation = projectAgentTurnPresentation({ messageId: "m", content: settled, createdAt: "2026-11-03T15:00:00.000Z", linkedActivity: [] });
    expect(presentation.agentComment).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
  });

  it("reads the line the native side writes for the delivered persona as the persona event", () => {
    // The exact line `mirror_context::persona_event_line` writes (checked in Rust, `cr188_*`).
    const line = '{"journeyId":"mirror-desktop","mode":"mirror","persona":"ai-engineer","schemaVersion":"0.1.0","type":"mirror_context"}';
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` }, { mappingState: {} })).toEqual([
      { type: "persona_context", persona: "ai-engineer" },
    ]);
  });

  it("emits the delivered persona to the run before Pi starts, only when the context reached the turn", () => {
    expect(contextSource).toContain("pub persona: Option<String>");
    const start = mainSource.slice(mainSource.indexOf("mirror_context::prepare_turn(&app"));
    const branch = start.slice(0, start.indexOf("Some(guard)"));
    expect(branch).toMatch(/if let Some\(persona\) = context\.persona \{\s*emit\(\s*&app,\s*&authority,\s*PiProcessEventKind::Stdout,\s*mirror_context::persona_event_line\(&run_authority\.journey_id, &persona\),/);
    expect(branch.indexOf("persona_event_line")).toBeGreaterThan(branch.indexOf("context_file = Some(file)"));
  });
});

// CR188, second build: the dev check showed an unsigned answer lose its persona when the turn
// settled, because the marker the live event writes lives only in the live message. The persona is
// now read from Pi's own record of the context the Mirror delivered, like the response model.
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";
import { createJourneyConversation } from "../domain/journeyConversation";
import { withoutPiDerivedProjections } from "../domain/persistedJourneyConversation";
import { personaSpeaker } from "../app/conversationPresentation";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

describe("CR188: the delivered persona survives settlement and reload", () => {
  const base = createJourneyConversation({ journeyId: "vida-interior", initialMessages: [], now: new Date("2026-11-03T15:00:00Z") });

  it("attributes every answer of a run to the persona delivered with its request, and no other", () => {
    const surface = projectPiBackedConversationSurface(base, {
      schemaVersion: "0.1.0",
      entries: [
        { entryId: "u1", role: "user", visibleText: "Pensadora, me ajude", timestamp: "2026-11-03T15:26:26Z", mirrorPersona: "pensadora" },
        { entryId: "a1", role: "assistant", visibleText: "Vou ler.", timestamp: "2026-11-03T15:26:30Z" },
        { entryId: "a2", role: "assistant", visibleText: "Minha leitura", timestamp: "2026-11-03T15:26:34Z" },
        { entryId: "u2", role: "user", visibleText: "Sem Mirror", timestamp: "2026-11-03T15:30:00Z" },
        { entryId: "a3", role: "assistant", visibleText: "Resposta", timestamp: "2026-11-03T15:30:05Z" },
      ],
    });
    const [, first, second, , third] = surface.messages;
    expect(surface.responsePersonas?.[first.id]).toBe("pensadora");
    expect(surface.responsePersonas?.[second.id]).toBe("pensadora");
    expect(surface.responsePersonas?.[third.id]).toBeUndefined();
  });

  it("is derived from Pi, never stored", () => {
    expect(withoutPiDerivedProjections({ responsePersonas: { a: "pensadora" } })).toEqual({});
  });

  it("names the delivered persona over the text's, and falls back to the text when none was delivered", () => {
    const unsigned = { role: "assistant" as const, content: "Minha leitura" };
    expect(personaSpeaker(unsigned, "pensadora")).toEqual({ label: "pensadora", avatar: "P", kind: "persona" });
    expect(personaSpeaker({ role: "assistant", content: "Feito.\n\n◇ ai-engineer" }, undefined).label).toBe("ai-engineer");
    expect(personaSpeaker(unsigned, undefined).kind).toBe("agent");
  });

  it("gives the run card the persona of its closing answer", () => {
    expect(transcriptSource).toContain("const responsePersona = conversation.responsePersonas?.[messageId];");
    expect(transcriptSource).toMatch(/const speaker = personaSpeaker\(\{\s*\.\.\.closing\.message,[\s\S]{0,160}\}, closing\.responsePersona\);/);
  });
});

// CR188, third build: the dev check failed again. An ordinary turn settles on the reader's surface
// (CR184) and is not reprojected from Pi, so the derived map never held the new answer. The live
// run records the delivered persona on that surface itself, where settlement keeps it.
import appSource from "../app/App.tsx?raw";

describe("CR188: the live run puts the delivered persona on the surface settlement keeps", () => {
  it("records the persona event against the run's answer in responsePersonas", () => {
    const handler = appSource.slice(appSource.indexOf('if (event.type === "persona_context") {'));
    const body = handler.slice(0, handler.indexOf('if (event.type === "message_delta"'));
    expect(body).toMatch(/responsePersonas: \{ \.\.\.(\w+)\.responsePersonas, \[assistantMessage\.id\]: event\.persona \}/);
  });
});
