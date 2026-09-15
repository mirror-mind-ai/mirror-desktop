export function EmptyDesktopConversation({ title }: { title: string }) {
  return <section className="empty-desktop-conversation" aria-label={`${title} start`}>
    <p className="eyebrow">New conversation</p>
    <h2>{title}</h2>
    <p>This conversation has not started yet.</p>
    <p>Use the composer to describe what you want to explore or build.</p>
  </section>;
}
