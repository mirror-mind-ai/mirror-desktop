import type {
  ConversationRecoveryRoute,
  ConversationRecoveryRouteId,
} from "../domain/conversationRecovery";

type ConversationRecoveryNoticeProps = {
  title: string;
  message: string;
  routes: ConversationRecoveryRoute[];
  activeRoute?: ConversationRecoveryRouteId;
  error?: string;
  onSelect: (route: ConversationRecoveryRouteId) => void;
};

export function ConversationRecoveryNotice({
  title,
  message,
  routes,
  activeRoute,
  error,
  onSelect,
}: ConversationRecoveryNoticeProps) {
  return (
    <section className="dedicated-turn-notice conversation-recovery-notice" role={error ? "alert" : "status"} aria-live="polite">
      <strong>{title}</strong>
      <p>{message}</p>
      {routes.length > 0 ? (
        <div className="conversation-recovery-routes">
          {routes.map((route) => (
            <div className="conversation-recovery-route" key={route.id}>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onSelect(route.id)}
                disabled={Boolean(activeRoute)}
              >
                {activeRoute === route.id ? `${route.label}…` : route.label}
              </button>
              <span>{route.consequence}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="provider-error">{error}</p> : null}
    </section>
  );
}
