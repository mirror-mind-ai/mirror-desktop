import { journeyDeletionRefusal, journeyDeletionSummary, type JourneyDeletionPreview } from "../domain/journeyDeletion";

type JourneyDeletionListProps = {
  preview: JourneyDeletionPreview | null;
  error?: string;
  nameOf: (journeyId: string) => string;
  emptiesFolder: boolean;
  onEmptiesFolderChange: (emptiesFolder: boolean) => void;
  disabled: boolean;
};

/** RS028 / CR204: the Delete Journey confirmation's list of what goes, what stays, and the folder. */
export function JourneyDeletionList({ preview, error, nameOf, emptiesFolder, onEmptiesFolderChange, disabled }: JourneyDeletionListProps) {
  if (error) return <p className="settings-error" role="alert">{error}</p>;
  if (!preview) return <p className="journey-deletion-loading" role="status">Asking Mirror what this Journey holds…</p>;
  const refusal = journeyDeletionRefusal(preview, nameOf);
  if (refusal) return <p className="settings-error" role="alert">{refusal}</p>;
  const summary = journeyDeletionSummary(preview);
  return (
    <div className="journey-deletion-list">
      {summary.goes.length > 0 || summary.extensions.length > 0 ? (
        <>
          <p>Will be deleted from Mirror:</p>
          <ul aria-label="Will be deleted from Mirror">
            {summary.goes.map((line) => <li key={line}>{line}</li>)}
            {summary.extensions.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </>
      ) : (
        <p>Mirror holds no records for this Journey besides the Journey itself.</p>
      )}
      {summary.kept.length > 0 ? (
        <>
          <p>Will be kept, no longer linked to this Journey's Conversations:</p>
          <ul aria-label="Will be kept">
            {summary.kept.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </>
      ) : null}
      {summary.nautilus ? <p>{summary.nautilus}</p> : null}
      {preview.folder ? (
        <label className="journey-deletion-folder">
          <input
            type="checkbox"
            checked={emptiesFolder && !preview.folder.refusal}
            disabled={disabled || Boolean(preview.folder.refusal)}
            onChange={(event) => onEmptiesFolderChange(event.target.checked)}
          />
          <span>
            Also delete everything inside {preview.folder.path}
            {preview.folder.refusal ? <small> {preview.folder.refusal}</small> : null}
            {emptiesFolder && !preview.folder.refusal ? <small> The files are deleted, not moved to the Trash, and Mirror's backup does not hold them. The folder itself stays.</small> : null}
          </span>
        </label>
      ) : (
        <p>This Journey has no project folder. No file on disk will be touched.</p>
      )}
    </div>
  );
}
