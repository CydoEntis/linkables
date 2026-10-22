import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { job, resource } from "../db/schema";
import type { MetadataUpdate } from "./fetch-metadata";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// lease is locked_until as Postgres text: a JS Date drops the microseconds, so
// it could never be compared for equality with the stored value.
export type ClaimedJob = { id: number; resourceId: string; attempts: number; canonicalUrl: string; lease: string };

type ClaimRow = { id: string; resource_id: string; attempts: number; canonical_url: string; lease: string };

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
      returning id, resource_id, attempts, locked_until
    )
    select claimed.id, claimed.resource_id, claimed.attempts, claimed.locked_until::text as lease, resource.canonical_url
    from claimed join resource on resource.id = claimed.resource_id
  `);
  if (row === undefined) return null;
  return {
    id: Number(row.id),
    resourceId: row.resource_id,
    attempts: row.attempts,
    canonicalUrl: row.canonical_url,
    lease: row.lease,
  };
}

// Every write below matches the lease the claim took, so a worker whose lease
// expired and was re-claimed elsewhere cannot clear or delete the new holder's job.
function heldBy(claimed: ClaimedJob) {
  return and(eq(job.id, claimed.id), eq(job.lockedUntil, sql`${claimed.lease}::timestamptz`));
}

// A release is not an attempt, so it hands back the attempt the claim took.
export async function releaseJob(db: Db, claimed: ClaimedJob): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, attempts: sql`${job.attempts} - 1`, runAfter: sql`now() + interval '2 seconds'` })
    .where(heldBy(claimed));
}

export async function retryJob(db: Db, claimed: ClaimedJob, reason: string, delayMs: number): Promise<void> {
  await db
    .update(job)
    .set({ lockedUntil: null, lastError: reason, runAfter: sql`now() + make_interval(secs => ${delayMs / 1000})` })
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
      .set({ ...update, fetchStatus: "fetched", fetchError: null, fetchedAt: sql`now()` })
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
