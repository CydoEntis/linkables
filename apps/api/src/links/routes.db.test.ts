import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkaroo/shared/http";
import { saveLinkResponseSchema } from "@linkaroo/shared/links";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { job, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const responseSchema = successEnvelopeSchema(saveLinkResponseSchema);

async function save(app: ReturnType<typeof createTestApp>, user: TestUser, url: string) {
  return app.request("/api/v1/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify({ url }),
  });
}

async function saved(res: Response) {
  return responseSchema.parse(await res.json()).data;
}

describe("POST /links", () => {
  it("saves a new url as a pending resource with one job", async () => {
    const res = await save(createTestApp({ db }), a, "https://example.com/post?ref=me");

    expect(res.status).toBe(201);
    const link = await saved(res);
    expect(link).toMatchObject({
      originalUrl: "https://example.com/post?ref=me",
      duplicate: false,
      resource: { canonicalUrl: "https://example.com/post?ref=me", fetchStatus: "pending" },
    });
    expect(await db.select({ resourceId: job.resourceId }).from(job)).toEqual([{ resourceId: link.resource.id }]);
  });

  it("returns the existing link on a resave without a new job", async () => {
    const app = createTestApp({ db });
    const first = await saved(await save(app, a, "https://example.com/post"));

    const res = await save(app, a, "https://example.com/post");

    expect(res.status).toBe(200);
    expect(await saved(res)).toMatchObject({ id: first.id, duplicate: true });
    expect(await db.$count(job)).toBe(1);
  });

  it("gives a second user their own link to the same resource without a new job", async () => {
    const app = createTestApp({ db });
    const first = await saved(await save(app, a, "https://example.com/post"));

    const res = await save(app, b, "https://example.com/post");

    expect(res.status).toBe(201);
    const second = await saved(res);
    expect(second.id).not.toBe(first.id);
    expect(second.resource.id).toBe(first.resource.id);
    expect(await db.select({ userId: savedLink.userId }).from(savedLink)).toHaveLength(2);
    expect(await db.$count(job)).toBe(1);
  });

  it("stores the submitted url without surrounding whitespace", async () => {
    const res = await save(createTestApp({ db }), a, "  https://example.com/post \n");

    expect(res.status).toBe(201);
    expect((await saved(res)).originalUrl).toBe("https://example.com/post");
  });

  it("dedupes urls that differ only by tracking params", async () => {
    const app = createTestApp({ db });
    const first = await saved(await save(app, a, "https://example.com/post?utm_source=x"));

    const res = await save(app, a, "https://example.com/post?utm_medium=y&utm_campaign=z");

    expect(res.status).toBe(200);
    expect((await saved(res)).id).toBe(first.id);
    expect(await db.$count(resource)).toBe(1);
  });

  it("creates one resource and one job when users save a new url at the same time", async () => {
    const app = createTestApp({ db });
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/race/${String(i)}`);

    const responses = await Promise.all(urls.flatMap((url) => [save(app, a, url), save(app, b, url)]));

    expect(responses.map((res) => res.status)).toEqual(responses.map(() => 201));
    expect(await db.$count(resource)).toBe(urls.length);
    expect(await db.$count(job)).toBe(urls.length);
    expect(await db.$count(savedLink)).toBe(urls.length * 2);
  });
});

describe("POST /links rate limit", () => {
  function clockedApp() {
    let now = Date.parse("2026-10-22T12:00:00Z");
    const app = createTestApp({ db, now: () => now });
    return { app, advance: (ms: number) => (now += ms) };
  }

  async function saveTimes(app: ReturnType<typeof createTestApp>, user: TestUser, times: number) {
    const responses = await Promise.all(Array.from({ length: times }, () => save(app, user, "https://example.com/post")));
    expect(responses.every((res) => res.status < 300)).toBe(true);
  }

  it("rejects the 61st save in a minute with a retry hint", async () => {
    const { app, advance } = clockedApp();
    await saveTimes(app, a, 60);
    advance(59_000);

    const res = await save(app, a, "https://example.com/post");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("RATE_LIMIT");
  });

  it("allows saving again once the minute has passed", async () => {
    const { app, advance } = clockedApp();
    await saveTimes(app, a, 60);
    expect((await save(app, a, "https://example.com/post")).status).toBe(429);
    advance(60_000);

    const res = await save(app, a, "https://example.com/post");

    expect(res.status).toBe(200);
  });

  it("limits each user separately", async () => {
    const { app } = clockedApp();
    await saveTimes(app, a, 60);

    const res = await save(app, b, "https://example.com/post");

    expect(res.status).toBe(201);
  });
});
