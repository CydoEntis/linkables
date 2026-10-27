// Stands in for extract-worker.ts so the pool's limits can be tested exactly.
import process from "node:process";
import { setTimeout } from "node:timers";
import { parentPort } from "node:worker_threads";

parentPort.on("message", ({ html }) => {
  if (html === "hang") for (;;);
  if (html === "crash") process.exit(1);
  // Answers, then fails while the pool holds it idle.
  if (html === "fail-later") setTimeout(() => { throw new Error("late failure"); }, 20);
  parentPort.postMessage(html === "throw" ? { ok: false, message: "Error" } : { ok: true, article: html });
});
