import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, truncateAll } from "../../test/db";
import { job, resource } from "../db/schema";
import { claimJob, completeJob, failJob, releaseJob, retryJob, type ClaimedJob } from "./jobs";

const { db, close } = connectTestDb();

afterAll(close);
beforeEach(() => truncateAll(db));

const UPDATE = {
  title: "stale",
  description: null,
  author: null,
  faviconUrl: null,
  thumbnailUrl: null,
  relCanonicalUrl: null,
  finalUrl: null,
  contentType: null,
  kind: "page",
} as const;

async function claimedTwice(): Promise<{ stale: ClaimedJob; current: ClaimedJob }> {
  const [res] = await db.insert(resource).values({ canonicalUrl: "https://example.com/page" }).returning();
  if (!res) throw new Error("resource insert returned nothing");
  await db.insert(job).values({ resourceId: res.id });
  const stale = await claimJob(db);
  await db.update(job).set({ lockedUntil: sql`strftime('%Y-%m-%dT%H:%M:%f000Z', 'now', '-1 second')` });
  const current = await claimJob(db);
  if (!stale || !current) throw new Error("claim returned nothing");
  return { stale, current };
}

async function state(claimed: ClaimedJob) {
  const [jobRow] = await db
    .select({ attempts: job.attempts, lastError: job.lastError, held: sql<boolean>`${job.lockedUntil} > strftime('%Y-%m-%dT%H:%M:%f000Z', 'now')`.mapWith(Boolean) })
    .from(job)
    .where(eq(job.id, claimed.id));
  const [resourceRow] = await db
    .select({ fetchStatus: resource.fetchStatus, title: resource.title })
    .from(resource)
    .where(eq(resource.id, claimed.resourceId));
  return { job: jobRow, resource: resourceRow };
}

const expectedUntouched = {
  job: { attempts: 2, lastError: null, held: true },
  resource: { fetchStatus: "pending", title: null },
};

describe("job writes from a worker whose lease was taken over", () => {
  it("complete is a no-op", async () => {
    const { stale, current } = await claimedTwice();

    await completeJob(db, stale, UPDATE);

    expect(await state(current)).toEqual(expectedUntouched);
  });

  it("fail is a no-op", async () => {
    const { stale, current } = await claimedTwice();

    await failJob(db, stale, "timeout");

    expect(await state(current)).toEqual(expectedUntouched);
  });

  it("retry is a no-op", async () => {
    const { stale, current } = await claimedTwice();

    await retryJob(db, stale, "timeout", 30_000);

    expect(await state(current)).toEqual(expectedUntouched);
  });

  it("release is a no-op", async () => {
    const { stale, current } = await claimedTwice();

    await releaseJob(db, stale);

    expect(await state(current)).toEqual(expectedUntouched);
  });

  it("complete with the current lease writes the resource and deletes the job", async () => {
    const { current } = await claimedTwice();

    await completeJob(db, current, UPDATE);

    expect(await state(current)).toEqual({ job: undefined, resource: { fetchStatus: "fetched", title: "stale" } });
  });
});
