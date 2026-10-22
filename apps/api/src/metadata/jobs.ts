import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { job, resource } from "../db/schema";
import type { MetadataUpdate } from "./fetch-metadata";

export type ClaimedJob = { id: number; resourceId: string; attempts: number; canonicalUrl: string };

type ClaimRow = { id: string; resource_id: string; attempts: number; canonical_url: string };

// One statement in its own implicit transaction with no session state, so it
// works through Supabase's transaction pooler. The row lock lasts only for the
// statement; the 60 s locked_until lease is what keeps other loops off the job.
export async function claimJob(db: Db): Promise<ClaimedJob | null> {
  const [row] = await db.execute<ClaimRow>(sql`
    with claimed as (
      update job set locked_until = now() + interval '60 seconds', attempts = attempts + 1
      where id = (
        select id from job
        where run_after <= now() and (locked_until is null or locked_until < now())
        order by id
        for update skip locked
        limit 1
      )
      returning id, resource_id, attempts
    )
    select claimed.id, claimed.resource_id, claimed.attempts, resource.canonical_url
    from claimed join resource on resource.id = claimed.resource_id
  `);
  if (row === undefined) return null;
  return { id: Number(row.id), resourceId: row.resource_id, attempts: row.attempts, canonicalUrl: row.canonical_url };
}

// A release is not an attempt, so it hands back the attempt the claim took.
export async function releaseJob(db: Db, jobId: number): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, attempts: sql`${job.attempts} - 1`, runAfter: sql`now() + interval '2 seconds'` })
    .where(eq(job.id, jobId));
}

export async function retryJob(db: Db, jobId: number, reason: string, delayMs: number): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, lastError: reason, runAfter: sql`now() + make_interval(secs => ${delayMs / 1000})` })
    .where(eq(job.id, jobId));
}

export async function completeJob(db: Db, claimed: ClaimedJob, update: MetadataUpdate): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(resource)
      .set({ ...update, fetchStatus: "fetched", fetchError: null, fetchedAt: sql`now()` })
      .where(eq(resource.id, claimed.resourceId));
    await tx.delete(job).where(eq(job.id, claimed.id));
  });
}

export async function failJob(db: Db, claimed: ClaimedJob, reason: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(resource)
      .set({ fetchStatus: "fetch_failed", fetchError: reason })
      .where(eq(resource.id, claimed.resourceId));
    await tx.delete(job).where(eq(job.id, claimed.id));
  });
}
