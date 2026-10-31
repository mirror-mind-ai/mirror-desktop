import { adoptionView, type HomeAdoptionInspection } from "../domain/mirrorHomeAdoption";

/**
 * CV-010.DS-005 phase 5, slice 5a: the review of a Mirror home that Mirror Desktop TS did not
 * create. It shows the folder and what it holds and, before anything changes, what adopting it
 * changes and costs. Only *Update and open* migrates, and it sends exactly the pending list shown.
 */
type MirrorHomeAdoptionProps = {
  inspection: Extract<HomeAdoptionInspection, { marked: false }>;
  adopting: boolean;
  error?: string;
  onAdopt: (expectedPending: string[]) => void;
  onCancel: () => void;
};

export function MirrorHomeAdoption({ inspection, adopting, error, onAdopt, onCancel }: MirrorHomeAdoptionProps) {
  const view = adoptionView(inspection);
  const { contents } = inspection;
  return (
    <>
      <p className="eyebrow">Mirror Desktop TS</p>
      <h1>Open this Mirror home?</h1>
      <p><code>{inspection.homePath}</code></p>
      {contents ? (
        <p>
          It holds {contents.journeys} Journeys, {contents.conversations} Conversations, {contents.memories} memories
          {" "}and {contents.personas} personas.
        </p>
      ) : null}
      {view.kind === "migrate" ? (
        <>
          <p>Mirror Desktop TS updates this home before opening it. These changes are applied:</p>
          <ul>{view.expectedPending.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
          <p>
            A copy of the home is taken first, checked, and kept in <code>{`${inspection.homePath}/backups`}</code>.
          </p>
          <p>
            Afterwards Mirror Desktop 0.2 and the terminal's Python Mirror can no longer open it. Going back to them
            means restoring the copy, and what was written after the update is not in it.
          </p>
        </>
      ) : view.kind === "mark" ? (
        <p>This home is already up to date. Mirror Desktop TS will mark it as its own and open it.</p>
      ) : (
        <p>{view.reason}</p>
      )}
      {error ? <p className="provider-error" role="alert">{error}</p> : null}
      <div className="provider-actions">
        {view.kind === "refuse" ? null : (
          <button type="button" disabled={adopting} onClick={() => onAdopt(view.expectedPending)}>
            {adopting ? "Updating…" : view.kind === "migrate" ? "Update and open" : "Open this home"}
          </button>
        )}
        <button className="secondary-button" type="button" disabled={adopting} onClick={onCancel}>Choose another home</button>
      </div>
    </>
  );
}
