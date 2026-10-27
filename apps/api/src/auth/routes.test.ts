import { randomUUID } from "node:crypto";
import { sessionSchema } from "@linkables/shared/auth";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authFixture, createFixtureUser, PASSWORD } from "../../test/auth/local";
import { createLogger } from "../log/logger";
import { requestId } from "../http/request-id";
import { onError } from "../http/error-handler";
import type { AppEnv } from "../http/env";
import { authRoutes } from "./routes";
import { createLocalAuth } from "./local-auth";
import { resetPassword } from "./provision";

let fixture: Awaited<ReturnType<typeof authFixture>>;
let app: Hono<AppEnv>;
const email = "owner@example.com";
const envelope = successEnvelopeSchema(sessionSchema);

beforeEach(async () => {
  fixture = await authFixture();
  await createFixtureUser(fixture, randomUUID(), email);
  app = new Hono<AppEnv>().use(requestId).route("/api/v1", authRoutes(fixture.auth, fixture.config, Date.now));
  app.onError(onError(createLogger("error", () => undefined)));
});
afterEach(() => { fixture.close(); });

function signIn(password = PASSWORD, origin = fixture.config.appOrigin, address = email) {
  return app.request("/api/v1/auth/sign-in", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email: address, password }) });
}

describe("local sign-in", () => {
  it("returns an authenticated session and HttpOnly cookie", async () => {
    const response = await signIn();
    expect(response.status).toBe(200);
    const { data } = envelope.parse(await response.json());
    expect(data.user.email).toBe(email);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const session = await app.request("/api/v1/auth/session", { headers: { Authorization: `Bearer ${data.token}` } });
    expect(envelope.parse(await session.json()).data.user.id).toBe(data.user.id);
  });

  it("restores a browser session from its cookie", async () => {
    const signedIn = await signIn();
    const cookie = signedIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const response = await app.request("/api/v1/auth/session", { headers: { Cookie: cookie } });
    expect(response.status).toBe(200);
  });

  it("gives the same failure for unknown email and wrong password", async () => {
    const unknown = await signIn(PASSWORD, fixture.config.appOrigin, "unknown@example.com");
    const incorrect = await signIn("incorrect-password");
    expect(unknown.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(failureEnvelopeSchema.parse(await unknown.json()).error).toEqual(failureEnvelopeSchema.parse(await incorrect.json()).error);
  });

  it("rejects a browser sign-in from an unrelated website", async () => {
    expect((await signIn(PASSWORD, "https://evil.example")).status).toBe(403);
  });

  it("allows a configured Chrome extension", async () => {
    expect((await signIn(PASSWORD, fixture.config.trustedOrigins[1])).status).toBe(200);
  });

  it("allows a Firefox extension origin", async () => {
    expect((await signIn(PASSWORD, "moz-extension://b0dc8e29-ff31-4c46-8b68-d7378b2ae941")).status).toBe(200);
  });

  it("revokes a token on sign-out", async () => {
    const { data } = envelope.parse(await (await signIn()).json());
    const headers = { Authorization: `Bearer ${data.token}`, Origin: fixture.config.appOrigin };
    expect((await app.request("/api/v1/auth/sign-out", { method: "POST", headers })).status).toBe(200);
    expect((await app.request("/api/v1/auth/session", { headers })).status).toBe(401);
  });

  it("does not expose a public signup endpoint", async () => {
    const response = await app.request("/api/v1/auth/sign-up/email", { method: "POST" });
    expect(response.status).toBe(404);
    await expect(createLocalAuth(fixture.client, fixture.config).api.signUpEmail({ body: { email: "new@example.com", name: "New", password: PASSWORD } })).rejects.toThrow();
  });

  it("limits repeated password attempts", async () => {
    for (let count = 0; count < 5; count++) await signIn("incorrect-password");
    expect((await signIn("incorrect-password")).status).toBe(429);
  });

  it("preserves local sign-in across creating a fresh auth service", async () => {
    const fresh = createLocalAuth(fixture.client, fixture.config);
    const session = await fresh.api.signInEmail({ body: { email, password: PASSWORD } });
    expect(session.user.email).toBe(email);
  });

  it("password reset revokes all old sessions and permits the new password", async () => {
    const { data } = envelope.parse(await (await signIn()).json());
    await resetPassword(fixture.client, fixture.config, { email, password: "new-strong-test-password" });
    expect((await app.request("/api/v1/auth/session", { headers: { Authorization: `Bearer ${data.token}` } })).status).toBe(401);
    expect((await signIn("new-strong-test-password")).status).toBe(200);
  });

  it("keeps one user's session when another user signs out", async () => {
    await createFixtureUser(fixture, randomUUID(), "other@example.com");
    const owner = envelope.parse(await (await signIn()).json()).data;
    const other = envelope.parse(await (await signIn(PASSWORD, fixture.config.appOrigin, "other@example.com")).json()).data;
    expect(owner.user.id).not.toBe(other.user.id);
    await app.request("/api/v1/auth/sign-out", { method: "POST", headers: { Authorization: `Bearer ${other.token}` } });
    expect((await app.request("/api/v1/auth/session", { headers: { Authorization: `Bearer ${owner.token}` } })).status).toBe(200);
    expect((await app.request("/api/v1/auth/session", { headers: { Authorization: `Bearer ${other.token}` } })).status).toBe(401);
  });

  it("sets a first local password for a migrated OAuth account without changing its id", async () => {
    const id = randomUUID();
    const now = Date.now();
    await fixture.client.execute({ sql: 'INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)', args: [id,"Migrated","migrated@example.com",1,now,now] });
    await resetPassword(fixture.client, fixture.config, { email: "migrated@example.com", password: PASSWORD });
    const signedIn = await fixture.auth.api.signInEmail({ body: { email: "migrated@example.com", password: PASSWORD } });
    expect(signedIn.user.id).toBe(id);
  });

  it("rejects expired sessions", async () => {
    const { data } = envelope.parse(await (await signIn()).json());
    await fixture.client.execute({ sql: "UPDATE session SET expires_at = 0 WHERE token = ?", args: [data.token] });
    expect((await app.request("/api/v1/auth/session", { headers: { Authorization: `Bearer ${data.token}` } })).status).toBe(401);
  });
});
