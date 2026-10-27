import { sessionSchema, signInRequestSchema } from "@linkables/shared/auth";
import { ApiError, NETWORK_ERROR, parseData, readEnvelope } from "@linkables/shared/api-client";
import { z } from "zod";
import { setServerOrigin } from "../config/env";
import { serverOriginSchema, hostPermission } from "../config/server-origin";

export const CONNECTION_KEY = "linkables.connection";
const connectionSchema = z.object({ origin: serverOriginSchema, session: sessionSchema.nullable() });
export type Connection = z.infer<typeof connectionSchema>;

export async function readConnection(area = chrome.storage.local): Promise<Connection | null> {
  const parsed = connectionSchema.safeParse((await area.get(CONNECTION_KEY))[CONNECTION_KEY]);
  if (!parsed.success) return null;
  setServerOrigin(parsed.data.origin);
  return parsed.data;
}

export async function configureServer(origin: string): Promise<void> {
  const checked = serverOriginSchema.parse(origin);
  // Request before any await: both browsers require the original user gesture.
  const granted = await chrome.permissions.request({ origins: [hostPermission(checked)] });
  if (!granted) throw new Error("Allow access to your server to continue.");
  await chrome.storage.local.set({ [CONNECTION_KEY]: { origin: checked, session: null } });
  setServerOrigin(checked);
}

async function authRequest(connection: Connection, path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(connection.origin + "/api/v1/auth/" + path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "omit",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(connection.session ? { Authorization: `Bearer ${connection.session.token}` } : {}) },
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

export async function signIn(values: z.infer<typeof signInRequestSchema>): Promise<void> {
  const connection = await readConnection();
  if (!connection) throw new Error("Choose your Linkables server first.");
  const session = parseData(sessionSchema, await authRequest(connection, "sign-in", signInRequestSchema.parse(values)));
  const current = await readConnection();
  if (current?.origin !== connection.origin) throw new Error("Server changed. Sign in to the selected server.");
  await chrome.storage.local.set({ [CONNECTION_KEY]: { origin: connection.origin, session } });
}

export async function forgetSession(expectedOrigin?: string): Promise<void> {
  const connection = await readConnection();
  if (connection && (expectedOrigin === undefined || connection.origin === expectedOrigin)) {
    await chrome.storage.local.set({ [CONNECTION_KEY]: { origin: connection.origin, session: null } });
  }
}

export async function disconnectServer(): Promise<void> {
  await chrome.storage.local.remove(CONNECTION_KEY);
  setServerOrigin("");
}

export async function signOut(): Promise<void> {
  const connection = await readConnection();
  if (connection?.session) await authRequest(connection, "sign-out", {});
  await forgetSession(connection?.origin);
}

export const signOutByHand = signOut;

export async function hasSession(): Promise<boolean> {
  const connection = await readConnection();
  return connection?.session !== null && connection?.session !== undefined && Date.parse(connection.session.expiresAt) > Date.now();
}
