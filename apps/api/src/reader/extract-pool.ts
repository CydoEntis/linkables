import { Worker } from "node:worker_threads";
import type { Logger } from "../log/logger";

export type ExtractRequest = { html: string; pageUrl: string };
// The article is checked against the contract by the caller, so it crosses as unknown.
export type ExtractReply = { ok: true; article: unknown } | { ok: false; message: string };

export type ExtractFailure = "extract_timeout" | "extract_failed" | "extract_busy";

export class ExtractError extends Error {
  constructor(readonly reason: ExtractFailure) {
    super(`page extraction failed: ${reason}`);
    this.name = new.target.name;
  }
}

export type ExtractPoolOptions = {
  size?: number;
  timeoutMs?: number;
  queueMax?: number;
  workerUrl?: URL;
  logger?: Logger;
};

type Job = { request: ExtractRequest; resolve: (article: unknown) => void; reject: (error: ExtractError) => void };

const DEFAULT_WORKER = new URL("./extract-worker-entry.js", import.meta.url);
// Bounds a hostile page's heap; the main process keeps its own.
const WORKER_HEAP_MB = 256;

// Extraction is synchronous CPU work that a crafted page can make take minutes,
// so it runs off the API's thread: at most `size` workers, a bounded queue, and
// a wall-clock limit after which the worker is killed and replaced.
export function createExtractPool({
  size = 2,
  timeoutMs = 5_000,
  queueMax = 16,
  workerUrl = DEFAULT_WORKER,
  logger,
}: ExtractPoolOptions = {}) {
  const idle: Worker[] = [];
  const queue: Job[] = [];
  const retired = new WeakSet<Worker>();
  let live = 0;

  function spawn(): Worker {
    live += 1;
    const worker = new Worker(workerUrl, { resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB } });
    // An 'error' with no listener would crash the API, and one can arrive while
    // the worker is idle, so every worker keeps this listener for its whole life.
    // Only the error's name is logged: its message can quote the page.
    worker.on("error", (error: unknown) => {
      logger?.error("extract worker failed", { error: error instanceof Error ? error.name : "unknown" });
      retire(worker);
    });
    worker.on("exit", () => { retire(worker); });
    // An idle worker must never keep the process alive at shutdown.
    worker.unref();
    return worker;
  }

  // Idempotent: a failed worker is retired by its error, its exit and its job.
  function retire(worker: Worker): void {
    if (retired.has(worker)) return;
    retired.add(worker);
    live -= 1;
    const at = idle.indexOf(worker);
    if (at !== -1) idle.splice(at, 1);
    void worker.terminate();
  }

  function pump(): void {
    while (queue.length > 0) {
      const worker = idle.pop() ?? (live < size ? spawn() : undefined);
      if (worker === undefined) return;
      const job = queue.shift();
      if (job === undefined) {
        idle.push(worker);
        return;
      }
      run(worker, job);
    }
  }

  function run(worker: Worker, job: Job): void {
    const finish = (settle: () => void, reusable: boolean) => {
      clearTimeout(timer);
      worker.off("message", onMessage).off("error", onFailure).off("exit", onFailure);
      if (reusable) idle.push(worker);
      else retire(worker);
      settle();
      pump();
    };
    const onMessage = (reply: ExtractReply) => {
      finish(() => { if (reply.ok) job.resolve(reply.article); else job.reject(new ExtractError("extract_failed")); }, true);
    };
    const onFailure = () => { finish(() => { job.reject(new ExtractError("extract_failed")); }, false); };
    const timer = setTimeout(() => { finish(() => { job.reject(new ExtractError("extract_timeout")); }, false); }, timeoutMs);
    worker.on("message", onMessage).on("error", onFailure).on("exit", onFailure);
    worker.postMessage(job.request);
  }

  function extract(html: string, pageUrl: string): Promise<unknown> {
    if (queue.length >= queueMax) return Promise.reject(new ExtractError("extract_busy"));
    return new Promise((resolve, reject) => {
      queue.push({ request: { html, pageUrl }, resolve, reject });
      pump();
    });
  }

  return { extract };
}
