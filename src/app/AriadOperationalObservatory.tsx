import { useMemo, useState, type CSSProperties } from "react";
import {
  createAriadObservatoryModel,
  selectedMatterFromDelivery,
  selectedMatterFromExploration,
  selectedMatterFromRefinement,
  type AriadFieldId,
  type AriadObservatoryModel,
  type AriadRoadmapNode,
  type AriadSelectedMatter,
} from "../domain/ariadObservatory";
import type { OperationalProjection } from "../domain/journeyProjections";

type AriadOperationalObservatoryProps = {
  journeyId: string;
  journeyName: string;
  projection?: OperationalProjection;
  loading?: boolean;
  errors?: string[];
};

const fieldLabels: Record<AriadFieldId, string> = {
  delivery: "Delivery",
  refinement: "Refinement",
  exploration: "Exploration",
};

export function AriadOperationalObservatory({
  journeyId,
  journeyName,
  projection,
  loading = false,
  errors = [],
}: AriadOperationalObservatoryProps) {
  const model = useMemo(() => createAriadObservatoryModel(journeyId, projection), [journeyId, projection]);
  const [activeField, setActiveField] = useState<AriadFieldId>("delivery");
  const [selectedMatter, setSelectedMatter] = useState<AriadSelectedMatter | undefined>(model.defaultSelection);
  const selected = selectedMatter ?? model.defaultSelection;

  if (loading) {
    return (
      <section id="operational-ariad-panel" className="ariad-observatory" role="tabpanel" aria-label="Ariad observatory">
        <div className="ariad-empty-state">Loading Ariad operational projection…</div>
      </section>
    );
  }

  return (
    <section id="operational-ariad-panel" className="ariad-observatory" role="tabpanel" aria-label="Ariad observatory">
      <div className="ariad-frame">
        <header className="ariad-hero">
          <div>
            <p className="eyebrow">Operational Ariad</p>
            <h2>Ariad Home</h2>
            <p>{journeyName} as read-only method cartography.</p>
          </div>
          <span className={`ariad-source-badge ${model.availability}`}>{model.availability === "ready" ? "Published" : "Unavailable"}</span>
        </header>

        {errors.length > 0 ? <AriadNotice messages={errors} /> : null}

        <div className="ariad-summary-grid">
          <AriadStateCard model={model} />
          <NextMovementCard model={model} />
        </div>

        <div className="ariad-field-tabs" role="tablist" aria-label="Ariad fields">
          {(Object.keys(fieldLabels) as AriadFieldId[]).map((field) => (
            <button
              key={field}
              type="button"
              role="tab"
              aria-selected={activeField === field}
              className={activeField === field ? "selected" : ""}
              onClick={() => setActiveField(field)}
            >
              {fieldLabels[field]}
            </button>
          ))}
        </div>

        <div className="ariad-home-grid">
          <div className="ariad-structure-panel">
            <h3>Structure</h3>
            <FieldSummary model={model} activeField={activeField} onSelect={setSelectedMatter} />
          </div>
          <SelectedMatterPanel selected={selected} boundary={model.boundary} />
        </div>
      </div>
    </section>
  );
}

function AriadNotice({ messages }: { messages: string[] }) {
  return (
    <div className="ariad-notice" role="status">
      {messages.map((message) => <p key={message}>{message}</p>)}
    </div>
  );
}

function AriadStateCard({ model }: { model: AriadObservatoryModel }) {
  return (
    <article className="ariad-card">
      <p className="eyebrow">Ariad State</p>
      <dl className="ariad-kv">
        <div><dt>Method</dt><dd>Ariad</dd></div>
        <div><dt>Active item</dt><dd>{model.activeWork?.activeItem ?? "none"}</dd></div>
        <div><dt>Checkpoint</dt><dd>{model.activeWork?.checkpoint ?? "none"}</dd></div>
        <div><dt>Status</dt><dd>{model.activeWork?.status ?? "unknown"}</dd></div>
      </dl>
    </article>
  );
}

function NextMovementCard({ model }: { model: AriadObservatoryModel }) {
  return (
    <article className="ariad-card">
      <p className="eyebrow">Next Safe Movement</p>
      <ul className="ariad-movement-list">
        {model.nextSafeMovement.map((item) => (
          <li key={item.field}><strong>{fieldLabels[item.field]}</strong><span>{item.label}</span></li>
        ))}
      </ul>
    </article>
  );
}

function FieldSummary({
  model,
  activeField,
  onSelect,
}: {
  model: AriadObservatoryModel;
  activeField: AriadFieldId;
  onSelect: (matter: AriadSelectedMatter) => void;
}) {
  if (model.availability === "unavailable") {
    return <div className="ariad-empty-state">{model.boundary}</div>;
  }
  if (activeField === "delivery") {
    return (
      <div className="ariad-field-view">
        <p className="ariad-field-summary">{model.delivery.summary}</p>
        {model.delivery.roots.map((node) => <DeliveryNode key={node.id} node={node} depth={0} onSelect={onSelect} />)}
      </div>
    );
  }
  if (activeField === "refinement") {
    return (
      <div className="ariad-field-view">
        <p className="ariad-field-summary">{model.refinement.summary}</p>
        {model.refinement.stories.length === 0 ? <div className="ariad-empty-state">No Refinement field published.</div> : null}
        {model.refinement.stories.map((story) => (
          <div key={story.id} className="ariad-tree-group">
            <button type="button" onClick={() => onSelect(selectedMatterFromRefinement(story))}>
              <span>{story.active ? "▸" : "○"}</span><strong>{story.id}</strong><small>{story.title}</small><em>{story.status}</em>
            </button>
            {story.changeRequests.map((request) => (
              <button className="nested" key={request.id} type="button" onClick={() => onSelect(selectedMatterFromRefinement(story, request))}>
                <span>{request.active ? "▸" : "○"}</span><strong>{request.id}</strong><small>{request.title}</small><em>{request.status}</em>
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="ariad-field-view">
      <p className="ariad-field-summary">{model.exploration.summary}</p>
      {model.exploration.stories.length === 0 ? <div className="ariad-empty-state">No Exploration field published.</div> : null}
      {model.exploration.stories.map((story) => (
        <button className="ariad-story-row" key={story.id} type="button" onClick={() => onSelect(selectedMatterFromExploration(story))}>
          <span>{story.status === "active" ? "▸" : "○"}</span>
          <strong>{story.title}</strong>
          <small>{story.summary ?? "No summary published"}</small>
          <em>{story.status}</em>
        </button>
      ))}
    </div>
  );
}

function DeliveryNode({ node, depth, onSelect }: { node: AriadRoadmapNode; depth: number; onSelect: (matter: AriadSelectedMatter) => void }) {
  return (
    <div className="ariad-tree-group">
      <button type="button" style={{ "--ariad-depth": depth } as CSSProperties} onClick={() => onSelect(selectedMatterFromDelivery(node))}>
        <span>{node.children.length > 0 ? "▼" : "○"}</span><strong>{node.id}</strong><small>{node.title}</small><em>{node.status}</em>
      </button>
      {node.children.map((child) => <DeliveryNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />)}
    </div>
  );
}

function SelectedMatterPanel({ selected, boundary }: { selected?: AriadSelectedMatter; boundary: string }) {
  if (!selected) {
    return (
      <aside className="ariad-selected-panel">
        <h3>Selected Matter</h3>
        <div className="ariad-empty-state">Select matter from Delivery, Refinement or Exploration.</div>
        <p className="ariad-boundary">{boundary}</p>
      </aside>
    );
  }
  return (
    <aside className="ariad-selected-panel">
      <p className="eyebrow">Selected Matter</p>
      <h3>{selected.id}</h3>
      <h2>{selected.title}</h2>
      <div className="ariad-selected-meta"><span>{fieldLabels[selected.field]}</span><span>{selected.kind}</span><span>{selected.status}</span></div>
      {selected.summary ? <p>{selected.summary}</p> : null}
      {selected.details.length > 0 ? (
        <dl className="ariad-kv detail-list">
          {selected.details.map((detail) => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
        </dl>
      ) : null}
      {selected.path ? <p className="ariad-source-path">{selected.path}</p> : null}
      <p className="ariad-boundary">{selected.boundary}</p>
    </aside>
  );
}
