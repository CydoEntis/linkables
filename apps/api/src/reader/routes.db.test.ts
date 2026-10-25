import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { readerViewSchema } from "@linkables/shared/reader";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { captureLogger, createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { resource, resourceReader, savedLink } from "../db/schema";
import type { AppDeps } from "../app";
import { FetchError, type HtmlPage } from "../metadata/fetcher";
import { ExtractError } from "./extract-pool";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const CANONICAL = "https://blog.example.com/posts/build-times";
const DAY_MS = 24 * 60 * 60 * 1000;
const ARTICLE = readFileSync(new URL("./fixtures/article.html", import.meta.url), "utf8");
const NO_ARTICLE = readFileSync(new URL("./fixtures/no-article.html", import.meta.url), "utf8");

type Page = HtmlPage | FetchError;

type Extract = AppDeps["extract"];

function setup(page: Page = { url: CANONICAL, contentType: "text/html", html: ARTICLE }, extract?: Extract) {
  const fetched: string[] = [];
  const clock = { at: Date.parse("2026-10-25T12:00:00Z") };
  const { logger, lines } = captureLogger();
  let next = page;
  const app = createTestApp({
    db,
    logger,
    now: () => clock.at,
    ...(extract === undefined ? {} : { extract }),
    fetchPage: (url) => {
      fetched.push(url);
      return next instanceof FetchError ? Promise.reject(next) : Promise.resolve(next);
    },
  });
  return { app, fetched, clock, lines, serve: (page: Page) => { next = page; } };
}

async function saveFor(user: TestUser, fields: Partial<typeof resource.$inferInsert> = {}, originalUrl = `${CANONICAL}?token=${user.id}`) {
  const [res] = await db
    .insert(resource)
    .values({ canonicalUrl: CANONICAL, ...fields })
    .onConflictDoUpdate({ target: resource.canonicalUrl, set: { kind: fields.kind ?? null } })
    .returning();
  const [link] = await db.insert(savedLink).values({ userId: user.id, resourceId: res?.id ?? "", originalUrl }).returning();
  if (!link) throw new Error("saved_link insert returned no row");
  return link;
}

function read(app: ReturnType<typeof createTestApp>, user: TestUser, linkId: string) {
  return app.request(`/api/v1/links/${linkId}/reader`, { headers: user.headers });
}

async function view(res: Response) {
  expect(res.status).toBe(200);
  return successEnvelopeSchema(readerViewSchema).parse(await res.json()).data;
}

describe("GET /links/:id/reader", () => {
  it("fetches the page's canonical URL and returns its article with the user's own URL", async () => {
    const { app, fetched } = setup();
    const link = await saveFor(a);

    const result = await view(await read(app, a, link.id));

    expect(fetched).toEqual([CANONICAL]);
    expect(result).toMatchObject({
      status: "ok",
      url: link.originalUrl,
      article: { title: "How We Cut Build Times in Half", siteName: "Example Engineering", minutes: 1 },
    });
  });

  it("gives a second user the stored copy without fetching again, with their own URL", async () => {
    const { app, fetched } = setup();
    const linkA = await saveFor(a);
    const linkB = await saveFor(b);
    const forA = await view(await read(app, a, linkA.id));

    const forB = await view(await read(app, b, linkB.id));

    expect(fetched).toHaveLength(1);
    expect(forB).toEqual({ ...forA, url: linkB.originalUrl });
    expect(JSON.stringify(forB)).not.toContain(a.id);
  });

  it("answers another user's link exactly as an unknown one, without fetching", async () => {
    const { app, fetched } = setup();
    const linkA = await saveFor(a);

    const theirs = await read(app, b, linkA.id);
    const unknown = await read(app, b, randomUUID());

    expect(theirs.status).toBe(404);
    const { error } = failureEnvelopeSchema.parse(await theirs.json());
    expect(error.code).toBe("NOT_FOUND");
    expect(error).toEqual(failureEnvelopeSchema.parse(await unknown.json()).error);
    expect(fetched).toEqual([]);
  });

  it.each([
    ["a video", { kind: "video" as const }],
    ["a file", { kind: "other" as const }],
  ])("says %s has no reader view without fetching it", async (_name, fields) => {
    const { app, fetched } = setup();
    const link = await saveFor(a, fields);

    expect(await view(await read(app, a, link.id))).toEqual({ status: "unavailable", url: link.originalUrl });
    expect(fetched).toEqual([]);
  });

  it.each([
    ["has no article", { url: CANONICAL, contentType: "text/html", html: NO_ARTICLE }, "no_article"],
    ["is not html", { url: CANONICAL, contentType: "application/pdf", html: null }, "not_html"],
    ["fails to load", new FetchError("timeout", "slow"), "timeout"],
  ])("says a page that %s is unavailable and remembers why", async (_name, page, reason) => {
    const { app } = setup(page);
    const link = await saveFor(a);

    expect(await view(await read(app, a, link.id))).toEqual({ status: "unavailable", url: link.originalUrl });
    expect(await db.select({ status: resourceReader.status, reason: resourceReader.reason }).from(resourceReader)).toEqual([
      { status: "unavailable", reason },
    ]);
  });

  it.each([
    ["runs past its time limit", () => Promise.reject(new ExtractError("extract_timeout")), "extract_timeout"],
    ["fails in the worker", () => Promise.reject(new ExtractError("extract_failed")), "extract_failed"],
    ["gives an article outside the contract", () => Promise.resolve({ title: "x", blocks: [{ type: "html", html: "<b>" }] }), "extract_invalid"],
  ])("says a page whose extraction %s is unavailable and remembers why", async (_name, extract, reason) => {
    const { app } = setup(undefined, extract);
    const link = await saveFor(a);

    expect(await view(await read(app, a, link.id))).toEqual({ status: "unavailable", url: link.originalUrl });
    expect(await db.select({ reason: resourceReader.reason }).from(resourceReader)).toEqual([{ reason }]);
  });

  it("asks the reader to wait, without storing anything, when extraction is busy", async () => {
    const { app } = setup(undefined, () => Promise.reject(new ExtractError("extract_busy")));
    const link = await saveFor(a);

    const res = await read(app, a, link.id);

    expect(res.status).toBe(429);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("RATE_LIMIT");
    expect(await db.$count(resourceReader)).toBe(0);
  });

  it("shares one fetch between readers of the same page at the same time", async () => {
    const { app, fetched } = setup();
    const linkA = await saveFor(a);
    const linkB = await saveFor(b);

    const [forA, forB] = await Promise.all([read(app, a, linkA.id), read(app, b, linkB.id)]);

    expect([(await view(forA)).status, (await view(forB)).status]).toEqual(["ok", "ok"]);
    expect(fetched).toHaveLength(1);
  });

  it("fetches an article again once its copy is a week old", async () => {
    const { app, fetched, clock } = setup();
    const link = await saveFor(a);
    await read(app, a, link.id);

    clock.at += 6 * DAY_MS;
    await read(app, a, link.id);
    expect(fetched).toHaveLength(1);
    clock.at += DAY_MS;
    await read(app, a, link.id);
    expect(fetched).toHaveLength(2);
  });

  it("tries an unavailable page again after a few hours", async () => {
    const { app, fetched, clock, serve } = setup(new FetchError("network", "down"));
    const link = await saveFor(a);
    await read(app, a, link.id);

    serve({ url: CANONICAL, contentType: "text/html", html: ARTICLE });
    clock.at += 60 * 60 * 1000;
    expect((await view(await read(app, a, link.id))).status).toBe("unavailable");
    clock.at += 6 * 60 * 60 * 1000;
    expect((await view(await read(app, a, link.id))).status).toBe("ok");
    expect(fetched).toHaveLength(2);
  });

  it("limits how many pages a user can fetch a minute, but not stored copies", async () => {
    const { app } = setup();
    const cached = await saveFor(a);
    await read(app, a, cached.id);
    const links = [];
    for (let i = 0; i < 10; i++) links.push(await saveFor(a, { canonicalUrl: `${CANONICAL}/${String(i)}` }, `https://x.example/${String(i)}`));

    const statuses = [];
    for (const link of links) statuses.push((await read(app, a, link.id)).status);
    const limited = await read(app, a, links[9]?.id ?? "");
    const again = await read(app, a, cached.id);

    expect(statuses).toEqual([...Array<number>(9).fill(200), 429]);
    expect(limited.headers.get("Retry-After")).not.toBeNull();
    expect(failureEnvelopeSchema.parse(await limited.json()).error.code).toBe("RATE_LIMIT");
    expect(again.status).toBe(200);
    expect((await read(app, b, (await saveFor(b, { canonicalUrl: "https://b.example/" }, "https://b.example/")).id)).status).toBe(200);
  });

  it("logs the fetch without the page's URL", async () => {
    const { app, lines } = setup();
    const link = await saveFor(a);

    await read(app, a, link.id);

    const log = lines.join("\n");
    expect(log).toContain("reader copy fetched");
    expect(log).not.toContain("token=");
    expect(log).not.toContain("blog.example.com");
  });
});
