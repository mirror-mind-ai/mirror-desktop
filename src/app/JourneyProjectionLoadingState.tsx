export function JourneyProjectionLoadingState({ altitude }: { altitude: "tactical" | "strategic" }) {
  const label = altitude === "tactical" ? "Tactical" : "Strategic";
  return (
    <section id={`journey-altitude-${altitude}-panel`} className={`journey-altitude-empty-state altitude-${altitude}`} role="tabpanel" aria-label={`${label} workspace`} aria-busy="true">
      <p className="eyebrow">{label}</p>
      <h2>Reading published projection…</h2>
    </section>
  );
}
