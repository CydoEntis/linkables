import type { Db } from "../db/client";
import type { Logger } from "../log/logger";
import { fetchHost, fetchMetadata, type Fetchers } from "./fetch-metadata";
import { claimJob, completeJob, failJob, releaseJob, retryJob, type ClaimedJob } from "./jobs";

const POLL_MS = 1_000;
const CONCURRENCY = 4;
// One entry per retry, so the schedule's length sets the attempt count:
// two delays give 3 attempts in total.
const BACKOFF_MS = [30_000, 120_000];

export type WorkerDeps = {
  db: Db;
  fetchers: Fetchers;
  logger: Logger;
  pollMs?: number;
  concurrency?: number;
  backoffMs?: readonly number[];
};

export type Worker = { stop: () => Promise<void> };

export function startWorker({
  db,
  fetchers,
  logger,
  pollMs = POLL_MS,
  concurrency = CONCURRENCY,
  backoffMs = BACKOFF_MS,
}: WorkerDeps): Worker {
  const maxAttempts = backoffMs.length + 1;
  const running = new Map<number, Promise<void>>();
  // shortcut: the 1-per-host cap is per process and relies on running a single
  // worker process (ADR-0005). A cross-process cap needs host awareness in the claim.
  const busyHosts = new Set<string>();
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let pass: Promise<void> | null = null;
  let again = false;

  async function runJob(claimed: ClaimedJob): Promise<void> {
    // Each claim counts an attempt, so a job past the limit had its lease
    // expire mid-run every time (the process died); stop retrying it.
    if (claimed.attempts > maxAttempts) {
      await failJob(db, claimed, "abandoned");
      return;
    }
    const outcome = await fetchMetadata(claimed.canonicalUrl, fetchers);
    if (outcome.ok) {
      await completeJob(db, claimed, outcome.update);
      logger.info("metadata fetched", { jobId: claimed.id, resourceId: claimed.resourceId });
      return;
    }
    const delayMs = backoffMs[claimed.attempts - 1];
    if (delayMs === undefined) await failJob(db, claimed, outcome.reason);
    else await retryJob(db, claimed, outcome.reason, delayMs);
    logger.warn("metadata fetch failed", { jobId: claimed.id, attempt: claimed.attempts, reason: outcome.reason });
  }

  async function dispatch(claimed: ClaimedJob): Promise<void> {
    const host = fetchHost(claimed.canonicalUrl);
    if (busyHosts.has(host)) {
      await releaseJob(db, claimed);
      return;
    }
    busyHosts.add(host);
    const run = runJob(claimed)
      // A failure here leaves the job leased; it is retried once the lease expires.
      .catch((error: unknown) => {
        logger.error("metadata job crashed", { jobId: claimed.id, error });
      })
      .finally(() => {
        busyHosts.delete(host);
        running.delete(claimed.id);
        poll();
      });
    running.set(claimed.id, run);
  }

  async function fill(): Promise<void> {
    while (!stopped && running.size < concurrency) {
      const claimed = await claimJob(db);
      if (claimed === null) return;
      await dispatch(claimed);
    }
  }

  function poll(): void {
    if (stopped) return;
    if (pass !== null) {
      again = true;
      return;
    }
    clearTimeout(timer);
    pass = fill()
      .catch((error: unknown) => {
        logger.error("metadata worker poll failed", { error });
      })
      .finally(() => {
        pass = null;
        if (again) {
          again = false;
          poll();
        } else if (!stopped) {
          timer = setTimeout(poll, pollMs);
        }
      });
  }

  poll();

  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await pass;
      await Promise.all(running.values());
    },
  };
}
