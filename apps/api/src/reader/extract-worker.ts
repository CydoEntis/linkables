import { parentPort } from "node:worker_threads";
import { extractArticle } from "./extract-article";
import type { ExtractReply, ExtractRequest } from "./extract-pool";

// One page at a time; the pool kills this thread if a page takes too long.
// Any error is reported as a failed extraction, never left to crash the thread.
parentPort?.on("message", ({ html, pageUrl }: ExtractRequest) => {
  let reply: ExtractReply;
  try {
    reply = { ok: true, article: extractArticle(html, pageUrl) };
  } catch (error) {
    reply = { ok: false, message: error instanceof Error ? error.name : "unknown" };
  }
  parentPort?.postMessage(reply);
});
