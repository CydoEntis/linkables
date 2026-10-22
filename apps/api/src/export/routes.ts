import { Hono } from "hono";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { buildExport } from "./export";

export function exportRoutes({ db, now }: { db: Db; now: () => number }) {
  return new Hono<AuthEnv>().get("/export", async (c) => {
    return ok(c, await buildExport(db, c.get("userId"), new Date(now())));
  });
}
