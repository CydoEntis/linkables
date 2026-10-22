import { readFileSync } from "node:fs";
import { eq, sql, type SQL } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureLogger, createTestApp, testUsers } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { job, resource } from "../db/schema";
import type { Fetchers } from "./fetch-metadata";
import { FetchError, type HtmlPage } from "./fetcher";
import { startWorker, type Worker, type WorkerDeps } from "./worker";

const { db, close } = connectTestDb();
const { a } = await testUsers();
const articleHtml = readFileSync(new URL("./fixtures/article.html", import.meta.url), "utf8");

let workers: Worker[] = [];
let releaseHangs: (() => void)[] = [];

afterAll(close);
beforeEach(() => truncateAll(db));
afterEach(async () => {
  for (const release of releaseHangs) release();
  await Promise.all(workers.map((worker) => worker.stop()));
  workers = [];
  releaseHangs = [];
});

function start(fetchers: Partial<Fetchers>, options: Partial<WorkerDeps> = {}): Worker {
  const worker = startWorker({
    db,
    fetchers: { fetchHtml: articlePage, fetchJson: () => Promise.reject(new Error("unexpected")), ...fetchers },
    logger: captureLogger().logger,
    pollMs: 20,
    ...options,
  });
  workers.push(worker);
  return worker;
}

function articlePage(url: string): Promise<HtmlPage> {
  return Promise.resolve({ url, contentType: "text/html", html: articleHtml });
}

// Every hang is released after the test so stop() can wait for in-flight jobs.
function hangingFetch() {
  const calls: string[] = [];
  const { promise: gate, resolve: release } = Promise.withResolvers<undefined>();
  releaseHangs.push(() => {
    release(undefined);
  });
  const fetchHtml = async (url: string) => {
    calls.push(url);
    await gate;
    return articlePage(url);
  };
  return {
    calls,
    fetchHtml,
    release: () => {
      release(undefined);
    },
  };
}

async function queue(canonicalUrl: string, jobValues: { attempts?: number; lockedUntil?: SQL } = {}) {
  const [res] = await db.insert(resource).values({ canonicalUrl }).returning();
  if (!res) throw new Error("resource insert returned nothing");
  const [queued] = await db
    .insert(job)
    .values({ resourceId: res.id, ...jobValues })
    .returning();
  if (!queued) throw new Error("job insert returned nothing");
  return { resourceId: res.id, jobId: queued.id };
}

async function resourceRow(id: string) {
  const [row] = await db.select().from(resource).where(eq(resource.id, id));
  return row;
}

async function jobRow(id: number) {
  const [row] = await db
    .select({
      attempts: job.attempts,
      lockedUntil: job.lockedUntil,
      lastError: job.lastError,
      runAfterSecondsAway: sql<number>`extract(epoch from ${job.runAfter} - now())::float8`,
    })
    .from(job)
    .where(eq(job.id, id));
  return row;
}

function makeDue(jobId: number) {
  return db
    .update(job)
    .set({ runAfter: sql`now() - interval '1 second'` })
    .where(eq(job.id, jobId));
}

describe("metadata worker", () => {
  it("writes a page's metadata and deletes its job within 10 s", async () => {
    const { resourceId, jobId } = await queue("https://blog.example.com/posts/build-times");

    start({});

    await vi.waitFor(
      async () => {
        expect(await resourceRow(resourceId)).toMatchObject({
          title: "How We Cut Build Times in Half",
          finalUrl: "https://blog.example.com/posts/build-times",
          relCanonicalUrl: "https://blog.example.com/posts/build-times",
          contentType: "text/html",
          kind: "page",
          fetchStatus: "fetched",
          fetchedAt: expect.any(Date) as Date,
        });
      },
      { timeout: 10_000, interval: 50 },
    );
    expect(await jobRow(jobId)).toBeUndefined();
  });

  it("re-runs a job whose lease was abandoned mid-run", async () => {
    const { resourceId } = await queue("https://example.com/abandoned", {
      attempts: 1,
      lockedUntil: sql`now() - interval '1 second'`,
    });
    const fetchHtml = vi.fn(articlePage);

    start({ fetchHtml });

    await vi.waitFor(async () => { expect((await resourceRow(resourceId))?.fetchStatus).toBe("fetched"); }, { timeout: 5_000 });
    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });

  it("leaves a job alone while its lease is still held", async () => {
    const { jobId } = await queue("https://example.com/leased", { attempts: 1, lockedUntil: sql`now() + interval '1 minute'` });
    const fetchHtml = vi.fn(articlePage);

    start({ fetchHtml });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(fetchHtml).not.toHaveBeenCalled();
    expect((await jobRow(jobId))?.attempts).toBe(1);
  });

  it("never runs one job twice across two loops", async () => {
    const urls = Array.from({ length: 24 }, (_, i) => `https://host${String(i)}.example.com/page`);
    for (const url of urls) await queue(url);
    const calls: string[] = [];
    const fetchHtml = async (url: string) => {
      calls.push(url);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return articlePage(url);
    };

    start({ fetchHtml });
    start({ fetchHtml });

    await vi.waitFor(async () => { expect(await db.$count(job)).toBe(0); }, { timeout: 10_000 });
    expect(calls.toSorted()).toEqual(urls.toSorted());
  });

  it("marks the resource fetch_failed and deletes the job after 3 failed attempts", async () => {
    const { resourceId, jobId } = await queue("https://example.com/down");
    const fetchHtml = vi.fn(() => Promise.reject(new FetchError("timeout", "no complete response")));

    start({ fetchHtml });

    for (const attempt of [1, 2]) {
      await vi.waitFor(async () => { expect((await jobRow(jobId))?.lastError).toBe("timeout"); }, { timeout: 5_000 });
      const row = await jobRow(jobId);
      expect(row).toMatchObject({ attempts: attempt, lockedUntil: null });
      expect(row?.runAfterSecondsAway).toBeGreaterThan(attempt === 1 ? 25 : 115);
      await db.update(job).set({ lastError: null }).where(eq(job.id, jobId));
      await makeDue(jobId);
    }

    await vi.waitFor(async () => { expect(await jobRow(jobId)).toBeUndefined(); }, { timeout: 5_000 });
    expect(await resourceRow(resourceId)).toMatchObject({ fetchStatus: "fetch_failed", fetchError: "timeout" });
    expect(fetchHtml).toHaveBeenCalledTimes(3);
  });

  it("fails a job whose lease expired on every attempt without fetching it again", async () => {
    const { resourceId, jobId } = await queue("https://example.com/crashy", {
      attempts: 3,
      lockedUntil: sql`now() - interval '1 second'`,
    });
    const fetchHtml = vi.fn(articlePage);

    start({ fetchHtml });

    await vi.waitFor(async () => { expect(await jobRow(jobId)).toBeUndefined(); }, { timeout: 5_000 });
    expect(await resourceRow(resourceId)).toMatchObject({ fetchStatus: "fetch_failed", fetchError: "abandoned" });
    expect(fetchHtml).not.toHaveBeenCalled();
  });

  it("leaves a job leased and logs an error when the fetch throws unexpectedly", async () => {
    const { jobId } = await queue("https://example.com/bug");
    const { logger, lines } = captureLogger();

    start({ fetchHtml: () => Promise.reject(new TypeError("bug")) }, { logger });

    await vi.waitFor(() => {
      expect(lines.some((line) => line.includes("metadata job crashed"))).toBe(true);
    });
    const [row] = await db
      .select({ attempts: job.attempts, held: sql<boolean>`${job.lockedUntil} > now()` })
      .from(job)
      .where(eq(job.id, jobId));
    expect(row).toEqual({ attempts: 1, held: true });
  });

  it("counts a non-2xx oEmbed reply as a failed attempt", async () => {
    const { resourceId, jobId } = await queue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const fetchJson = vi.fn(() => Promise.reject(new FetchError("http_status", "unexpected status 401")));

    start({ fetchJson });

    await vi.waitFor(async () => { expect((await jobRow(jobId))?.lastError).toBe("http_status"); }, { timeout: 5_000 });
    expect((await jobRow(jobId))?.attempts).toBe(1);
    expect((await resourceRow(resourceId))?.fetchStatus).toBe("pending");
  });

  it("stores a YouTube video's oEmbed title as kind video", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const { resourceId } = await queue(url);

    start({ fetchJson: () => Promise.resolve({ title: "Never Gonna Give You Up", author_name: "Rick Astley" }) });

    await vi.waitFor(
      async () => { expect(await resourceRow(resourceId)).toMatchObject({
          title: "Never Gonna Give You Up",
          author: "Rick Astley",
          kind: "video",
          finalUrl: url,
          contentType: null,
          fetchStatus: "fetched",
        }); },
      { timeout: 5_000 },
    );
  });

  it("releases a job whose host already has a fetch running", async () => {
    const first = await queue("https://busy.example.com/one");
    const second = await queue("https://busy.example.com/two");
    const hang = hangingFetch();

    start({ fetchHtml: hang.fetchHtml });

    await vi.waitFor(async () => {
      const row = await jobRow(second.jobId);
      expect(row).toMatchObject({ attempts: 0, lockedUntil: null });
      expect(row?.runAfterSecondsAway).toBeGreaterThan(0);
    });
    expect(hang.calls).toEqual(["https://busy.example.com/one"]);

    hang.release();
    await makeDue(second.jobId);
    await vi.waitFor(async () => { expect(await db.$count(job)).toBe(0); }, { timeout: 5_000 });
    expect(hang.calls).toEqual(["https://busy.example.com/one", "https://busy.example.com/two"]);
    expect((await resourceRow(first.resourceId))?.fetchStatus).toBe("fetched");
  });

  it("counts YouTube videos on any YouTube host against the one oEmbed host", async () => {
    await queue("https://www.youtube.com/watch?v=aaaaaaaaaaa");
    const mobile = await queue("https://m.youtube.com/watch?v=bbbbbbbbbbb");
    const hang = hangingFetch();
    const oEmbedCalls: string[] = [];
    const fetchJson = async (url: string) => {
      oEmbedCalls.push(url);
      await hang.fetchHtml(url);
      return { title: "video" };
    };

    start({ fetchJson });

    await vi.waitFor(async () => {
      expect((await jobRow(mobile.jobId))?.runAfterSecondsAway).toBeGreaterThan(0);
    });
    expect(oEmbedCalls).toHaveLength(1);
  });

  it("runs at most 4 fetches at once", async () => {
    for (let i = 0; i < 6; i++) await queue(`https://host${String(i)}.example.com/page`);
    const hang = hangingFetch();

    start({ fetchHtml: hang.fetchHtml });

    await vi.waitFor(() => { expect(hang.calls).toHaveLength(4); });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(hang.calls).toHaveLength(4);
  });

  it("does not slow down saving while fetches hang", async () => {
    await queue("https://slow.example.com/page");
    const hang = hangingFetch();
    start({ fetchHtml: hang.fetchHtml });
    await vi.waitFor(() => { expect(hang.calls).toHaveLength(1); });

    const startedAt = performance.now();
    const res = await createTestApp({ db }).request("/api/v1/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...a.headers },
      body: JSON.stringify({ url: "https://example.com/new" }),
    });

    expect(res.status).toBe(201);
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
