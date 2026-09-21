import { useEffect, useRef, useState } from "react";

export type DelayedVisibilityTransition =
  | { action: "none"; delayMs: 0 }
  | { action: "show" | "hide"; delayMs: number };

export function deriveDelayedVisibilityTransition(input: {
  requested: boolean;
  visible: boolean;
  visibleSince?: number;
  now: number;
  showDelayMs: number;
  minimumVisibleMs: number;
}): DelayedVisibilityTransition {
  if (input.requested) {
    return input.visible
      ? { action: "none", delayMs: 0 }
      : { action: "show", delayMs: input.showDelayMs };
  }
  if (!input.visible) return { action: "none", delayMs: 0 };
  const elapsed = input.visibleSince === undefined ? input.minimumVisibleMs : input.now - input.visibleSince;
  return { action: "hide", delayMs: Math.max(0, input.minimumVisibleMs - elapsed) };
}

export function useDelayedVisibility(
  requested: boolean,
  options: { showDelayMs: number; minimumVisibleMs: number },
): boolean {
  const [visible, setVisible] = useState(false);
  const visibleSinceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const transition = deriveDelayedVisibilityTransition({
      requested,
      visible,
      visibleSince: visibleSinceRef.current,
      now: Date.now(),
      ...options,
    });
    if (transition.action === "none") return;
    const timer = window.setTimeout(() => {
      if (transition.action === "show") {
        visibleSinceRef.current = Date.now();
        setVisible(true);
      } else {
        visibleSinceRef.current = undefined;
        setVisible(false);
      }
    }, transition.delayMs);
    return () => window.clearTimeout(timer);
  }, [options.minimumVisibleMs, options.showDelayMs, requested, visible]);

  return visible;
}
