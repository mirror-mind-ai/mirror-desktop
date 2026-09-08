import { useEffect, useState } from "react";
import { checkForTrustedSelfUpdate, type SelfUpdateCheckResult } from "./selfUpdateStorage";

export type SelfUpdateNotificationProps = {
  checkUpdates?: () => Promise<SelfUpdateCheckResult>;
  onReview: () => void;
};

export function SelfUpdateNotification({ checkUpdates = checkForTrustedSelfUpdate, onReview }: SelfUpdateNotificationProps) {
  const [available, setAvailable] = useState<SelfUpdateCheckResult & { status: "available" }>();
  const [dismissedVersion, setDismissedVersion] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void checkUpdates()
      .then((result) => {
        if (!cancelled && result.status === "available") setAvailable(result);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [checkUpdates]);

  if (!available || dismissedVersion === available.version) return null;
  return (
    <aside className="self-update-banner" role="status" aria-live="polite">
      <div><strong>Mirror Desktop {available.version} is available.</strong><span> Review the signed update before installing.</span></div>
      <div className="self-update-banner-actions">
        <button type="button" onClick={onReview}>Review update</button>
        <button className="secondary-button" type="button" onClick={() => setDismissedVersion(available.version)}>Later</button>
      </div>
    </aside>
  );
}
