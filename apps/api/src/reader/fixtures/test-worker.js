// Stands in for extract-worker.ts so the pool's limits can be tested exactly.
import process from "node:process";
import { parentPort } from "node:worker_threads";

parentPort.on("message", ({ html }) => {
  if (html === "hang") for (;;);
  if (html === "crash") process.exit(1);
  parentPort.postMessage(html === "throw" ? { ok: false, message: "Error" } : { ok: true, article: html });
});
