import { sessionSchema, signInRequestSchema } from "@linkables/shared/auth";
import { ApiError, NETWORK_ERROR, parseData, readEnvelope } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { z } from "zod";
import { env } from "../config/env";

export type Session = z.infer<typeof sessionSchema>;
type Listener = (session: Session | null) => void;
let current: Session | null = null;
const listeners = new Set<Listener>();

export function currentSession(): Session | null { return current; }

export function rememberSession(session: Session | null): void {
  current = session;
  for (const listener of listeners) listener(session);
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

async function request(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}/api/v1/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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
  try {
    const session = parseData(sessionSchema, await request("session"));
    rememberSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHENTICATED) {
      rememberSession(null);
      return null;
    }
    throw error;
  }
}

export async function signIn(values: z.infer<typeof signInRequestSchema>): Promise<void> {
  const session = parseData(sessionSchema, await request("sign-in", signInRequestSchema.parse(values)));
  rememberSession(session);
}

export async function signOut(): Promise<void> {
  await request("sign-out", {});
  rememberSession(null);
}

// The server rejected the bearer token; clearing it must not depend on a second request.
export function forgetSession(): Promise<void> {
  rememberSession(null);
  return Promise.resolve();
}
