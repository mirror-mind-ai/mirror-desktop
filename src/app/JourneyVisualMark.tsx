import { useEffect, useState } from "react";
import { systemIconGlyph, type JourneyAppearance } from "../domain/journeyAppearance";
import { loadJourneyCustomImage } from "./journeyAppearanceStorage";
import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

const customImageCache = new Map<string, string | null>();
const MAX_CACHE_ENTRIES = 256;

export function cacheJourneyCustomImage(journeyId: string, dataUrl: string | null): void {
  customImageCache.delete(journeyId);
  customImageCache.set(journeyId, dataUrl);
  while (customImageCache.size > MAX_CACHE_ENTRIES) {
    const oldest = customImageCache.keys().next().value as string | undefined;
    if (!oldest) break;
    customImageCache.delete(oldest);
  }
}

type JourneyVisualMarkProps = {
  journeyId: string;
  appearance?: JourneyAppearance;
  fallbackGlyph: string;
  runtimePhase?: JourneyRuntimeOwnerPhase;
  className?: string;
};

export function JourneyVisualMark({
  journeyId,
  appearance,
  fallbackGlyph,
  runtimePhase,
  className = "",
}: JourneyVisualMarkProps) {
  const cached = customImageCache.get(journeyId);
  const [customImage, setCustomImage] = useState<string | null | undefined>(cached);

  useEffect(() => {
    let cancelled = false;
    if (appearance?.kind !== "custom") {
      setCustomImage(undefined);
      return () => { cancelled = true; };
    }
    const current = customImageCache.get(journeyId);
    if (current !== undefined) {
      setCustomImage(current);
      return () => { cancelled = true; };
    }
    void loadJourneyCustomImage(journeyId)
      .then((value) => {
        if (cancelled) return;
        cacheJourneyCustomImage(journeyId, value ?? null);
        setCustomImage(value ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        cacheJourneyCustomImage(journeyId, null);
        setCustomImage(null);
      });
    return () => { cancelled = true; };
  }, [appearance, journeyId]);

  const glyph = appearance?.kind === "system" ? systemIconGlyph(appearance.icon) : fallbackGlyph;
  return (
    <span
      className={`journey-visual-mark ${appearance?.kind ?? "default"} ${className}`.trim()}
      data-runtime-phase={runtimePhase}
      aria-hidden="true"
    >
      {appearance?.kind === "custom" && customImage
        ? <img src={customImage} alt="" />
        : <span className="journey-visual-glyph">{glyph}</span>}
      {runtimePhase ? <span className="journey-visual-activity" /> : null}
    </span>
  );
}
