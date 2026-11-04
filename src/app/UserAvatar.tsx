import type { Person } from "../domain/personName";

export function MessageSpeakerAvatar({
  speakerKind,
  fallback,
  userAvatar,
}: {
  speakerKind: "user" | "agent" | "persona";
  fallback: string;
  userAvatar?: string;
}) {
  const customUserAvatar = speakerKind === "user" ? userAvatar : undefined;
  return (
    <span className={`message-avatar${customUserAvatar ? " has-custom-user-avatar" : ""}`} aria-hidden={customUserAvatar ? undefined : true}>
      {customUserAvatar
        ? <img src={customUserAvatar} alt="User avatar" />
        : fallback}
    </span>
  );
}

export function UserAvatarSettings({
  avatar,
  initial = "Y",
  busy,
  message,
  onChoose,
  onRemove,
}: {
  avatar?: string;
  /** CR190: the person's initial, where a hard-coded "N" used to be. */
  initial?: string;
  busy: boolean;
  message?: string;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="settings-section user-avatar-card" aria-label="User avatar">
      <div>
        <h3>User avatar</h3>
        <p>Identify your messages with a channel-local photo.</p>
      </div>
      <div className="user-avatar-control">
        <span className={`user-avatar-preview${avatar ? " has-image" : ""}`}>
          {avatar ? <img src={avatar} alt="Current user avatar" /> : <span aria-hidden="true">{initial}</span>}
        </span>
        <div className="user-avatar-actions">
          <button type="button" onClick={onChoose} disabled={busy}>
            {busy ? "Updating…" : avatar ? "Replace photo…" : "Choose photo…"}
          </button>
          <button className="secondary-button" type="button" onClick={onRemove} disabled={busy || !avatar}>
            Remove photo
          </button>
        </div>
      </div>
      <small>PNG, JPEG, or WebP up to 5 MiB. Stored only in this app channel.</small>
      {message ? <p className="user-avatar-message" role="status">{message}</p> : null}
    </section>
  );
}

/**
 * CR190: the person at the top right of the header, round like its neighbours. It shows their
 * photo or initial and, when clicked, their name. Open state is the caller's, so the header can
 * close it on an outside click as it does the ⋯ menu.
 */
export function PersonButton({
  person,
  avatar,
  open,
  onOpenChange,
}: {
  person: Person;
  avatar?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="person-button-wrap">
      <button
        className={`menu-button person-button${avatar ? " has-image" : ""}`}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={person.name}
        aria-expanded={open}
        title={person.name}
      >
        {avatar ? <img src={avatar} alt="" /> : <span aria-hidden="true">{person.initial}</span>}
      </button>
      {open ? (
        <div className="journey-menu person-popover" role="dialog" aria-label="Current person">
          <p className="person-popover-name">{person.name}</p>
        </div>
      ) : null}
    </div>
  );
}

/** CR190: the person's own name, which wins over the one read from the home's user. */
export function UserNameSettings({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="settings-section user-name-card" aria-label="Name">
      <div>
        <h3>Name</h3>
        <p>Shown at the top right and on your turns. Leave it empty to use your Mirror home's name.</p>
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={80}
        aria-label="Your name"
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
