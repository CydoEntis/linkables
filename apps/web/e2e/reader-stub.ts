import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { ReaderView } from "@linkables/shared/reader";
import { API_URL, WEB_URL } from "./env";

// Answers the link page's reader request, so a test never sends the e2e API out
// to a real site for an article. The CORS preflight still goes to the API; the
// answer carries the header the browser checks on the real request.
export function stubReader(page: Page, view: ReaderView) {
  return page.route(`${API_URL}/api/v1/links/*/reader`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      headers: { "access-control-allow-origin": WEB_URL },
      json: { ok: true, data: view, meta: { requestId: randomUUID(), ms: 1, version: "v1" } },
    });
  });
}
