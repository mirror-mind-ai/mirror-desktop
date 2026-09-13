import { invoke } from "@tauri-apps/api/core";
import { releaseReadingIsAuthentic, type ReleaseReading } from "../domain/releaseReading";
import { emptyWhatsNewState, parseWhatsNewState, resolveWhatsNewState, stagePendingRelease, type ResolvedWhatsNewState, type WhatsNewState } from "../domain/whatsNewState";

async function authenticState(state: WhatsNewState): Promise<WhatsNewState> {
  const pending = state.pending && await releaseReadingIsAuthentic(state.pending) ? state.pending : undefined;
  const installed = state.installed && await releaseReadingIsAuthentic(state.installed) ? state.installed : undefined;
  return { ...state, pending, installed };
}

export async function loadWhatsNewState(): Promise<WhatsNewState> {
  const payload = await invoke<string | null>("load_whats_new_state");
  if (!payload) return emptyWhatsNewState();
  try {
    return await authenticState(parseWhatsNewState(JSON.parse(payload)));
  } catch {
    return emptyWhatsNewState();
  }
}

export async function saveWhatsNewState(state: WhatsNewState): Promise<void> {
  const payload: WhatsNewState = {
    schemaVersion: "1.0.0",
    pending: state.pending,
    installed: state.installed,
    acknowledgedVersion: state.acknowledgedVersion,
  };
  await invoke("save_whats_new_state", { payload: JSON.stringify(payload) });
}

export async function preparePendingRelease(reading?: ReleaseReading): Promise<void> {
  if (!reading || !await releaseReadingIsAuthentic(reading)) return;
  const state = await loadWhatsNewState();
  await saveWhatsNewState(stagePendingRelease(state, reading));
}

export async function loadResolvedWhatsNewState(runningVersion: string): Promise<ResolvedWhatsNewState> {
  const state = await loadWhatsNewState();
  const resolved = resolveWhatsNewState(state, runningVersion);
  await saveWhatsNewState(resolved);
  return resolved;
}
