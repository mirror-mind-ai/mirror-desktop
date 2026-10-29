/**
 * CV-010.DS-005 phase 2, slice 2d-1: the 0.3 setup screen.
 *
 * Mirror Desktop TS opens only a Mirror home made for it (condition b of the 0.3 line): one
 * that carries the 0.3 marker. It never finds or connects a Python Mirror, so this screen asks
 * for one folder and offers nothing else. Creating a home here is phase 3's first-run assistant;
 * until then, the development channel names the script that creates one.
 */
type MirrorHomeSetupProps = {
  development: boolean;
  binding: boolean;
  error?: string;
  onChoose: () => void;
};

export function MirrorHomeSetup({ development, binding, error, onChoose }: MirrorHomeSetupProps) {
  return (
    <>
      <p className="eyebrow">Mirror Desktop TS</p>
      <h1>Open your Mirror home</h1>
      <p>Mirror Desktop TS works with a Mirror home made for it. Choose its folder; nothing outside it is read.</p>
      {development ? (
        <p>For development, create one with <code>node scripts/dev_ts_home.mjs &lt;absolute path&gt;</code>.</p>
      ) : null}
      {error ? <p className="provider-error" role="alert">{error}</p> : null}
      <div className="provider-actions">
        <button type="button" disabled={binding} onClick={onChoose}>{binding ? "Opening…" : "Choose Mirror home…"}</button>
      </div>
    </>
  );
}
