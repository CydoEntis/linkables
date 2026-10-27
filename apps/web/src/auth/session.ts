import { sessionSchema, signInRequestSchema } from "@linkables/shared/auth";
import { ApiError, NETWORK_ERROR, parseData, readEnvelope } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { z } from "zod";
import { env } from "../config/env";

export type Session = z.infer<typeof sessionSchema>;
type Listener = (session: Session | null) => void;
let current: Session | null = null;
let revision = 0;
const listeners = new Set<Listener>();
export const AUTH_CHANGED_KEY = "linkables.auth.changed";

export function currentSession(): Session | null { return current; }

export function rememberSession(session: Session | null): void {
  revision += 1;
  current = session;
  for (const listener of listeners) listener(session);
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

async function request(path: string, body?: unknown, token?: string) {
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}/api/v1/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: token === undefined ? "include" : "omit",
      redirect: "error",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error instanceof TypeError) throw new ApiError(NETWORK_ERROR, "Could not reach your Linkables server", undefined, { cause: error });
    throw error;
  }
  const envelope = await readEnvelope(response);
  if (!envelope.ok) throw new ApiError(envelope.error.code, envelope.error.message, envelope.meta.requestId);
  return envelope.data;
}

export async function loadSession(): Promise<Session | null> {
  const started = revision;
  try {
    const session = parseData(sessionSchema, await request("session"));
    if (revision !== started) return current;
    rememberSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHENTICATED) {
      if (revision !== started) return current;
      rememberSession(null);
      return null;
    }
    throw error;
  }
}

export async function signIn(values: z.infer<typeof signInRequestSchema>): Promise<void> {
  const session = parseData(sessionSchema, await request("sign-in", signInRequestSchema.parse(values)));
  rememberSession(session);
  publishSessionChange();
}

export async function signOut(): Promise<void> {
  const session = current;
  if (session) {
    try { await request("sign-out", {}, session.token); }
    catch (error) {
      if (!(error instanceof ApiError) || error.code !== ERROR_CODES.UNAUTHENTICATED) throw error;
    }
  }
  if (current?.token === session?.token) rememberSession(null);
  publishSessionChange();
}

// The server rejected the bearer token; clearing it must not depend on a second request.
export function forgetSession(expectedToken?: string | null): Promise<void> {
  if (expectedToken !== undefined && (current?.token ?? null) !== expectedToken) return Promise.resolve();
  rememberSession(null);
  publishSessionChange();
  return Promise.resolve();
}

function publishSessionChange(): void {
  try { localStorage.setItem(AUTH_CHANGED_KEY, crypto.randomUUID()); }
  catch (error) {
    // Private browsing can block storage; focusing another tab still reconciles its cookie.
    if (!(error instanceof DOMException)) throw error;
  }
}

export function startSessionSync(): () => void {
  let pending: Promise<Session | null> | null = null;
  let queued = false;
  let disposed = false;
  function reconcile() {
    if (pending) { queued = true; return; }
    pending = loadSession().catch((error: unknown) => {
      if (error instanceof ApiError) return current;
      throw error;
    }).finally(() => {
      pending = null;
      if (!disposed && queued) { queued = false; reconcile(); }
    });
  }
  function onStorage(event: StorageEvent) {
    if (event.key !== AUTH_CHANGED_KEY) return;
    rememberSession(null);
    reconcile();
  }
  function onVisible() {
    if (document.visibilityState === "visible") reconcile();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", reconcile);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    disposed = true;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", reconcile);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
