import { successEnvelopeSchema } from "@linkables/shared/http";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { captureLogger, createTestApp } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { accessRequest } from "../db/schema";
import type { OwnerNotice } from "./notify-owner";

const { db, close } = connectTestDb();

afterAll(close);
beforeEach(() => truncateAll(db));

type App = ReturnType<typeof createTestApp>;

function post(app: App, body: unknown) {
  return app.request("/api/v1/access-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 Test" },
    body: JSON.stringify(body),
  });
}

// Everything but meta, which differs per request.
async function answer(res: Response) {
  const { ok, data } = successEnvelopeSchema(z.null()).parse(await res.json());
  return { status: res.status, ok, data };
}

const NOW = Date.parse("2026-10-24T12:00:00Z");

function notifier() {
  return vi.fn<(notice: OwnerNotice) => Promise<void>>().mockResolvedValue(undefined);
}

describe("POST /access-requests", () => {
  it("stores the request with the email in lower case", async () => {
    const res = await post(createTestApp({ db }), { email: " Sam@Example.com ", name: "Sam", useCase: "Recipes" });

    expect(res.status).toBe(200);
    expect(await db.select().from(accessRequest)).toEqual([
      expect.objectContaining({ email: "sam@example.com", name: "Sam", useCase: "Recipes", userAgent: "Mozilla/5.0 Test" }),
    ]);
  });

  it("stores blank optional answers as null", async () => {
    await post(createTestApp({ db }), { email: "sam@example.com", name: " ", useCase: "" });

    expect(await db.select().from(accessRequest)).toEqual([expect.objectContaining({ name: null, useCase: null })]);
  });

  it("answers a repeat exactly like the first request and keeps one row", async () => {
    const app = createTestApp({ db });
    const first = await post(app, { email: "sam@example.com" });

    const repeat = await post(app, { email: "SAM@example.com", name: "Sam again" });

    expect(await answer(repeat)).toEqual(await answer(first));
    expect(await db.select({ name: accessRequest.name }).from(accessRequest)).toEqual([{ name: null }]);
  });

  it("stores nothing when the honeypot is filled", async () => {
    await post(createTestApp({ db }), { email: "bot@example.com", website: "https://spam.example" });

    expect(await db.$count(accessRequest)).toBe(0);
  });

  it("tells the owner about a new request", async () => {
    const notifyOwner = notifier();

    await post(createTestApp({ db, notifyOwner, now: () => NOW }), { email: "sam@example.com", name: "Sam", useCase: "Recipes" });

    expect(notifyOwner).toHaveBeenCalledWith({ email: "sam@example.com", name: "Sam", useCase: "Recipes", at: new Date(NOW) });
  });

  it("does not tell the owner twice about a repeat", async () => {
    const notifyOwner = notifier();
    const app = createTestApp({ db, notifyOwner });

    await post(app, { email: "sam@example.com" });
    await post(app, { email: "sam@example.com" });

    expect(notifyOwner).toHaveBeenCalledTimes(1);
  });

  it("answers without waiting for the owner's email", async () => {
    const notifyOwner = vi.fn(() => new Promise<void>(() => undefined));

    const res = await post(createTestApp({ db, notifyOwner }), { email: "sam@example.com" });

    expect(res.status).toBe(200);
  });

  it("still succeeds when the owner's email fails, without logging the requester's address", async () => {
    const { logger, lines } = captureLogger();
    const notifyOwner = vi.fn(() => Promise.reject(new Error("Resend answered 500")));

    const res = await post(createTestApp({ db, logger, notifyOwner }), { email: "sam@example.com" });
    await vi.waitFor(() => { expect(lines.join("\n")).toContain("owner notification failed"); });

    expect(res.status).toBe(200);
    expect(lines.join("\n")).not.toContain("sam@example.com");
  });
});
