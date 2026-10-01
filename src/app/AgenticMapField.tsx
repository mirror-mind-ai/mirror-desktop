import type { ReactNode } from "react";
import type {
  AdmittedAttachment,
  AdmittedContext,
  AdmittedPresence,
  AdmittedRead,
  PromptEnvelopeClass,
} from "../domain/admittedContext";

/**
 * CR105: the contextual layer of the Agentic Map. The workspace tree below it answers "what
 * exists"; this layer answers "what entered the agent's field, and how". The two are kept
 * apart on purpose — availability is quiet relief, admission is a claim that needs evidence.
 *
 * Shape carries presence. Colour only reinforces it, so a Navigator in forced colours or with
 * a different accent still reads the same three states.
 */

export type AdmissionViewState =
  | { status: "loading" }
  | { status: "ready"; context: AdmittedContext }
  | { status: "unavailable"; reason: string };

export type AgenticMapTerritory = "briefing" | "conversation" | "sources" | "instructions";

type PresenceDescriptor = { glyph: string; label: string };

const PRESENCE: Record<AdmittedPresence | "available", PresenceDescriptor> = {
  available: { glyph: "○", label: "No admission evidence" },
  seen_in_conversation: { glyph: "●", label: "Seen in this Conversation" },
  present_now: { glyph: "◉", label: "Present now" },
};

const ENVELOPE_NAMES: Record<PromptEnvelopeClass, string> = {
  mirror_desktop: "Mirror Desktop Journey authority",
  nautilus_harness: "Nautilus Harness Journey authority",
  unknown: "Unrecognised authority header",
  raw: "No authority header",
};

export function ContextPresenceMarker({ presence }: { presence: AdmittedPresence | "available" }) {
  const descriptor = PRESENCE[presence];
  return (
    <span className="context-presence-marker" data-presence={presence}>
      <span aria-hidden="true">{descriptor.glyph}</span>
      <span className="sr-only">{descriptor.label}</span>
    </span>
  );
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

export function AgenticMapHeader({
  admission,
  conversationName,
}: {
  admission: AdmissionViewState;
  conversationName?: string;
}) {
  const subject = conversationName
    ? `Partial context of Conversation “${conversationName}”`
    : "Partial context of the active Conversation";

  return (
    <header className="agentic-map-header">
      <div className="agentic-map-title">
        <h2>Agentic Map</h2>
        <p className="agentic-map-subject">{subject}</p>
      </div>
      {admission.status === "ready" ? <AgenticMapCounts context={admission.context} /> : null}
      {admission.status === "loading" ? <p className="agentic-map-counts" role="status">Reading admission evidence…</p> : null}
      {/* The blind spot is permanent, so it is stated permanently rather than discovered. */}
      <p className="agentic-map-blind-spot">Reads performed through shell commands are not detected.</p>
    </header>
  );
}

function AgenticMapCounts({ context }: { context: AdmittedContext }) {
  const { presentNow, seenInConversation, placeableInWorkspace } = context.counts;
  // A count with no marker beneath it looks like a broken surface. It is not: the agent reads
  // material outside this workspace, and relative paths name a directory we cannot identify.
  const elsewhere = context.reads.length - placeableInWorkspace;

  return (
    <>
      <p className="agentic-map-counts">
        <span>{`${presentNow} ${plural(presentNow, "item")} evidenced present now`}</span>
        {context.presentNowDerivable ? (
          <span>{`${seenInConversation} more seen in this Conversation`}</span>
        ) : (
          <span>This Conversation has not been compacted, so everything seen is still present.</span>
        )}
      </p>
      {elsewhere > 0 ? (
        <p className="agentic-map-elsewhere">
          {`${elsewhere} of ${context.reads.length} ${plural(context.reads.length, "read")} name material outside this workspace, so they carry no marker on the tree.`}
        </p>
      ) : null}
    </>
  );
}

export function AgenticMapLegend({ presentNowDerivable }: { presentNowDerivable: boolean }) {
  return (
    <ul className="agentic-map-legend" aria-label="Presence legend">
      <LegendItem presence="available" detail="available in the workspace" />
      {presentNowDerivable ? <LegendItem presence="seen_in_conversation" detail="seen earlier in this Conversation" /> : null}
      <LegendItem presence="present_now" detail="evidenced in the current window" />
    </ul>
  );
}

function LegendItem({ presence, detail }: { presence: AdmittedPresence | "available"; detail: string }) {
  return (
    <li>
      <span className="context-presence-marker" data-presence={presence} aria-hidden="true">{PRESENCE[presence].glyph}</span>
      <span>{PRESENCE[presence].label}</span>
      <span className="agentic-map-legend-detail">{detail}</span>
    </li>
  );
}

export function AgentFieldRegion({
  admission,
  selectedTerritory,
  onSelectTerritory,
}: {
  admission: AdmissionViewState;
  selectedTerritory?: AgenticMapTerritory;
  onSelectTerritory: (territory: AgenticMapTerritory) => void;
}) {
  if (admission.status === "unavailable") {
    return (
      <div className="agentic-map-field">
        <p className="operational-artifacts-section-label">Agent&apos;s field</p>
        <div className="agentic-map-field-state">
          <strong>Admission evidence unavailable</strong>
          <p>{admission.reason}</p>
        </div>
      </div>
    );
  }
  if (admission.status === "loading") {
    return (
      <div className="agentic-map-field">
        <p className="operational-artifacts-section-label">Agent&apos;s field</p>
        <p className="agentic-map-field-state" role="status">Reading the agent&apos;s field…</p>
      </div>
    );
  }

  const { context } = admission;
  const readSources = context.attachments.filter((attachment) => attachment.state === "read").length;

  return (
    <div className="agentic-map-field">
      <p className="operational-artifacts-section-label">Agent&apos;s field</p>
      <ul className="agentic-map-territories">
        <TerritoryRow
          territory="briefing"
          name="Journey briefing"
          // Measured: the briefing is never injected into a Desktop turn, so it can only ever
          // be available here. Showing it as anything else would be the map's first lie.
          presence="available"
          detail="not evidenced"
          selected={selectedTerritory === "briefing"}
          onSelect={onSelectTerritory}
        />
        <TerritoryRow
          territory="conversation"
          name="Active Conversation"
          presence={context.conversation.entryCount > 0 ? "present_now" : "available"}
          detail={context.conversation.compactionCount > 0
            ? `${context.conversation.compactionCount} ${plural(context.conversation.compactionCount, "chapter")}`
            : "one chapter"}
          selected={selectedTerritory === "conversation"}
          onSelect={onSelectTerritory}
        />
        <TerritoryRow
          territory="sources"
          name="Sources"
          presence={readSources > 0 ? "present_now" : "available"}
          detail={context.attachments.length > 0 ? `${readSources} of ${context.attachments.length} read` : "none attached"}
          selected={selectedTerritory === "sources"}
          onSelect={onSelectTerritory}
        />
        <TerritoryRow
          territory="instructions"
          name="Instructions"
          presence={context.instructions.length > 0 ? "present_now" : "available"}
          detail={`${context.instructions.length} ${plural(context.instructions.length, "class", "classes")}`}
          selected={selectedTerritory === "instructions"}
          onSelect={onSelectTerritory}
        />
      </ul>
      <AgenticMapLegend presentNowDerivable={context.presentNowDerivable} />
    </div>
  );
}

function TerritoryRow({
  territory,
  name,
  presence,
  detail,
  selected,
  onSelect,
}: {
  territory: AgenticMapTerritory;
  name: string;
  presence: AdmittedPresence | "available";
  detail: string;
  selected: boolean;
  onSelect: (territory: AgenticMapTerritory) => void;
}) {
  return (
    <li className={`agentic-map-territory ${selected ? "selected" : ""}`}>
      <button type="button" aria-pressed={selected} onClick={() => onSelect(territory)}>
        <ContextPresenceMarker presence={presence} />
        <span className="agentic-map-territory-name">{name}</span>
        <span className="agentic-map-territory-detail">{detail}</span>
      </button>
    </li>
  );
}

/**
 * How one artifact entered the field. It sits above the preview rather than replacing it,
 * because the Navigator still needs the document; the panel only explains its presence.
 */
export function AdmissionPanel({ read }: { read?: AdmittedRead }) {
  if (!read) {
    return (
      <div className="admission-panel" data-presence="available">
        <p className="operational-artifacts-section-label">Context presence</p>
        <p className="admission-panel-state">No admission evidence in this Conversation.</p>
      </div>
    );
  }

  return (
    <div className="admission-panel" data-presence={read.presence}>
      <p className="operational-artifacts-section-label">Context presence</p>
      <p className="admission-panel-state">
        <ContextPresenceMarker presence={read.presence} />
        <span>{PRESENCE[read.presence].label}</span>
      </p>
      <dl className="admission-panel-facts">
        <div>
          <dt>Entry</dt>
          <dd>{`Read during ${read.lastReadTurn.kind} “${read.lastReadTurn.text}”`}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>{formatMoment(read.lastReadAt)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{read.relativePath ?? read.path}</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>{read.relativePath ? "Workspace file" : "File outside the Journey workspace"}</dd>
        </div>
        {read.readCount > 1 ? (
          <div>
            <dt>Reads</dt>
            <dd>{`${read.readCount} times, first at ${formatMoment(read.firstReadAt)}`}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function TerritoryPage({
  territory,
  context,
  journeyName,
  journeyBriefing,
  conversationName,
}: {
  territory: AgenticMapTerritory;
  context: AdmittedContext;
  journeyName?: string;
  journeyBriefing?: string;
  conversationName?: string;
}) {
  return (
    <article className="agentic-map-page">
      <p className="operational-artifacts-section-label">Agent&apos;s field</p>
      {territory === "briefing" ? briefingPage(journeyName, journeyBriefing) : null}
      {territory === "conversation" ? conversationPage(context, conversationName) : null}
      {territory === "sources" ? sourcesPage(context) : null}
      {territory === "instructions" ? instructionsPage(context) : null}
    </article>
  );
}

function briefingPage(journeyName?: string, journeyBriefing?: string): ReactNode {
  return (
    <>
      <h2>Journey briefing</h2>
      <p className="agentic-map-page-subject">{journeyName ?? "This Journey"}</p>
      {journeyBriefing
        ? <p className="agentic-map-briefing-text">{journeyBriefing}</p>
        : <p className="agentic-map-page-empty">This Journey records no briefing text.</p>}
      <dl className="admission-panel-facts">
        <div>
          <dt>Entry</dt>
          <dd>Available to the agent through Mirror. Admission in this Conversation: not evidenced.</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>Journey registry</dd>
        </div>
      </dl>
      <p className="agentic-map-page-note">
        The turn envelope carries the Journey&apos;s authority, not its briefing. The briefing enters only
        when the agent loads it through Mirror during the work, which leaves no durable mark here.
      </p>
    </>
  );
}

function conversationPage(context: AdmittedContext, conversationName?: string): ReactNode {
  const { conversation } = context;
  return (
    <>
      <h2>Active Conversation</h2>
      <p className="agentic-map-page-subject">{conversationName ?? "This Conversation"}</p>
      <dl className="admission-panel-facts">
        <div>
          <dt>Entry</dt>
          <dd>Carried by the Conversation as its retained tail and chapter summaries.</dd>
        </div>
        <div>
          <dt>Entries on this branch</dt>
          <dd>{`${conversation.entryCount}`}</dd>
        </div>
        <div>
          <dt>Retained tail</dt>
          <dd>{conversation.retainedTailEntryId ?? "The whole branch is retained."}</dd>
        </div>
      </dl>
      {conversation.chapters.length > 0 ? (
        <>
          <p className="operational-artifacts-section-label">Chapters still carrying continuity</p>
          <ul className="agentic-map-chapter-list">
            {conversation.chapters.map((chapter) => (
              <li key={chapter.firstKeptEntryId}>
                <span className="agentic-map-chapter-title">{chapter.title}</span>
                {chapter.closedAt ? <span className="agentic-map-chapter-moment">{formatMoment(chapter.closedAt)}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="agentic-map-page-empty">No compaction has closed a chapter yet.</p>
      )}
    </>
  );
}

function sourcesPage(context: AdmittedContext): ReactNode {
  if (context.attachments.length === 0) {
    return (
      <>
        <h2>Sources</h2>
        <p className="agentic-map-page-empty">No file has been attached to a turn in this Conversation.</p>
      </>
    );
  }
  return (
    <>
      <h2>Sources</h2>
      <p className="agentic-map-page-note">
        An attachment is a reference. The agent decides whether to open it, so being attached is not
        being read.
      </p>
      <ul className="agentic-map-source-list">
        {context.attachments.map((attachment) => <SourceRow key={attachment.path} attachment={attachment} />)}
      </ul>
    </>
  );
}

function SourceRow({ attachment }: { attachment: AdmittedAttachment }) {
  return (
    <li className="agentic-map-source" data-state={attachment.state}>
      <ContextPresenceMarker presence={attachment.state === "read" ? "present_now" : "available"} />
      <span className="agentic-map-source-name">{attachment.displayName}</span>
      <span className="agentic-map-source-state">{attachment.state === "read" ? "Read" : "Referenced"}</span>
      <span className="agentic-map-source-path">{attachment.relativePath ?? attachment.path}</span>
      <span className="agentic-map-source-moment">{formatMoment(attachment.attachedAt)}</span>
    </li>
  );
}

function instructionsPage(context: AdmittedContext): ReactNode {
  if (context.instructions.length === 0) {
    return (
      <>
        <h2>Instructions</h2>
        <p className="agentic-map-page-empty">No turn has been recorded in this Conversation yet.</p>
      </>
    );
  }
  return (
    <>
      <h2>Instructions</h2>
      <p className="agentic-map-page-note">
        Origin and scope only. The operating text itself is never shown here.
      </p>
      <ul className="agentic-map-instruction-list">
        {context.instructions.map((instruction) => (
          <li key={instruction.envelope} className="agentic-map-instruction" data-envelope={instruction.envelope}>
            <span className="agentic-map-instruction-name">{ENVELOPE_NAMES[instruction.envelope]}</span>
            <span className="agentic-map-instruction-scope">
              {`Applied on ${instruction.turnCount} ${plural(instruction.turnCount, "turn")}`}
            </span>
            <span className="agentic-map-instruction-moment">
              {instruction.firstAt === instruction.lastAt
                ? formatMoment(instruction.firstAt)
                : `${formatMoment(instruction.firstAt)} — ${formatMoment(instruction.lastAt)}`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function formatMoment(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
