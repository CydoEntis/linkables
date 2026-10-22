import { Hono } from "hono";
import { ok } from "../http/envelope";
import type { AuthEnv } from "./require-auth";

export const me = new Hono<AuthEnv>().get("/me", (c) => ok(c, { id: c.get("userId") }));
