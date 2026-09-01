import { listen as tauriListen } from "@tauri-apps/api/event";
import {
  samePiProcessEventAuthority,
  type PiProcessEventAuthority,
  type RunAuthority,
} from "../domain/runAuthority";

export const PI_PROCESS_EVENT = "nautilus-pi-process";

export type PiProcessEventKind = "started" | "stdout" | "stderr" | "error" | "cancelled" | "done";

export type PiProcessEvent = {
  kind: PiProcessEventKind;
  content: string;
  authority?: PiProcessEventAuthority;
};

type ProcessEventEnvelope = { payload: PiProcessEvent };
type Listen = (
  event: string,
  handler: (event: ProcessEventEnvelope) => void,
) => Promise<() => void>;

type Route = {
  authority: RunAuthority;
  handler: (event: PiProcessEvent) => void;
  closed: boolean;
};

export type PiProcessEventRoute = {
  isClosed(): boolean;
  abortBeforeInvocation(): void;
};

export type PiProcessEventDispatcher = {
  mount(): Promise<void>;
  dispose(): Promise<void>;
  register(authority: RunAuthority, handler: (event: PiProcessEvent) => void): Promise<PiProcessEventRoute>;
  rehydrate(authority: RunAuthority, handler: (event: PiProcessEvent) => void): Promise<PiProcessEventRoute>;
  quarantine(): ReadonlyArray<{ journeyId?: string; runId?: string; reason: string }>;
};

const QUARANTINE_LIMIT = 20;
const CLOSED_ROUTE_LIMIT = 20;

export function createPiProcessEventDispatcher(
  dependencies: { listen?: Listen } = {},
): PiProcessEventDispatcher {
  const listen = dependencies.listen ?? (tauriListen as Listen);
  const routes = new Map<string, Route>();
  const rejected: Array<{ journeyId?: string; runId?: string; reason: string }> = [];
  const closedAuthorities: PiProcessEventAuthority[] = [];
  let unlisten: (() => void) | undefined;
  let mounting: Promise<void> | undefined;
  let mountingLifecycle: number | undefined;
  let lifecycle = 0;

  function reject(event: PiProcessEvent, reason: string) {
    rejected.push({ journeyId: event.authority?.journeyId, runId: event.authority?.runId, reason });
    if (rejected.length > QUARANTINE_LIMIT) rejected.splice(0, rejected.length - QUARANTINE_LIMIT);
  }

  function wasClosedInCurrentLifecycle(authority: RunAuthority): boolean {
    return closedAuthorities.some((closed) => samePiProcessEventAuthority(closed, authority));
  }

  function rememberClosedAuthority(authority: PiProcessEventAuthority) {
    const existing = closedAuthorities.findIndex((closed) => closed.journeyId === authority.journeyId);
    if (existing >= 0) closedAuthorities.splice(existing, 1);
    closedAuthorities.push(authority);
    if (closedAuthorities.length > CLOSED_ROUTE_LIMIT) {
      closedAuthorities.splice(0, closedAuthorities.length - CLOSED_ROUTE_LIMIT);
    }
  }

  function deliver(event: PiProcessEvent) {
    if (!event.authority) {
      reject(event, "missing_authority");
      return;
    }
    const route = routes.get(event.authority.journeyId);
    if (!route || route.closed) {
      reject(event, "unknown_route");
      return;
    }
    if (!samePiProcessEventAuthority(event.authority, route.authority)) {
      reject(event, "authority_mismatch");
      return;
    }

    try {
      route.handler(event);
    } finally {
      if (event.kind === "done") {
        rememberClosedAuthority(event.authority);
        route.closed = true;
        if (routes.get(route.authority.journeyId) === route) routes.delete(route.authority.journeyId);
      }
    }
  }

  async function mount(): Promise<void> {
    if (unlisten) return;
    if (mounting) {
      if (mountingLifecycle === lifecycle) return mounting;
      try {
        await mounting;
      } catch {
        // The next lifecycle gets its own listener attempt.
      }
      return mount();
    }
    const requestedLifecycle = lifecycle;
    mountingLifecycle = requestedLifecycle;
    mounting = listen(PI_PROCESS_EVENT, (event) => deliver(event.payload))
      .then((stop) => {
        if (requestedLifecycle !== lifecycle) {
          stop();
          return;
        }
        unlisten = stop;
      })
      .finally(() => {
        if (mountingLifecycle === requestedLifecycle) {
          mounting = undefined;
          mountingLifecycle = undefined;
        }
      });
    return mounting;
  }

  async function dispose() {
    lifecycle += 1;
    const pending = mounting;
    if (pending) {
      try {
        await pending;
      } catch {
        // A failed listener has nothing to dispose.
      }
    }
    const stop = unlisten;
    unlisten = undefined;
    stop?.();
    for (const route of routes.values()) route.closed = true;
    routes.clear();
    closedAuthorities.length = 0;
  }

  function routeHandle(route: Route): PiProcessEventRoute {
    return {
      isClosed: () => route.closed,
      abortBeforeInvocation() {
        if (route.closed) return;
        route.closed = true;
        rememberClosedAuthority(route.authority.eventAuthority);
        if (routes.get(route.authority.journeyId) === route) routes.delete(route.authority.journeyId);
      },
    };
  }

  async function register(
    authority: RunAuthority,
    handler: (event: PiProcessEvent) => void,
  ): Promise<PiProcessEventRoute> {
    await mount();
    if (!unlisten) throw new Error("Pi process event dispatcher is not mounted.");
    const current = routes.get(authority.journeyId);
    if (current && !current.closed) throw new Error(`Pi process route already active for Journey ${authority.journeyId}.`);
    if (wasClosedInCurrentLifecycle(authority)) {
      throw new Error(`Pi process route already closed for Journey ${authority.journeyId}.`);
    }
    const route: Route = { authority, handler, closed: false };
    routes.set(authority.journeyId, route);
    return routeHandle(route);
  }

  async function rehydrate(
    authority: RunAuthority,
    handler: (event: PiProcessEvent) => void,
  ): Promise<PiProcessEventRoute> {
    await mount();
    if (!unlisten) throw new Error("Pi process event dispatcher is not mounted.");
    if (wasClosedInCurrentLifecycle(authority)) {
      return routeHandle({ authority, handler, closed: true });
    }
    const current = routes.get(authority.journeyId);
    if (current && !current.closed) {
      if (!samePiProcessEventAuthority(current.authority.eventAuthority, authority)) {
        throw new Error(`Pi process route authority mismatch for Journey ${authority.journeyId}.`);
      }
      current.handler = handler;
      return routeHandle(current);
    }
    const route: Route = { authority, handler, closed: false };
    routes.set(authority.journeyId, route);
    return routeHandle(route);
  }

  return {
    mount,
    dispose,
    register,
    rehydrate,
    quarantine: () => [...rejected],
  };
}

export const piProcessEventDispatcher = createPiProcessEventDispatcher();
