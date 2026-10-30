import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * CV-010.DS-005 slice 3c-1: model providers, as the app's own Pi reports them, and Pi's own sign-in.
 * Pi keeps what it signs in with; nothing here reads one back.
 */
export type PiReadiness = { type: "api_key" | "oauth"; source?: string };

export type PiProviderStatus = {
  id: string;
  name: string;
  apiKey: boolean;
  oauth: boolean;
  oauthName?: string;
  ready: PiReadiness | null;
};

export type PiLoginEvent =
  | { kind: "select"; session: number; id: string; message: string; options: { id: string; label: string }[] }
  | { kind: "prompt"; session: number; id: string; prompt: "text" | "secret" | "manual_code"; message: string; placeholder?: string | null }
  | { kind: "promptClosed"; session: number; id: string }
  | { kind: "authUrl"; session: number; url: string; instructions?: string | null }
  | { kind: "deviceCode"; session: number; userCode: string; verificationUri: string }
  | { kind: "note"; session: number; message: string }
  | { kind: "done"; session: number; provider: string; ready: PiReadiness | null }
  | { kind: "failed"; session: number; message: string };

export type PiLoginPrompt =
  | { id: string; kind: "select"; message: string; options: { id: string; label: string }[] }
  | { id: string; kind: "text" | "secret" | "manual_code"; message: string; placeholder?: string };

/** A sign-in in progress, as the screen shows it. */
export type PiLoginView = {
  session: number;
  provider: string;
  providerName: string;
  authUrl?: string;
  instructions?: string;
  deviceCode?: { userCode: string; verificationUri: string };
  prompts: PiLoginPrompt[];
  notes: string[];
};

/** What a sign-in event does to the view; the outcome events are the caller's to act on. */
export function applyPiLoginEvent(view: PiLoginView, event: PiLoginEvent): PiLoginView {
  if (event.session !== view.session) return view;
  switch (event.kind) {
    case "select":
      return { ...view, prompts: [...view.prompts, { id: event.id, kind: "select", message: event.message, options: event.options }] };
    case "prompt":
      return { ...view, prompts: [...view.prompts, { id: event.id, kind: event.prompt, message: event.message, ...(event.placeholder ? { placeholder: event.placeholder } : {}) }] };
    case "promptClosed":
      return { ...view, prompts: view.prompts.filter((prompt) => prompt.id !== event.id) };
    case "authUrl":
      return { ...view, authUrl: event.url, ...(event.instructions ? { instructions: event.instructions } : {}) };
    case "deviceCode":
      return { ...view, deviceCode: { userCode: event.userCode, verificationUri: event.verificationUri } };
    case "note":
      return { ...view, notes: [...view.notes.slice(-4), event.message] };
    default:
      return view;
  }
}

/** A prompt answered leaves the view; Pi asks again if it needs more. */
export function withoutPrompt(view: PiLoginView, id: string): PiLoginView {
  return { ...view, prompts: view.prompts.filter((prompt) => prompt.id !== id) };
}

export async function inspectPiProviders(): Promise<PiProviderStatus[]> {
  return invoke<PiProviderStatus[]>("inspect_pi_providers");
}

export async function startPiLogin(provider: string, loginType: "oauth" | "api_key"): Promise<number> {
  return invoke<number>("start_pi_login", { provider, loginType });
}

export async function answerPiLogin(session: number, promptId: string, value: string): Promise<void> {
  await invoke("answer_pi_login", { session, promptId, value });
}

export async function cancelPiLogin(session: number): Promise<void> {
  await invoke("cancel_pi_login", { session });
}

/** The provider's page again, through the app's checked opener. */
export async function openSignInPage(url: string): Promise<void> {
  await invoke("open_external_url", { url });
}

export function listenPiLogin(onEvent: (event: PiLoginEvent) => void): Promise<UnlistenFn> {
  return listen<PiLoginEvent>("pi-login-event", (event) => onEvent(event.payload));
}
