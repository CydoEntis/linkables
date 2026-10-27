import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { databaseNow, job, resource } from "../db/schema";
import type { MetadataUpdate } from "./fetch-metadata";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type ClaimedJob = { id: number; resourceId: string; attempts: number; canonicalUrl: string; lease: string };

// One atomic update claims the next eligible job. A random lease distinguishes
// reclaims even when the clock has not advanced since the previous claim.
export async function claimJob(db: Db): Promise<ClaimedJob | null> {
  const lease = randomUUID();
  const [row] = await db.update(job).set({
    lockedUntil: sql`strftime('%Y-%m-%dT%H:%M:%f000Z', 'now', '+60 seconds')`,
    leaseToken: lease,
    attempts: sql`${job.attempts} + 1`,
  }).where(sql`${job.id} = (
    select id from job where run_after <= ${databaseNow}
      and (locked_until is null or locked_until < ${databaseNow}) order by id limit 1
  )`).returning({
    id: job.id, resourceId: job.resourceId, attempts: job.attempts,
    canonicalUrl: sql<string>`(select canonical_url from resource where resource.id = job.resource_id)`,
  });
  return row === undefined ? null : { ...row, lease };
}

// Every write below matches the lease the claim took, so a worker whose lease
// expired and was re-claimed elsewhere cannot clear or delete the new holder's job.
function heldBy(claimed: ClaimedJob) {
  return and(eq(job.id, claimed.id), eq(job.leaseToken, claimed.lease));
}

// A release is not an attempt, so it hands back the attempt the claim took.
export async function releaseJob(db: Db, claimed: ClaimedJob): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, leaseToken: null, attempts: sql`${job.attempts} - 1`, runAfter: sql`strftime('%Y-%m-%dT%H:%M:%f000Z', 'now', '+2 seconds')` })
    .where(heldBy(claimed));
}

export async function retryJob(db: Db, claimed: ClaimedJob, reason: string, delayMs: number): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, leaseToken: null, lastError: reason, runAfter: sql`strftime('%Y-%m-%dT%H:%M:%f000Z', 'now', ${String(delayMs / 1000) + ' seconds'})` })
    .where(heldBy(claimed));
}

async function finish(db: Db, claimed: ClaimedJob, write: (tx: Tx) => Promise<unknown>): Promise<void> {
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(job).where(heldBy(claimed)).returning({ id: job.id });
    if (deleted.length > 0) await write(tx);
  });
}

export function completeJob(db: Db, claimed: ClaimedJob, update: MetadataUpdate): Promise<void> {
  return finish(db, claimed, (tx) =>
    tx
      .update(resource)
      .set({ ...update, fetchStatus: "fetched", fetchError: null, fetchedAt: databaseNow })
      .where(eq(resource.id, claimed.resourceId)),
  );
}

export function failJob(db: Db, claimed: ClaimedJob, reason: string): Promise<void> {
  return finish(db, claimed, (tx) =>
    tx
      .update(resource)
      .set({ fetchStatus: "fetch_failed", fetchError: reason })
      .where(eq(resource.id, claimed.resourceId)),
  );
}
