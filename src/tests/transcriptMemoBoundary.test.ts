import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";
import coordinatorSource from "../app/journeyNavigationCoordinator.ts?raw";
import { deriveJourneyNavigationPresentation } from "../app/journeyNavigationCoordinator";
import { createInitialJourneyRuntimeState } from "../app/journeyRuntimeState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { readyThread } from "./fixtures/readyThread";

/**
 * CR149: `ConversationTranscript` is wrapped in `memo`, and for that to mean anything **every one of
 * its props must be stable**. One inline object or arrow function defeats the shallow compare and
 * the memo prevents nothing — which is what it did, for as long as
 * `onLoadEarlierHistory={() => …}` was written at the call site.
 *
 * That mattered because `setFinishingPhases` fires once per settlement phase, so the root re-renders
 * about fourteen times during one `Finishing` while `setConversation` is never called — the messages
 * do not change for the whole window, and the transcript re-rendered anyway.
 *
 * An audit of all 20 props found exactly two unstable ones. The rest were already stable because
 * `deriveJourneyNavigationPresentation` returns *selected* objects and the same `messages` array
 * reference rather than rebuilt ones, so extracting its fields yields stable values even though the
 * wrapper object is fresh every render. **The audit is why five unnecessary memos were not added to
 * the application's central derivation.**
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function transcriptCallSite(): string {
  const source = withoutComments(appSource);
  const start = source.indexOf("<ConversationTranscript");
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("/>", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("CR149: the transcript's memo boundary", () => {
  it("is still a memo boundary at all", () => {
    expect(withoutComments(transcriptSource))
      .toContain("export const ConversationTranscript = memo(");
  });

  /**
   * The allow-list is the guard: every prop value must be a bare identifier or a simple member
   * access. An explicit shape is used rather than forbidding `=\{\{` and `=\{() =>`, because those
   * are two spellings of the defect and an allow-list covers the ones nobody has thought of —
   * including a ternary that happens to build an object, which is how `liveResponseModel` was
   * written.
   */
  it("passes only stable identities, never a value built in the JSX", () => {
    const call = transcriptCallSite();
    const props = [...call.matchAll(/^\s+([a-zA-Z]+)=\{([\s\S]*?)\}\s*$/gm)]
      .map(([, name, value]) => ({ name, value: value.trim() }));
    expect(props.length).toBeGreaterThanOrEqual(18);
    const offenders = props.filter(({ value }) => !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(value));
    expect(offenders, `props built inside the JSX: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  /**
   * The two the audit found, pinned by name so a revert is legible rather than merely failing the
   * shape rule above.
   */
  it("keeps the two repaired props out of the JSX", () => {
    const source = withoutComments(appSource);
    expect(source).toContain("liveResponseModel={liveResponseModel}");
    expect(source).toContain("onLoadEarlierHistory={requestEarlierHistory}");
    expect(source).not.toContain("onLoadEarlierHistory={() =>");
  });

  /**
   * `requestEarlierHistory` must be stable **and** must not go stale.
   * `loadCompleteSegmentHistory` closes over `journeyThreadState`, `selectedJourney`,
   * `conversation.id` and `historicalSegmentCount`, so an empty dependency list on the function
   * itself would freeze all four. The ref is what lets the identity be constant while the behaviour
   * stays current, and an empty dependency list is therefore *required* here rather than sloppy.
   */
  it("keeps the earlier-history action stable without freezing what it closes over", () => {
    const source = withoutComments(appSource);
    expect(source).toContain("const loadCompleteSegmentHistoryRef = useRef(loadCompleteSegmentHistory)");
    expect(source).toContain("loadCompleteSegmentHistoryRef.current = loadCompleteSegmentHistory;");
    expect(source).toContain("void loadCompleteSegmentHistoryRef.current();");
    const callback = source.indexOf("const requestEarlierHistory = useCallback(");
    expect(callback).toBeGreaterThan(-1);
    const body = source.slice(callback, source.indexOf("}, [", callback) + 8);
    expect(body).toContain("}, []);");
  });

  /**
   * One spelling of the action, so a future reader cannot mistake the stable call site for the odd
   * one out and "fix" it back into a lambda.
   */
  it("uses one spelling of the earlier-history action everywhere", () => {
    const source = withoutComments(appSource);
    expect(source.split("void loadCompleteSegmentHistory()").length - 1).toBe(0);
    expect(source.split("requestEarlierHistory").length - 1).toBeGreaterThanOrEqual(4);
  });

  /**
   * The memo is only worth anything while `messages` keeps arriving as the same array reference.
   * If the coordinator ever started rebuilding it — a `map`, a spread, a filter — every prop below
   * it would go unstable again and this whole repair would silently stop working.
   */
  it("keeps the coordinator handing back the conversation's own message array", () => {
    expect(withoutComments(appSource)).toContain("const messages = navigationPresentation.messages;");
    // The line that would actually break it lives in the coordinator, not here. A `map`, a spread
    // or a filter there would hand back a new array every render and every prop below would go
    // unstable again, with nothing at the call site to show it.
    const coordinator = withoutComments(coordinatorSource);
    expect(coordinator).toContain("messages: conversation?.messages ?? [],");
    const returned = coordinator.slice(coordinator.indexOf("return {"), coordinator.length);
    expect(returned).not.toContain("messages: [...");
    expect(returned).not.toContain("messages: conversation?.messages.map");
    expect(returned).not.toContain("messages: conversation?.messages.filter");
  });
});

/**
 * The keystone of the audit, exercised rather than reasoned about.
 *
 * Everything above rests on one claim: `deriveJourneyNavigationPresentation` hands back the
 * conversation's **own** message array and the conversation object itself, so the fields the
 * transcript receives are stable even though the wrapper object is rebuilt on every render. That
 * claim is testable, because the derivation is a pure function — and it is what made five
 * unnecessary memos through the application's central derivation unnecessary.
 */
describe("CR149: what the navigation derivation hands back is stable by reference", () => {
  const thread = readyThread("mirror-desktop");
  const conversation = createDedicatedJourneyConversation({
    thread,
    initialMessages: [
      { id: "user-1", role: "user", content: "a question", createdAt: "2026-10-13T00:00:00.000Z" },
      { id: "assistant-1", role: "assistant", content: "an answer", createdAt: "2026-10-13T00:00:01.000Z" },
    ],
  });
  const input = {
    runtimeState: createInitialJourneyRuntimeState(),
    selectedJourneyId: "mirror-desktop",
    loadedConversation: conversation,
  };

  it("returns the same message array and conversation across two calls", () => {
    const first = deriveJourneyNavigationPresentation(input);
    const second = deriveJourneyNavigationPresentation(input);
    expect(second.messages).toBe(first.messages);
    expect(second.conversation).toBe(first.conversation);
    // And it is the conversation's own array, not a copy that happens to be equal.
    expect(first.messages).toBe(conversation.messages);
  });

  /**
   * The wrapper *is* rebuilt, and that is fine — it is never passed to the transcript. Stating it
   * as a passing assertion rather than a footnote is what stops someone from "fixing" it with a
   * memo that would buy nothing.
   */
  it("rebuilds the wrapper object, which is why memoizing it would buy nothing", () => {
    const first = deriveJourneyNavigationPresentation(input);
    const second = deriveJourneyNavigationPresentation(input);
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  /**
   * The honest limit of the stability claim, pinned so it is not mistaken for unconditional: with
   * no conversation the derivation returns a fresh `[]` every call. That is the empty case, where
   * the transcript has nothing to render, so it does not matter for the friction — but a future
   * reader should not have to discover it.
   */
  it("does not pretend the empty case is stable", () => {
    const empty = { runtimeState: createInitialJourneyRuntimeState(), selectedJourneyId: "mirror-desktop" };
    const first = deriveJourneyNavigationPresentation(empty);
    const second = deriveJourneyNavigationPresentation(empty);
    expect(first.messages).toEqual([]);
    expect(second.messages).not.toBe(first.messages);
  });
});
