import { collectionRequestSchema } from "@linkables/shared/collections";
import { HTTP_STATUS } from "@linkables/shared/http";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { parseWith } from "../http/validate";
import { createCollection, deleteCollection, listCollections, renameCollection } from "./collections";
import { addToCollection, removeFromCollection, type Membership } from "./membership";

const collectionParams = validator("param", parseWith(z.object({ id: z.uuid() }), "Invalid path"));
const membershipParams = validator(
  "param",
  parseWith(z.object({ id: z.uuid(), linkId: z.uuid() }), "Invalid path"),
);
const nameBody = validator("json", parseWith(collectionRequestSchema, "Invalid request body"));

function membership(userId: string, { id, linkId }: { id: string; linkId: string }): Membership {
  return { userId, collectionId: id, linkId };
}

export function collectionRoutes({ db }: { db: Db }) {
  return new Hono<AuthEnv>()
    .get("/collections", async (c) => ok(c, await listCollections(db, c.get("userId"))))
    .post("/collections", nameBody, async (c) => {
      const created = await createCollection(db, c.get("userId"), c.req.valid("json").name);
      return ok(c, created, HTTP_STATUS.CREATED);
    })
    .patch("/collections/:id", collectionParams, nameBody, async (c) => {
      const owned = { userId: c.get("userId"), id: c.req.valid("param").id };
      return ok(c, await renameCollection(db, owned, c.req.valid("json").name));
    })
    .delete("/collections/:id", collectionParams, async (c) => {
      await deleteCollection(db, { userId: c.get("userId"), id: c.req.valid("param").id });
      return ok(c, null);
    })
    .put("/collections/:id/links/:linkId", membershipParams, async (c) => {
      await addToCollection(db, membership(c.get("userId"), c.req.valid("param")));
      return ok(c, null);
    })
    .delete("/collections/:id/links/:linkId", membershipParams, async (c) => {
      await removeFromCollection(db, membership(c.get("userId"), c.req.valid("param")));
      return ok(c, null);
    });
}
