import { useState } from "react";
import { homeCreationPreview, userNameFrom, userNameProblem } from "../domain/mirrorHomeCreation";

/**
 * CV-010.DS-005 slice 3a: the 0.3 setup screen.
 *
 * Mirror Desktop TS opens only a Mirror home made for it (condition b of the 0.3 line). This screen
 * creates one: the person says what their Mirror should call them, sees the user name derived from
 * it and the folder it will be, can edit the one and choose another place for the other, and the
 * app has the host create it, marked, and binds it. A home made earlier can still be opened. It
 * never finds or connects a Python Mirror.
 */
type MirrorHomeSetupProps = {
  binding: boolean;
  error?: string;
  /** CR174: why the home this app opened before no longer opens, until the person chooses. */
  brokenHome?: string;
  /** CR190: `typedName` is the answer as written, kept as the person's name in the new home. */
  onCreate: (userName: string, folder?: string, typedName?: string) => void;
  onChooseFolder: () => Promise<string | undefined>;
  onChoose: () => void;
  /** Tests only: the screen as it is once a name was typed. */
  initialName?: string;
};

export function MirrorHomeSetup({ binding, error, brokenHome, onCreate, onChooseFolder, onChoose, initialName = "" }: MirrorHomeSetupProps) {
  const [name, setName] = useState(initialName);
  const [editedUserName, setEditedUserName] = useState<string | undefined>(undefined);
  const [folder, setFolder] = useState<string | undefined>(undefined);
  const userName = editedUserName ?? userNameFrom(name);
  const problem = name.trim().length > 0 || editedUserName !== undefined ? userNameProblem(userName) : null;
  const ready = !binding && userName.length > 0 && problem === null;

  async function chooseFolder() {
    const chosen = await onChooseFolder();
    if (chosen) setFolder(chosen);
  }

  return (
    <>
      <p className="eyebrow">Nautilus for Mirror</p>
      <h1>Create your Mirror</h1>
      <p>Your Mirror keeps your Journeys, Conversations and memory in one folder on this Mac. Nothing outside it is written.</p>
      {brokenHome ? <p className="provider-note">The Mirror home this app opened before can no longer be opened: {brokenHome} Create a new one, or open another.</p> : null}
      <form
        className="runtime-onboarding-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onCreate(userName, folder, name);
        }}
      >
        <label className="provider-field">
          What should your Mirror call you?
          <input type="text" value={name} autoFocus disabled={binding} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="provider-field">
          Your Mirror name
          <input
            type="text"
            value={userName}
            disabled={binding}
            spellCheck={false}
            aria-invalid={problem !== null}
            onChange={(event) => setEditedUserName(event.target.value)}
          />
        </label>
        {problem ? <p className="field-hint" role="status">{problem}</p> : null}
        <p className="field-hint">Your Mirror home will be <code>{homeCreationPreview(userName || "…", folder)}</code></p>
        {error ? <p className="provider-error" role="alert">{error}</p> : null}
        <div className="provider-actions">
          <button type="submit" disabled={!ready}>{binding ? "Creating…" : "Create my Mirror"}</button>
          <button className="secondary-button" type="button" disabled={binding} onClick={() => void chooseFolder()}>Create it in another folder…</button>
        </div>
      </form>
      <p>Already have a Mirror home made by Nautilus?</p>
      <div className="provider-actions">
        <button className="secondary-button" type="button" disabled={binding} onClick={onChoose}>Open an existing Mirror home…</button>
      </div>
    </>
  );
}
