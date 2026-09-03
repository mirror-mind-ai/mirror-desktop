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
  busy,
  message,
  onChoose,
  onRemove,
}: {
  avatar?: string;
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
          {avatar ? <img src={avatar} alt="Current user avatar" /> : <span aria-hidden="true">N</span>}
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
