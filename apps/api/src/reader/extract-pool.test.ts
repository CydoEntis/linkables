import { readFileSync } from "node:fs";
import { readerArticleSchema } from "@linkables/shared/reader";
import { describe, expect, it } from "vitest";
import { createExtractPool, ExtractError } from "./extract-pool";

const TEST_WORKER = new URL("./fixtures/test-worker.js", import.meta.url);

function testPool(options: { size?: number; timeoutMs?: number; queueMax?: number } = {}) {
  return createExtractPool({ workerUrl: TEST_WORKER, timeoutMs: 2_000, ...options });
}

describe("createExtractPool", () => {
  it("extracts an article in a worker thread", async () => {
    const html = readFileSync(new URL("./fixtures/article.html", import.meta.url), "utf8");

    const article = await createExtractPool().extract(html, "https://blog.example.com/posts/build-times");

    expect(readerArticleSchema.parse(article).title).toBe("How We Cut Build Times in Half");
  });

  it("kills a page that runs past the time limit, and the next page still runs", async () => {
    const pool = testPool({ size: 1 });
    const started = Date.now();

    await expect(pool.extract("hang", "")).rejects.toMatchObject({ reason: "extract_timeout" });
    expect(Date.now() - started).toBeLessThan(4_000);
    await expect(pool.extract("next", "")).resolves.toBe("next");
  });

  it.each(["throw", "crash"])("reports a worker that fails with %s as a failed extraction", async (html) => {
    const pool = testPool({ size: 1 });

    const failure = pool.extract(html, "");

    await expect(failure).rejects.toBeInstanceOf(ExtractError);
    await expect(failure).rejects.toMatchObject({ reason: "extract_failed" });
    await expect(pool.extract("after", "")).resolves.toBe("after");
  });

  it("queues pages past the pool size and refuses them past the queue limit", async () => {
    const pool = testPool({ size: 1, queueMax: 1 });

    const running = pool.extract("hang", "");
    const queued = pool.extract("queued", "");

    await expect(pool.extract("refused", "")).rejects.toMatchObject({ reason: "extract_busy" });
    await expect(running).rejects.toMatchObject({ reason: "extract_timeout" });
    await expect(queued).resolves.toBe("queued");
  });
});
