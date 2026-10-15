import { listen as tauriListen } from "@tauri-apps/api/event";
import {
  samePiProcessEventAuthority,
  type PiProcessEventAuthority,
  type RunAuthority,
} from "../domain/runAuthority";
import { runtimeWorkspaceKey, workspaceOfAuthority } from "../domain/journeyWorkspaceKey";

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
  quarantine(): ReadonlyArray<{ journeyId?: string; threadId?: string; runId?: string; reason: string }>;
};

/**
 * CR141: the route key. A Pi process event belongs to a workspace, not to a Journey, and keying
 * this map by `journeyId` is what refused a sibling's send inside `register` before admission was
 * ever consulted — the defect CR138, CR139 and CR140 each left untouched because every First
 * Investigation surveyed admission and none surveyed the transport.
 *
 * Structural on purpose: `RunAuthority` and `PiProcessEventAuthority` are two different records
 * that both carry the two coordinates, and `thread_id` is required on every event of every kind
 * (`main.rs:323`), emitted through the single `emit()` at `main.rs:8228`.
 */
function routeKey(authority: { readonly journeyId: string; readonly threadId: string }): string {
  return runtimeWorkspaceKey(workspaceOfAuthority(authority));
}

function describeWorkspace(authority: { readonly journeyId: string; readonly threadId: string }): string {
  return `${authority.journeyId}/${authority.threadId}`;
}

const QUARANTINE_LIMIT = 20;
const CLOSED_ROUTE_LIMIT = 20;

export function createPiProcessEventDispatcher(
  dependencies: { listen?: Listen } = {},
): PiProcessEventDispatcher {
  const listen = dependencies.listen ?? (tauriListen as Listen);
  const routes = new Map<string, Route>();
  const rejected: Array<{ journeyId?: string; threadId?: string; runId?: string; reason: string }> = [];
  const closedAuthorities: PiProcessEventAuthority[] = [];
  let unlisten: (() => void) | undefined;
  let mounting: Promise<void> | undefined;
  let mountingLifecycle: number | undefined;
  let lifecycle = 0;

  function reject(event: PiProcessEvent, reason: string) {
    rejected.push({
      journeyId: event.authority?.journeyId,
      threadId: event.authority?.threadId,
      runId: event.authority?.runId,
      reason,
    });
    if (rejected.length > QUARANTINE_LIMIT) rejected.splice(0, rejected.length - QUARANTINE_LIMIT);
  }

  function wasClosedInCurrentLifecycle(authority: RunAuthority): boolean {
    return closedAuthorities.some((closed) => samePiProcessEventAuthority(closed, authority));
  }

  function rememberClosedAuthority(authority: PiProcessEventAuthority) {
    // CR141: deduped by workspace, not by Journey. This list is what stops a closed route from
    // being resurrected by a late `rehydrate` (`dafd3c9`, 2026-09-01). Replacing by Journey once
    // siblings can run would let one workspace's closure evict another's, reopening exactly the
    // resurrection that commit prevents.
    const key = routeKey(authority);
    const existing = closedAuthorities.findIndex((closed) => routeKey(closed) === key);
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
    const route = routes.get(routeKey(event.authority));
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
        const key = routeKey(route.authority);
        if (routes.get(key) === route) routes.delete(key);
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
        const key = routeKey(route.authority);
        if (routes.get(key) === route) routes.delete(key);
      },
    };
  }

  async function register(
    authority: RunAuthority,
    handler: (event: PiProcessEvent) => void,
  ): Promise<PiProcessEventRoute> {
    await mount();
    if (!unlisten) throw new Error("Pi process event dispatcher is not mounted.");
    const current = routes.get(routeKey(authority));
    if (current && !current.closed) {
      throw new Error(`Pi process route already active for workspace ${describeWorkspace(authority)}.`);
    }
    if (wasClosedInCurrentLifecycle(authority)) {
      throw new Error(`Pi process route already closed for workspace ${describeWorkspace(authority)}.`);
    }
    const route: Route = { authority, handler, closed: false };
    routes.set(routeKey(authority), route);
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
    const current = routes.get(routeKey(authority));
    if (current && !current.closed) {
      if (!samePiProcessEventAuthority(current.authority.eventAuthority, authority)) {
        throw new Error(`Pi process route authority mismatch for workspace ${describeWorkspace(authority)}.`);
      }
      current.handler = handler;
      return routeHandle(current);
    }
    const route: Route = { authority, handler, closed: false };
    routes.set(routeKey(authority), route);
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
