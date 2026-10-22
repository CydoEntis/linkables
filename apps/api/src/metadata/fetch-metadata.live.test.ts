import { describe, expect, it } from "vitest";
import { fetchMetadata } from "./fetch-metadata";
import { fetchHtml, fetchJson } from "./fetcher";

// Hits the real YouTube oEmbed endpoint, so it runs only on request.
describe.skipIf(process.env.LIVE_TESTS !== "1")("fetchMetadata (live)", () => {
  it("reads a real YouTube video's title through oEmbed", async () => {
    const outcome = await fetchMetadata("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { fetchHtml, fetchJson });

    expect(outcome.ok && outcome.update.title).toBeTruthy();
  }, 15_000);
});
