import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import {
  sharedCollectionSchema,
  shareAccessSchema,
  shareStateSchema,
  shareTokenSchema,
  VIEWER_SESSION_HEADER,
  viewerSessionSchema,
} from "@linkables/shared/sharing";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { captureLogger, createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionGroup, collectionItem, resource, savedLink, shareCode, shareViewerSession } from "../db/schema";
import type { SendViewerCode } from "./send-viewer-code";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const MINUTE = 60 * 1000;
const START = Date.UTC(2026, 9, 27, 12, 0, 0);
const SAM = "sam@example.com";
const OUTSIDER = "outsider@example.com";

type Setup = { clock: { at: number }; sent: { to: string; code: string }[]; app: ReturnType<typeof createTestApp>; lines: string[] };

function setup(sendViewerCode?: SendViewerCode | null): Setup {
  const clock = { at: START };
  const sent: Setup["sent"] = [];
  const { logger, lines } = captureLogger();
  const send: SendViewerCode = (message) => {
    sent.push(message);
    return Promise.resolve();
  };
  const app = createTestApp({ db, logger, now: () => clock.at, sendViewerCode: sendViewerCode === null ? undefined : (sendViewerCode ?? send) });
  return { clock, sent, app, lines };
}

async function insertCollection(userId: string, name: string) {
  const [row] = await db.insert(collection).values({ userId, name }).returning();
  if (row === undefined) throw new Error("no collection");
  return row;
}

async function fileLink(userId: string, collectionId: string, url: string, title: string, groupId: string | null = null) {
  const [res] = await db.insert(resource).values({ canonicalUrl: url, title, kind: "page" }).returning();
  if (res === undefined) throw new Error("no resource");
  const [link] = await db.insert(savedLink).values({ userId, resourceId: res.id, originalUrl: url }).returning();
  if (link === undefined) throw new Error("no link");
  await db.insert(collectionItem).values({ collectionId, savedLinkId: link.id, groupId });
}

function json(body: unknown, headers: Record<string, string> = {}) {
  return { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) };
}

async function turnOn(s: Setup, user: TestUser, id: string): Promise<string> {
  const res = await s.app.request(`/api/v1/collections/${id}/share`, { method: "POST", headers: user.headers });
  return shareTokenSchema.parse(successEnvelopeSchema(shareStateSchema).parse(await res.json()).data.token);
}

function putAccess(s: Setup, user: TestUser, id: string, body: unknown) {
  return s.app.request(`/api/v1/collections/${id}/share/access`, {
    method: "PUT",
    headers: { ...user.headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makePrivate(s: Setup, user: TestUser, name: string, emails = [SAM]) {
  const col = await insertCollection(user.id, name);
  const token = await turnOn(s, user, col.id);
  expect((await putAccess(s, user, col.id, { mode: "emails", emails })).status).toBe(200);
  return { col, token };
}

function askForCode(s: Setup, token: string, email: string, ip = "198.51.100.7") {
  return s.app.request(`/api/v1/shared/${token}/code`, json({ email }, { "X-Real-IP": ip }));
}

function verify(s: Setup, token: string, email: string, code: string, ip = "198.51.100.7") {
  return s.app.request(`/api/v1/shared/${token}/verify`, json({ email, code }, { "X-Real-IP": ip }));
}

function view(s: Setup, token: string, session?: string) {
  return s.app.request(`/api/v1/shared/${token}`, { headers: session === undefined ? {} : { [VIEWER_SESSION_HEADER]: session } });
}

async function signIn(s: Setup, token: string, email = SAM): Promise<string> {
  expect((await askForCode(s, token, email)).status).toBe(200);
  const code = s.sent.at(-1)?.code ?? "";
  const res = await verify(s, token, email, code);
  expect(res.status).toBe(200);
  return successEnvelopeSchema(viewerSessionSchema).parse(await res.json()).data.session;
}

async function errorCode(res: Response) {
  return failureEnvelopeSchema.parse(await res.json()).error;
}

describe("the owner's access choice", () => {
  it("lists the emails lower-cased and once each, and reads them back", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Trip");

    const put = await putAccess(s, a, col.id, { mode: "emails", emails: [" Sam@Example.com", SAM, "kim@example.com"] });
    const get = await s.app.request(`/api/v1/collections/${col.id}/share/access`, { headers: a.headers });

    expect(successEnvelopeSchema(shareAccessSchema).parse(await put.json()).data).toEqual({ mode: "emails", emails: ["kim@example.com", SAM] });
    expect(successEnvelopeSchema(shareAccessSchema).parse(await get.json()).data.mode).toBe("emails");
  });

  it("starts as anyone with the link", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Trip");

    const get = await s.app.request(`/api/v1/collections/${col.id}/share/access`, { headers: a.headers });

    expect(successEnvelopeSchema(shareAccessSchema).parse(await get.json()).data).toEqual({ mode: "link", emails: [] });
  });

  it("refuses a private share with nobody on the list", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Trip");

    const res = await putAccess(s, a, col.id, { mode: "emails", emails: [] });

    expect(res.status).toBe(400);
    expect((await errorCode(res)).code).toBe("VALIDATION");
  });

  it("refuses a malformed address and a list that is too long", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Trip");

    expect((await putAccess(s, a, col.id, { mode: "emails", emails: ["not an email"] })).status).toBe(400);
    const many = Array.from({ length: 51 }, (_, i) => `p${String(i)}@example.com`);
    expect((await putAccess(s, a, col.id, { mode: "emails", emails: many })).status).toBe(400);
  });

  it("answers UPSTREAM, saving nothing, when the API has no way to send mail", async () => {
    const s = setup(null);
    const col = await insertCollection(a.id, "Trip");

    const res = await putAccess(s, a, col.id, { mode: "emails", emails: [SAM] });

    expect(res.status).toBe(502);
    expect((await errorCode(res)).code).toBe("UPSTREAM");
    const [row] = await db.select({ sharePrivate: collection.sharePrivate }).from(collection).where(eq(collection.id, col.id));
    expect(row?.sharePrivate).toBe(false);
  });

  it("is NOT_FOUND for another user's collection, on read and write", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Trip");

    const get = await s.app.request(`/api/v1/collections/${col.id}/share/access`, { headers: b.headers });
    const put = await putAccess(s, b, col.id, { mode: "emails", emails: [SAM] });

    expect(get.status).toBe(404);
    expect(put.status).toBe(404);
    const [row] = await db.select({ sharePrivate: collection.sharePrivate }).from(collection).where(eq(collection.id, col.id));
    expect(row?.sharePrivate).toBe(false);
  });
});

describe("opening a private share", () => {
  it("asks for a sign-in instead of showing the collection, without naming it", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Secret trip");

    const res = await view(s, token);
    const text = await res.text();

    expect(res.status).toBe(401);
    expect(JSON.parse(text)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(text).not.toContain("Secret trip");
  });

  it("shows the collection to a listed email that enters the code, only the groups the owner shares", async () => {
    const s = setup();
    const { col, token } = await makePrivate(s, a, "Secret trip");
    const [shown] = await db.insert(collectionGroup).values({ collectionId: col.id, name: "Shown", position: 0, shared: true }).returning();
    const [hidden] = await db.insert(collectionGroup).values({ collectionId: col.id, name: "Hidden group", position: 1, shared: false }).returning();
    await fileLink(a.id, col.id, "https://example.com/in", "In the shown group", shown?.id);
    await fileLink(a.id, col.id, "https://example.com/out", "In the hidden group", hidden?.id);

    const session = await signIn(s, token);
    const res = await view(s, token, session);
    const text = await res.text();

    expect(sharedCollectionSchema.parse(successEnvelopeSchema(sharedCollectionSchema).parse(JSON.parse(text)).data).name).toBe("Secret trip");
    expect(text).toContain("In the shown group");
    expect(text).not.toContain("In the hidden group");
    expect(text).not.toContain("Hidden group");
  });

  it("sends no mail to an address that is not listed, and answers exactly as for a listed one", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    const listed = await askForCode(s, token, SAM);
    const unlisted = await askForCode(s, token, OUTSIDER);

    expect(s.sent.map((m) => m.to)).toEqual([SAM]);
    expect(unlisted.status).toBe(listed.status);
    const [listedBody, unlistedBody] = [await listed.json(), await unlisted.json()] as { ok: boolean; data: unknown }[];
    expect(unlistedBody).toMatchObject({ ok: true, data: null });
    expect({ ok: unlistedBody?.ok, data: unlistedBody?.data }).toEqual({ ok: listedBody?.ok, data: listedBody?.data });
  });

  it("answers the same for an unknown token, a link anyone may open, and a turned-off one", async () => {
    const s = setup();
    const open = await insertCollection(a.id, "Open");
    const openToken = await turnOn(s, a, open.id);

    const unknown = await askForCode(s, "A".repeat(32), SAM);
    const anyone = await askForCode(s, openToken, SAM);

    expect(unknown.status).toBe(200);
    expect(anyone.status).toBe(200);
    expect(s.sent).toEqual([]);
  });

  it("matches the address ignoring case", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    await askForCode(s, token, "SAM@Example.COM");

    expect(s.sent.map((m) => m.to)).toEqual([SAM]);
  });

  it("does not accept an unlisted email even with a valid code for a listed one", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);

    const res = await verify(s, token, OUTSIDER, s.sent[0]?.code ?? "");

    expect(res.status).toBe(401);
    expect((await errorCode(res)).code).toBe("UNAUTHENTICATED");
  });

  it("gives the same answer to a wrong code, an unlisted email and an unknown link", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    const real = s.sent[0]?.code ?? "";
    const wrong = real === "000000" ? "000001" : "000000";

    const bodies = await Promise.all(
      [verify(s, token, SAM, wrong), verify(s, token, OUTSIDER, real), verify(s, "A".repeat(32), SAM, real)].map(async (p) => {
        const res = await p;
        return { status: res.status, error: await errorCode(res).then(({ code, message }) => ({ code, message })) };
      }),
    );

    expect(new Set(bodies.map((x) => JSON.stringify(x))).size).toBe(1);
    expect(bodies[0]?.status).toBe(401);
  });

  it("takes a code once", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    const code = s.sent[0]?.code ?? "";

    expect((await verify(s, token, SAM, code)).status).toBe(200);
    expect((await verify(s, token, SAM, code)).status).toBe(401);
  });

  it("lets only one of two simultaneous right answers through", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    const code = s.sent[0]?.code ?? "";

    const results = await Promise.all([verify(s, token, SAM, code, "198.51.100.1"), verify(s, token, SAM, code, "198.51.100.2")]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it("expires a code after ten minutes", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    s.clock.at += 10 * MINUTE + 1;

    expect((await verify(s, token, SAM, s.sent[0]?.code ?? "")).status).toBe(401);
  });

  it("accepts a code just inside the ten minutes", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    s.clock.at += 10 * MINUTE - 1000;

    expect((await verify(s, token, SAM, s.sent[0]?.code ?? "")).status).toBe(200);
  });

  it("burns the code after five wrong answers, even if the sixth is right", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    const real = s.sent[0]?.code ?? "";
    const wrong = real === "000000" ? "000001" : "000000";

    for (let i = 0; i < 5; i += 1) expect((await verify(s, token, SAM, wrong, `198.51.100.${String(i + 10)}`)).status).toBe(401);

    expect((await verify(s, token, SAM, real, "198.51.100.99")).status).toBe(401);
  });

  it("replaces the earlier code when a new one is asked for", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    s.clock.at += MINUTE;
    await askForCode(s, token, SAM);
    const [first, second] = s.sent.map((m) => m.code);

    expect(await db.select().from(shareCode)).toHaveLength(1);
    // The old code is dead unless the two happen to match (one in a million).
    if (first !== second) expect((await verify(s, token, SAM, first ?? "")).status).toBe(401);
    expect((await verify(s, token, SAM, second ?? "")).status).toBe(200);
  });

  it("stores the code only as a salted hash", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);

    const rows = await db.select().from(shareCode);

    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0])).not.toContain(s.sent[0]?.code ?? "unreachable");
    expect(rows[0]?.codeHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("limits code requests for one address on one link, listed or not", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    const listed: number[] = [];
    const unlisted: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      listed.push((await askForCode(s, token, SAM, `198.51.100.${String(i + 20)}`)).status);
      unlisted.push((await askForCode(s, token, OUTSIDER, `198.51.100.${String(i + 40)}`)).status);
    }

    expect(listed).toEqual(unlisted);
    expect(listed).toEqual([200, 200, 200, 429, 429]);
    expect(s.sent).toHaveLength(3);
  });

  it("limits one network address, whatever the emails", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) statuses.push((await askForCode(s, token, `p${String(i)}@example.com`)).status);

    expect(statuses.filter((x) => x === 429).length).toBeGreaterThan(0);
    expect(s.sent).toEqual([]);
  });

  it("limits wrong answers per address on one link", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) statuses.push((await verify(s, token, SAM, "123456", `198.51.100.${String(i + 60)}`)).status);

    expect(statuses.at(-1)).toBe(429);
  });

  it("never logs an email address or a code", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await askForCode(s, token, SAM);
    await askForCode(s, token, OUTSIDER);
    await verify(s, token, SAM, s.sent[0]?.code ?? "");
    await verify(s, token, OUTSIDER, "123456");

    const log = s.lines.join("\n");
    expect(log).not.toContain("example.com");
    expect(log).not.toContain(s.sent[0]?.code ?? "unreachable");
  });

  it("still answers when the mail fails, and logs the failure without the address", async () => {
    const s = setup(() => Promise.reject(new Error("Resend answered 500")));
    const { token } = await makePrivate(s, a, "Trip");

    const res = await askForCode(s, token, SAM);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.status).toBe(200);
    expect(s.lines.join("\n")).toContain("viewer code email failed");
    expect(s.lines.join("\n")).not.toContain("example.com");
  });
});

describe("a viewer's session", () => {
  it("lasts twelve hours and then asks again", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    const session = await signIn(s, token);

    s.clock.at += 12 * 60 * MINUTE - 1000;
    expect((await view(s, token, session)).status).toBe(200);
    s.clock.at += 2000;
    expect((await view(s, token, session)).status).toBe(401);
  });

  it("opens only the collection it was issued for", async () => {
    const s = setup();
    const first = await makePrivate(s, a, "First");
    const second = await makePrivate(s, a, "Second");
    const session = await signIn(s, first.token);

    expect((await view(s, first.token, session)).status).toBe(200);
    expect((await view(s, second.token, session)).status).toBe(401);
  });

  it("is refused when it is garbage", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");

    expect((await view(s, token, "x".repeat(32))).status).toBe(401);
    expect((await view(s, token, "short")).status).toBe(401);
  });

  it("stops working when the owner removes that email", async () => {
    const s = setup();
    const { col, token } = await makePrivate(s, a, "Trip", [SAM, "kim@example.com"]);
    const session = await signIn(s, token);

    await putAccess(s, a, col.id, { mode: "emails", emails: ["kim@example.com"] });

    expect((await view(s, token, session)).status).toBe(401);
  });

  it("stops working when the owner turns the link off, and a new link starts clean", async () => {
    const s = setup();
    const { col, token } = await makePrivate(s, a, "Trip");
    const session = await signIn(s, token);

    await s.app.request(`/api/v1/collections/${col.id}/share`, { method: "DELETE", headers: a.headers });
    expect((await view(s, token, session)).status).toBe(404);
    expect(await db.select().from(shareViewerSession)).toEqual([]);
    const fresh = await turnOn(s, a, col.id);

    expect((await view(s, fresh, session)).status).toBe(401);
  });

  it("is stored only as a hash", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    const session = await signIn(s, token);

    const rows = await db.select().from(shareViewerSession);

    expect(JSON.stringify(rows)).not.toContain(session);
  });

  it("is not needed once the owner makes the share open to anyone with the link", async () => {
    const s = setup();
    const { col, token } = await makePrivate(s, a, "Trip");
    await putAccess(s, a, col.id, { mode: "link", emails: [SAM] });

    expect((await view(s, token)).status).toBe(200);
    await askForCode(s, token, SAM);
    expect(s.sent).toEqual([]);
  });

  it("is ignored on a share anyone may open", async () => {
    const s = setup();
    const col = await insertCollection(a.id, "Open");
    const token = await turnOn(s, a, col.id);

    expect((await view(s, token, "x".repeat(32))).status).toBe(200);
  });
});

describe("clearing out", () => {
  it("deletes expired codes and sessions on the next request", async () => {
    const s = setup();
    const { token } = await makePrivate(s, a, "Trip");
    await signIn(s, token);
    await askForCode(s, token, SAM);
    s.clock.at += 13 * 60 * MINUTE;

    await askForCode(s, token, "other@example.com", "198.51.100.200");

    expect(await db.select().from(shareViewerSession)).toEqual([]);
    expect(await db.select().from(shareCode)).toEqual([]);
  });
});
